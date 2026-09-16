import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
import { VoiceControls } from '@/components/orca/VoiceControls';
vi.mock('@/lib/orca/voice-audio',()=>({speechWav:vi.fn(async(audio:Blob)=>audio)}));
vi.mock('@/services/api',()=>({transcribeVoiceAudio:vi.fn(),synthesizeVoiceAudio:vi.fn()}));
import { transcribeVoiceAudio,synthesizeVoiceAudio } from '@/services/api';
const stop=vi.fn();const getUserMedia=vi.fn();
class Recorder {
 static isTypeSupported(){return true;}
 state='inactive';mimeType='audio/webm';ondataavailable:any;onstop:any;
 start(){this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['test audio'])});void this.onstop?.();}
}
beforeEach(()=>{
 Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});
 getUserMedia.mockResolvedValue({getTracks:()=>[{stop}]});Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
 vi.stubGlobal('MediaRecorder',Recorder);
 vi.mocked(transcribeVoiceAudio).mockResolvedValue({transcript:'What about tomorrow?',language:'en',english_transcript:'What about tomorrow?',is_mock:false,source:'test'});
 vi.mocked(synthesizeVoiceAudio).mockResolvedValue({audio_base64:'test-audio',audio_format:'wav',speaker:'female',source:'test'});
});
afterEach(()=>vi.unstubAllGlobals());
it('sends a voice turn through the supplied chat pipeline, plays the answer and listens again',async()=>{
 let audio:any;
 vi.stubGlobal('Audio',class{onended:any;onerror:any;pause=vi.fn();play=vi.fn().mockResolvedValue(undefined);constructor(){audio=this;}});
 const ask=vi.fn().mockResolvedValue({text:'The available evidence is incomplete.',language:'en'});
 render(<I18nProvider><VoiceControls disabled={false} onBusy={()=>{}} onTranscript={vi.fn()} onAsk={ask}/></I18nProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Voice conversation'}));
 fireEvent.click(await screen.findByRole('button',{name:'Done Speaking'}));
 await waitFor(()=>expect(ask).toHaveBeenCalledExactlyOnceWith('What about tomorrow?'));
 await waitFor(()=>expect(audio?.play).toHaveBeenCalled());
 expect(getUserMedia).toHaveBeenCalledTimes(1);
 await act(async()=>audio.onended());
 await waitFor(()=>expect(getUserMedia).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByRole('button',{name:'End conversation'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(stop).toHaveBeenCalled();
});
it('ending during transcription prevents later auto-send and playback',async()=>{
 let resolve:any;vi.mocked(transcribeVoiceAudio).mockReturnValue(new Promise(r=>resolve=r));
 const ask=vi.fn();render(<I18nProvider><VoiceControls disabled={false} onBusy={()=>{}} onTranscript={vi.fn()} onAsk={ask}/></I18nProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Voice conversation'}));fireEvent.click(await screen.findByRole('button',{name:'Done Speaking'}));
 await waitFor(()=>expect(transcribeVoiceAudio).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'End conversation'}));
 await act(async()=>resolve({transcript:'late transcript',is_mock:false}));expect(ask).not.toHaveBeenCalled();expect(synthesizeVoiceAudio).not.toHaveBeenCalled();
});
it('STT failure does not send a fabricated transcript or keep recording',async()=>{
 vi.mocked(transcribeVoiceAudio).mockRejectedValue(new Error('503'));
 const ask=vi.fn();render(<I18nProvider><VoiceControls disabled={false} onBusy={()=>{}} onTranscript={vi.fn()} onAsk={ask}/></I18nProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Voice conversation'}));fireEvent.click(await screen.findByRole('button',{name:'Done Speaking'}));
 expect(await screen.findByText('Voice is unavailable. Try again or type your question.')).toBeVisible();expect(ask).not.toHaveBeenCalled();expect(getUserMedia).toHaveBeenCalledTimes(1);
});
