import { useEffect, useRef, useState } from "react";
interface Props {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: {
      initialize: (config: { client_id: string; callback: (response: {credential: string}) => void; auto_select?: boolean }) => void;
      renderButton: (parent: HTMLElement, options: {theme: "outline"; size: "large"; text: "continue_with"; shape: "pill"; width: number}) => void;
    } } };
  }
}
let googleScript: Promise<void> | undefined;
function loadGoogle(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScript) return googleScript;
  googleScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const timeout = window.setTimeout(() => reject(new Error("Google sign-in did not load. Check your connection and reload.")), 12000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error("Google sign-in could not load. Use email or mobile, or reload to retry.")); };
    document.head.appendChild(script);
  });
  return googleScript;
}
export function GoogleSignInButton({ onSuccess, onError, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSuccess, onError, disabled });
  callbacks.current = { onSuccess, onError, disabled };
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    void loadGoogle().then(() => {
      if (cancelled || !containerRef.current) return;
      const api = window.google?.accounts?.id;
      if (!api) throw new Error("Google sign-in is unavailable. Reload to retry.");
      api.initialize({
        client_id: clientId, auto_select: false,
        callback: (res) => {
          if (cancelled || callbacks.current.disabled) return;
          if (res.credential) callbacks.current.onSuccess(res.credential);
          else callbacks.current.onError?.("No credential returned from Google.");
        },
      });
      let lastWidth = 0;
      const render = () => {
        const container = containerRef.current;
        if (!container || cancelled) return;
        const width = Math.max(200, Math.min(380, container.clientWidth));
        if (lastWidth === width) return;
        lastWidth = width;
        container.replaceChildren();
        api.renderButton(container, {theme:"outline",size:"large",text:"continue_with",shape:"pill",width});
      };
      render();
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(render);
        observer.observe(containerRef.current);
      }
      setState("ready");
    }).catch((error: Error) => {
      if (cancelled) return;
      setState("error");
      callbacks.current.onError?.(error.message);
    });
    return () => { cancelled = true; observer?.disconnect(); };
  }, [clientId]);
  if (!clientId) return null;
  return <div className="min-h-11 w-full" aria-busy={state === "loading" || disabled}>
    <div ref={containerRef} inert={disabled || undefined} className={disabled ? "flex justify-center opacity-50" : "flex justify-center"} />
    {state === "loading" && <p role="status" className="py-3 text-center text-xs text-muted-foreground">Loading Google sign-in…</p>}
    {state === "error" && <p role="status" className="py-3 text-center text-xs text-muted-foreground">Google sign-in unavailable. You can still use email or mobile.</p>}
  </div>;
}
