"""Explicit real-provider checks; no production DB writes or raw secrets in output.

Run from backend with --output and optionally --voice. Synthetic TTS->ASR fixtures
verify transport only, not human speech recognition quality or language acceptance.
"""
import argparse
import audioop
import base64
import io
import json
import logging
import os
from pathlib import Path
import sys
import time
import wave
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
load_dotenv(Path(__file__).resolve().parents[1]/".env")
logging.disable(logging.CRITICAL)

def timed(fn):
    start=time.monotonic()
    try: return fn(), round((time.monotonic()-start)*1000)
    except Exception as exc: return {"error_type":type(exc).__name__}, round((time.monotonic()-start)*1000)

def pcm16(audio):
    with wave.open(io.BytesIO(audio)) as source:
        data=source.readframes(source.getnframes());rate=source.getframerate()
        if source.getsampwidth()!=2: data=audioop.lin2lin(data,source.getsampwidth(),2)
        if source.getnchannels()==2:data=audioop.tomono(data,2,.5,.5)
        elif source.getnchannels()!=1:raise ValueError("Unsupported channels")
        if rate!=16000:data,_=audioop.ratecv(data,2,1,rate,16000,None)
    output=io.BytesIO()
    with wave.open(output,"wb") as target:
        target.setnchannels(1);target.setsampwidth(2);target.setframerate(16000);target.writeframes(data)
    return output.getvalue()

def run():
    parser=argparse.ArgumentParser();parser.add_argument("--output",required=True,type=Path);parser.add_argument("--voice",action="store_true");args=parser.parse_args()
    report={"checked_at":datetime.now(timezone.utc).isoformat(),"scope":"Real providers; public reference coordinates and synthetic speech fixtures; no production mutation","locations":{},"voice":[]}
    from app.services.earth_observation import earth_observation_service
    from app.services.species import species_service
    for label,lat,lon in [("Mumbai offshore",18.9,72.7),("Paradip coast",20.26,86.67)]:
        earth,ms=timed(lambda:earth_observation_service.get(lat,lon));obis,obs_ms=timed(lambda:species_service.get(lat,lon))
        report["locations"][label]={"earth":earth,"earth_ms":ms,"obis":obis,"obis_ms":obs_ms}
        print(label,earth.get("status"),obis.get("status"),flush=True)
    if args.voice:
        from app.services.language.bhashini_provider import BhashiniLanguageProvider
        provider=BhashiniLanguageProvider(timeout_sec=12)
        samples={"en":"What are the sea conditions today?","hi":"आज समुद्र की स्थिति कैसी है?","gu":"આજે દરિયાની સ્થિતિ કેવી છે?","mr":"आज समुद्राची स्थिती कशी आहे?","bn":"আজ সমুদ্রের অবস্থা কেমন?","ta":"இன்று கடலின் நிலை எப்படி உள்ளது?","te":"ఈరోజు సముద్ర పరిస్థితి ఎలా ఉంది?","ml":"ഇന്ന് കടലിന്റെ അവസ്ഥ എന്താണ്?","kn":"ಇಂದು ಸಮುದ್ರದ ಸ್ಥಿತಿ ಹೇಗಿದೆ?","or":"ଆଜି ସମୁଦ୍ରର ଅବସ୍ଥା କିପରି ଅଛି?","pa":"ਅੱਜ ਸਮੁੰਦਰ ਦੀ ਸਥਿਤੀ ਕਿਹੋ ਜਿਹੀ ਹੈ?"}
        for lang,text in samples.items():
            row={"language":lang,"human_noisy_long_code_switch":"NOT_RUN","acceptance":"PENDING_NATIVE_SPEAKER_AND_DEVICE_REVIEW"}
            row["detected_language"],row["detection_ms"]=timed(lambda:provider.detect_language(text))
            if lang=="en":row["translation"]={"status":"not_required"}
            else:
                def translation():
                    config=provider._get_pipeline_config("translation",lang,"en")
                    if not config:return {"status":"unavailable"}
                    with httpx.Client(timeout=24) as client:
                        response=client.post(config["callback_url"],headers={config["auth_name"]:config["auth_value"]},json={"pipelineTasks":[{"taskType":"translation","config":{"language":{"sourceLanguage":lang,"targetLanguage":"en"},"serviceId":config["service_id"]}}],"inputData":{"input":[{"source":text}]}})
                    result={"http_status":response.status_code,"provider":"bhashini","service_id":config["service_id"]}
                    if response.status_code==200:
                        outputs=response.json().get("pipelineResponse",[])
                        result["has_translation"]=bool(outputs and outputs[0].get("output",[{}])[0].get("target"))
                    return result
                row["translation"],row["translation_ms"]=timed(translation)
            voice,row["tts_ms"]=timed(lambda:provider.text_to_speech(text,lang))
            row["tts"]={"source":voice.get("source"),"is_mock":voice.get("is_mock"),"audio_present":bool(voice.get("audio_base64")),"error_type":voice.get("error_type")}
            if voice.get("audio_base64") and voice.get("is_mock") is False:
                try:
                    audio=pcm16(base64.b64decode(voice["audio_base64"],validate=True))
                    result,row["stt_ms"]=timed(lambda:provider.speech_to_text(audio,language_code=lang))
                    row["stt"]={"source":result.get("source"),"is_mock":result.get("is_mock"),"transcript_present":bool(result.get("transcript")),"upstream_status":result.get("upstream_status"),"fixture":"BHASHINI synthesized speech converted to mono 16kHz PCM16 WAV"}
                except Exception as exc:row["stt"]={"status":"fixture_error","error_type":type(exc).__name__}
            else:row["stt"]={"status":"blocked_by_tts"}
            report["voice"].append(row)
            args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False))
            print(lang,row["tts"]["source"],row["stt"].get("source",row["stt"].get("status")),flush=True)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False))

if __name__=="__main__":run()
