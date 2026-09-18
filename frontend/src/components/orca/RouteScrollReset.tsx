import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Run inside Suspense so scroll is reset after the destination has rendered. */
export function RouteScrollReset() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    let target: HTMLElement | null = null;
    try { target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch { /* Invalid URL fragment. */ }
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
    else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}
