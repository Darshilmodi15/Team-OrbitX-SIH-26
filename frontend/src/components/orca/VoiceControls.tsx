import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Check, Loader2, Mic, X } from "lucide-react";
import { transcribeVoiceAudio, synthesizeVoiceAudio } from "@/services/api";
import { speechWav } from "@/lib/orca/voice-audio";
import { useI18n } from "@/lib/orca/i18n";

type Phase =
  | "idle"
  | "preparing"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "ready"
  | "error";
type Reply = { text: string; language?: string };
type Props = {
  threadId?: string;
  disabled: boolean;
  onTranscript: (text: string) => void;
  onAsk: (text: string) => Promise<Reply | undefined>;
  onBusy: (busy: boolean) => void;
};
export function VoiceControls(props: Props) {
  const { lang, t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"dictation" | "conversation">("dictation");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const current = useRef({ ...props, lang });
  current.current = { ...props, lang };
  const generation = useRef(0);
  const busy = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const meter = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playback = useRef<HTMLAudioElement | null>(null);
  const cancelPlayback = useRef<(() => void) | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const previousThread = useRef(props.threadId);
  const labels =
    lang === "gu"
      ? {
          conversation: "અવાજમાં વાતચીત",
          listening: "સાંભળી રહ્યું છે",
          processing: "લખાણમાં ફેરવી રહ્યું છે",
          speaking: "ORCA બોલે છે",
          ready: "લખાણ તૈયાર — સુધારો અને મોકલો.",
          end: "વાતચીત બંધ કરો",
          hint: "બોલો અને થોભો. ORCA તમારો પ્રશ્ન મોકલીને જવાબ બોલશે.",
          failed: "અવાજ સેવા ઉપલબ્ધ નથી. ફરી પ્રયાસ કરો અથવા પ્રશ્ન લખો.",
        }
      : lang === "hi"
        ? {
            conversation: "आवाज़ में बातचीत",
            listening: "सुन रहा है",
            processing: "लिखित रूप में बदल रहा है",
            speaking: "ORCA बोल रहा है",
            ready: "लिखित रूप तैयार — संपादित करके भेजें।",
            end: "बातचीत समाप्त करें",
            hint: "बोलें और रुकें। ORCA आपका प्रश्न भेजकर उत्तर बोलेगा।",
            failed:
              "आवाज़ सेवा उपलब्ध नहीं है। फिर कोशिश करें या प्रश्न लिखें।",
          }
        : {
            conversation: "Voice conversation",
            listening: "Listening",
            processing: "Transcribing",
            speaking: "ORCA is speaking",
            ready: "Transcript ready — edit it below, then send.",
            end: "End conversation",
            hint: "Speak, then pause. ORCA sends your question and reads the reply aloud.",
            failed: "Voice is unavailable. Try again or type your question.",
          };
  function releaseCapture() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (meter.current) {
      void meter.current.close().catch(() => {});
      meter.current = null;
    }
  }
  function cancel() {
    generation.current++;
    if (recorder.current) {
      recorder.current.onstop = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
    }
    recorder.current = null;
    releaseCapture();
    playback.current?.pause();
    playback.current = null;
    cancelPlayback.current?.();
    cancelPlayback.current = null;
    busy.current = false;
    current.current.onBusy(false);
    setPhase("idle");
    setLevel(0);
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      cancel();
    };
  }, []);
  useEffect(() => {
    const previous = previousThread.current;
    previousThread.current = props.threadId;
    if (
      previous !== props.threadId &&
      !(mode === "conversation" && phase === "thinking" && !previous)
    )
      cancel();
  }, [props.threadId]);
  useEffect(() => {
    if (mode !== "conversation" || phase === "idle") return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
      if (event.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled)",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [mode, phase === "idle"]);
  async function speak(text: string, language: string, version: number) {
    const chunks =
      text
        .replace(/[*#_`]/g, "")
        .match(/[\s\S]{1,850}(?:\s|$)|[\s\S]{1,850}/g) || [];
    for (const chunk of chunks) {
      if (version !== generation.current) return;
      const result = await synthesizeVoiceAudio(chunk, language);
      if (version !== generation.current) return;
      if (result.is_mock || !result.audio_base64)
        throw new Error("TTS_UNAVAILABLE");
      const audio = new Audio(
        `data:audio/${result.audio_format || "wav"};base64,${result.audio_base64}`,
      );
      playback.current = audio;
      await new Promise<void>((resolve, reject) => {
        cancelPlayback.current = resolve;
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("AUDIO_PLAYBACK_FAILED"));
        void audio.play().catch(reject);
      });
      playback.current = null;
      cancelPlayback.current = null;
    }
  }
  async function record(conversation: boolean, version: number) {
    setPhase("preparing");
    current.current.onBusy(true);
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error("MIC_UNSUPPORTED");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (version !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(media, mimeType ? { mimeType } : {});
      recorder.current = capture;
      const chunks: Blob[] = [];
      capture.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        if (version === generation.current) {
          cancel();
          setError(labels.failed);
          setPhase("error");
        }
      };
      capture.onstop = async () => {
        releaseCapture();
        recorder.current = null;
        if (version !== generation.current) return;
        setPhase("transcribing");
        setLevel(0);
        try {
          const wav = await speechWav(
            new Blob(chunks, { type: capture.mimeType }),
          );
          if (version !== generation.current) return;
          const result = await transcribeVoiceAudio(wav, current.current.lang);
          if (version !== generation.current) return;
          if (result.is_mock || !result.transcript?.trim())
            throw new Error("STT_UNAVAILABLE");
          const text = result.transcript.trim();
          setTranscript(text);
          if (!conversation) {
            current.current.onTranscript(text);
            setPhase("ready");
            busy.current = false;
            current.current.onBusy(false);
            return;
          }
          setPhase("thinking");
          const reply = await current.current.onAsk(text);
          if (version !== generation.current) return;
          if (!reply) throw new Error("CHAT_UNAVAILABLE");
          setPhase("speaking");
          await speak(
            reply.text,
            reply.language || current.current.lang,
            version,
          );
          if (version === generation.current) await record(true, version);
        } catch {
          if (version === generation.current) {
            cancel();
            setError(labels.failed);
            setPhase("error");
          }
        }
      };
      // Meter real microphone samples; never imply transcription before STT succeeds.
      let analyser: AnalyserNode | undefined;
      let samples: Float32Array<ArrayBuffer> | undefined;
      if (typeof AudioContext !== "undefined") {
        const context = new AudioContext();
        meter.current = context;
        await context.resume();
        if (version !== generation.current) {
          releaseCapture();
          return;
        }
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(media).connect(analyser);
        samples = new Float32Array(analyser.fftSize);
      }
      let elapsed = 0,
        heardSpeech = false,
        silence = 0;
      capture.start(250);
      const recordingStarted = performance.now();
      setPhase("listening");
      setSeconds(0);
      timer.current = setInterval(() => {
        elapsed = performance.now() - recordingStarted;
        setSeconds(Math.floor(elapsed / 1000));
        if (analyser && samples) {
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce((sum, x) => sum + x * x, 0) / samples.length,
          );
          setLevel(Math.min(1, rms * 12));
          if (rms > 0.015) {
            heardSpeech = true;
            silence = 0;
          } else silence += 100;
        }
        if (
          elapsed >= 45000 ||
          (conversation && heardSpeech && silence >= 1400 && elapsed > 1200)
        )
          finish();
      }, 100);
    } catch (err) {
      if (version === generation.current) {
        cancel();
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Microphone unavailable: permission denied."
            : labels.failed,
        );
        setPhase("error");
      }
    }
  }
  function begin(conversation: boolean) {
    if (busy.current) return;
    cancel();
    busy.current = true;
    setError("");
    setTranscript("");
    setMode(conversation ? "conversation" : "dictation");
    void record(conversation, generation.current);
  }
  function finish() {
    if (recorder.current?.state === "recording") {
      setPhase("transcribing");
      recorder.current.stop();
    }
  }
  const waveform = (
    <span
      aria-hidden="true"
      className="flex h-12 items-center justify-center gap-1"
    >
      {[0.35, 0.65, 0.9, 1, 0.8, 0.55, 0.3].map((scale, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-current transition-[height] motion-reduce:transition-none"
          style={{ height: 4 + level * 40 * scale }}
        />
      ))}
    </span>
  );
  const status =
    phase === "listening"
      ? `${labels.listening} · ${seconds}s / 45s`
      : phase === "transcribing"
        ? labels.processing
        : phase === "speaking"
          ? labels.speaking
          : phase === "thinking"
            ? t("chat.thinking")
            : phase === "ready"
              ? labels.ready
              : phase === "error"
                ? error
                : t("state.loading");
  return (
    <>
      <button
        type="button"
        disabled={props.disabled || busy.current}
        onClick={() => begin(false)}
        aria-label={t("voice.record")}
        title={t("voice.record")}
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
      >
        <Mic className="size-5" />
      </button>
      <button
        type="button"
        disabled={props.disabled || busy.current}
        onClick={() => begin(true)}
        aria-label={labels.conversation}
        title={labels.conversation}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
      >
        <AudioLines className="size-5" />
      </button>
      {phase !== "idle" &&
        (mode === "conversation" ? (
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4">
              <div
                ref={dialog}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={labels.conversation}
                className="voice-dialog"
              >
                <h2 className="text-xl font-semibold">{labels.conversation}</h2>
                <p className="text-sm text-muted-foreground">{labels.hint}</p>
                <div className="voice-orb">
                  {phase === "listening" ? (
                    waveform
                  ) : phase === "error" ? (
                    <Mic className="size-10" />
                  ) : (
                    <AudioLines className="size-12 motion-safe:animate-pulse" />
                  )}
                </div>
                <p role="status">{status}</p>
                {transcript && (
                  <p className="max-h-32 overflow-auto text-sm">{transcript}</p>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  {phase === "listening" && (
                    <button
                      type="button"
                      onClick={finish}
                      className="min-h-11 rounded-full border px-5"
                    >
                      Done Speaking
                    </button>
                  )}
                  {phase === "error" && (
                    <button
                      type="button"
                      onClick={() => begin(true)}
                      className="min-h-11 rounded-full border px-5"
                    >
                      {t("cta.retry")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cancel}
                    className="min-h-11 rounded-full bg-destructive px-5 text-white"
                  >
                    {labels.end}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        ) : (
          <div
            className={
              phase === "ready" || phase === "error"
                ? "voice-dictation-ready"
                : "voice-dictation"
            }
          >
            <button
              type="button"
              onClick={cancel}
              aria-label="Dismiss voice"
              className="workspace-icon"
            >
              <X className="size-5" />
            </button>
            <div className="voice-dictation-status">
              {phase === "listening" ? (
                waveform
              ) : phase === "ready" ? (
                <Check className="mx-auto size-5" />
              ) : phase !== "error" ? (
                <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
              ) : null}
              <p role="status">{status}</p>
            </div>
            {phase === "listening" && (
              <button
                type="button"
                onClick={finish}
                aria-label="Done Speaking"
                title="Done Speaking"
                className="composer-send"
              >
                <Check className="size-5" />
              </button>
            )}
          </div>
        ))}
    </>
  );
}
