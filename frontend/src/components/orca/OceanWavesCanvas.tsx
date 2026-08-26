import React, { useEffect, useRef } from "react";
import { useTheme } from "@/lib/orca/theme";

interface OceanWavesCanvasProps {
  className?: string;
  interactive?: boolean;
  showBoats?: boolean;
  showFisherman?: boolean;
  showBirds?: boolean;
  showSunGlint?: boolean;
  showParticles?: boolean;
  showFoamCrests?: boolean;
  speedMultiplier?: number;
  forcedTheme?: "light" | "dark";
  style?: React.CSSProperties;
}

interface Bird {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  size: number;
  wingPhase: number;
  wingSpeed: number;
}

interface Fish {
  x: number;
  baseYRatio: number;
  speedX: number;
  size: number;
  depth: number;
  phase: number;
}

interface FoamParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  decay: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
}

// Utility to interpolate between two RGBA colors
function lerpColor(c1: [number, number, number, number], c2: [number, number, number, number], t: number): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  const a = (c1[3] + (c2[3] - c1[3]) * t).toFixed(3);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const OceanWavesCanvas: React.FC<OceanWavesCanvasProps> = ({
  className = "",
  interactive = true,
  showBoats = true,
  showFisherman = true,
  showBirds = true,
  showSunGlint = true,
  showParticles = true,
  showFoamCrests = true,
  speedMultiplier = 1,
  forcedTheme,
  style,
}) => {
  const { resolvedTheme } = useTheme();
  const activeTheme = forcedTheme || resolvedTheme;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number; active: boolean }>({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    active: false,
  });

  // Keep track of daytime transition (0 = full dark night, 1 = full bright day)
  const daytimeRef = useRef<number>(activeTheme === "light" ? 1 : 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;
    let isVisible = true;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReducedMotion = mediaQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", onMotionChange);

    // Stars for night sky
    const stars: Star[] = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.42,
        radius: 0.6 + Math.random() * 1.2,
        alpha: 0.2 + Math.random() * 0.7,
        twinkleSpeed: 0.03 + Math.random() * 0.05,
      });
    }

    // Birds setup
    const birds: Bird[] = [];
    if (showBirds) {
      for (let i = 0; i < 5; i++) {
        birds.push({
          x: Math.random(),
          y: 0.08 + Math.random() * 0.16,
          speedX: 0.00035 + Math.random() * 0.0003,
          speedY: 0.00005 * (Math.random() - 0.5),
          size: 7 + Math.random() * 5,
          wingPhase: Math.random() * Math.PI * 2,
          wingSpeed: 0.08 + Math.random() * 0.04,
        });
      }
    }

    // Fish / silhouettes in water
    const fishes: Fish[] = [];
    for (let i = 0; i < 4; i++) {
      fishes.push({
        x: Math.random(),
        baseYRatio: 0.72 + Math.random() * 0.18,
        speedX: 0.0003 + Math.random() * 0.0004,
        size: 8 + Math.random() * 6,
        depth: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Foam particles created near boat / wave peaks
    const foamParticles: FoamParticle[] = [];

    // Distant Cargo Ship state
    const cargoShip = {
      x: 0.12,
      speedX: 0.00008,
    };

    // Fishing Boat state (riding primary swell)
    const fishingBoat = {
      xRatio: 0.68,
      pitch: 0,
    };

    // Navigational Buoy state
    const buoy = {
      xRatio: 0.2,
      pitch: 0,
    };

    const resize = () => {
      const parent = containerRef.current;
      if (!parent || !canvas) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(() => resize());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    resize();

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) intersectionObserver.observe(containerRef.current);

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
        mouseRef.current.targetY = (e.clientY - rect.top) / rect.height;
        mouseRef.current.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.targetX = 0.5;
      mouseRef.current.targetY = 0.5;
    };

    const containerEl = containerRef.current;
    if (containerEl && interactive) {
      containerEl.addEventListener("mousemove", handleMouseMove);
      containerEl.addEventListener("mouseleave", handleMouseLeave);
    }

    // Analytical Wave Functions
    const getWaveDistant = (xNorm: number, t: number, isMobile: boolean) => {
      const freq = isMobile ? 8.0 : 12.0;
      const speed = 0.008 * speedMultiplier;
      const h1 = Math.sin(xNorm * freq + t * speed);
      const h2 = Math.cos(xNorm * freq * 1.8 - t * speed * 0.7) * 0.3;
      const y = (h1 + h2) * (isMobile ? 5 : 8);
      const slope = (Math.cos(xNorm * freq + t * speed) * freq * 8) / width;
      return { y, slope };
    };

    const getWaveMid = (xNorm: number, t: number, isMobile: boolean) => {
      const freq = isMobile ? 6.0 : 8.5;
      const speed = 0.012 * speedMultiplier;
      const h1 = Math.sin(xNorm * freq + t * speed + 1.2);
      const h2 = Math.cos(xNorm * freq * 2.2 - t * speed * 0.8) * 0.35;
      const y = (h1 + h2) * (isMobile ? 10 : 16);
      const slope = (Math.cos(xNorm * freq + t * speed + 1.2) * freq * 16) / width;
      return { y, slope };
    };

    const getWaveMain = (xNorm: number, t: number, isMobile: boolean) => {
      const freq1 = isMobile ? 4.8 : 6.2;
      const freq2 = isMobile ? 9.5 : 12.8;
      const speed1 = 0.018 * speedMultiplier;
      const speed2 = 0.011 * speedMultiplier;

      let mouseAdd = 0;
      let mouseSlope = 0;
      if (mouseRef.current.active) {
        const dist = xNorm - mouseRef.current.x;
        const influence = Math.exp(-dist * dist * 32);
        mouseAdd = influence * 14 * Math.sin(t * 0.04);
        mouseSlope = -2 * dist * 32 * influence * 14 * Math.sin(t * 0.04);
      }

      const s1 = Math.sin(xNorm * freq1 + t * speed1);
      const s2 = Math.sin(xNorm * freq2 - t * speed2 + 2.4) * 0.38;
      const s3 = Math.cos(xNorm * 3.1 + t * 0.007) * 0.22;

      const combined = (s1 + s2 + s3) / 1.6;
      const sharpened = Math.pow(Math.abs(combined), 1.25) * Math.sign(combined);
      const y = sharpened * (isMobile ? 18 : 28) + mouseAdd;

      const deriv =
        (Math.cos(xNorm * freq1 + t * speed1) * freq1 * 28 +
          Math.cos(xNorm * freq2 - t * speed2 + 2.4) * freq2 * 0.38 * 28) /
        width;
      const slope = deriv + mouseSlope / width;

      return { y, slope, raw: sharpened };
    };

    const getWaveForeground = (xNorm: number, t: number, isMobile: boolean) => {
      const freq = isMobile ? 5.5 : 7.8;
      const speed = 0.025 * speedMultiplier;
      const h1 = Math.sin(xNorm * freq + t * speed + 4.1);
      const h2 = Math.cos(xNorm * freq * 1.9 - t * speed * 1.1) * 0.4;
      const combined = (h1 + h2) / 1.4;
      const sharpened = Math.pow(Math.abs(combined), 1.3) * Math.sign(combined);
      const y = sharpened * (isMobile ? 15 : 24);
      const slope = (Math.cos(xNorm * freq + t * speed + 4.1) * freq * 24) / width;
      return { y, slope, raw: sharpened };
    };

    // Draw Celestial Sun
    const drawSun = (ctx: CanvasRenderingContext2D, sx: number, sy: number, alpha: number, time: number) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer Solar Atmosphere Flare
      const sunGlow = ctx.createRadialGradient(sx, sy, 5, sx, sy, 110);
      sunGlow.addColorStop(0, "rgba(254, 240, 138, 0.9)");
      sunGlow.addColorStop(0.3, "rgba(251, 191, 36, 0.45)");
      sunGlow.addColorStop(0.7, "rgba(245, 158, 11, 0.15)");
      sunGlow.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sx, sy, 110, 0, Math.PI * 2);
      ctx.fill();

      // Sun Disk
      ctx.fillStyle = "#fffbeb";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fill();

      // Subtle Sun Rays
      ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + time * 0.005;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(angle) * 26, sy + Math.sin(angle) * 26);
        ctx.lineTo(sx + Math.cos(angle) * 44, sy + Math.sin(angle) * 44);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Draw Celestial Moon
    const drawMoon = (ctx: CanvasRenderingContext2D, mx: number, my: number, alpha: number) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Soft Moonlight Corona
      const moonGlow = ctx.createRadialGradient(mx, my, 8, mx, my, 95);
      moonGlow.addColorStop(0, "rgba(224, 242, 254, 0.85)");
      moonGlow.addColorStop(0.35, "rgba(56, 189, 248, 0.3)");
      moonGlow.addColorStop(0.7, "rgba(14, 116, 144, 0.1)");
      moonGlow.addColorStop(1, "rgba(14, 116, 144, 0)");
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(mx, my, 95, 0, Math.PI * 2);
      ctx.fill();

      // Moon Disk (Silvery Pearl)
      ctx.fillStyle = "#f8fafc";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(mx, my, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Moon Craters / Maria (Delicate lunar texture)
      ctx.fillStyle = "rgba(203, 213, 225, 0.55)";
      ctx.beginPath();
      ctx.arc(mx - 6, my - 4, 4, 0, Math.PI * 2);
      ctx.arc(mx + 5, my + 6, 3, 0, Math.PI * 2);
      ctx.arc(mx + 7, my - 5, 2.5, 0, Math.PI * 2);
      ctx.arc(mx - 2, my + 7, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw Fishing Boat
    const drawFishingBoat = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      pitch: number,
      time: number,
      isMobile: boolean,
      daytime: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pitch * 0.85);

      const scale = isMobile
        ? Math.max(0.55, Math.min(width / 700, 0.75))
        : Math.max(0.65, Math.min(width / 1100, 1.15));
      ctx.scale(scale, scale);

      // Boat Shadow
      ctx.fillStyle = "rgba(4, 18, 38, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 48, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hull
      ctx.beginPath();
      ctx.moveTo(-45, -2);
      ctx.bezierCurveTo(-42, 16, -20, 20, 0, 20);
      ctx.bezierCurveTo(28, 20, 48, 12, 54, -4);
      ctx.lineTo(44, -5);
      ctx.bezierCurveTo(20, -7, -20, -7, -45, -2);
      ctx.closePath();

      const hullGrad = ctx.createLinearGradient(0, -6, 0, 20);
      if (daytime > 0.5) {
        hullGrad.addColorStop(0, "#0284c7");
        hullGrad.addColorStop(0.4, "#0f2b48");
        hullGrad.addColorStop(1, "#081d33");
      } else {
        hullGrad.addColorStop(0, "#0e7490");
        hullGrad.addColorStop(0.4, "#0f172a");
        hullGrad.addColorStop(1, "#020617");
      }
      ctx.fillStyle = hullGrad;
      ctx.fill();

      // Maritime Orange Stripe
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-40, 2);
      ctx.bezierCurveTo(-15, 6, 20, 6, 48, -1);
      ctx.stroke();

      // Waterline trim
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-42, -1);
      ctx.bezierCurveTo(-15, -4, 20, -4, 50, -4);
      ctx.stroke();

      // Cabin Wheelhouse
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-22, -18, 22, 14);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-20, -16, 18, 10);

      // Cabin Windows
      ctx.fillStyle = "rgba(254, 240, 138, 0.85)";
      ctx.shadowColor = "rgba(250, 204, 21, 0.7)";
      ctx.shadowBlur = 8;
      ctx.fillRect(-18, -14, 6, 6);
      ctx.fillRect(-9, -14, 6, 6);
      ctx.shadowBlur = 0;

      // Mast & Rigging
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(8, -48);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(16, -36);
      ctx.stroke();

      ctx.strokeStyle = "rgba(203, 213, 225, 0.55)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(8, -48);
      ctx.lineTo(-38, -2);
      ctx.moveTo(8, -48);
      ctx.lineTo(46, -4);
      ctx.moveTo(8, -36);
      ctx.lineTo(26, -5);
      ctx.stroke();

      // Mast Nav Light
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(8, -49, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pennant
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(8, -46);
      ctx.lineTo(18 + Math.sin(time * 0.06) * 2, -44);
      ctx.lineTo(8, -40);
      ctx.fill();

      // Fisherman
      if (showFisherman) {
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(22, -5);
        ctx.lineTo(26, -18);
        ctx.lineTo(31, -18);
        ctx.lineTo(33, -5);
        ctx.fill();

        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(24, -24, 9, 10, 2);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(28.5, -27, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(24, -28);
        ctx.lineTo(28.5, -33);
        ctx.lineTo(33, -28);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(26, -20);
        ctx.lineTo(35, -22);
        ctx.lineTo(42, -26);
        ctx.stroke();

        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(38, -20);
        ctx.lineTo(62, -38);
        ctx.stroke();

        const lineSway = Math.sin(time * 0.05) * 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(62, -38);
        ctx.bezierCurveTo(72, -18, 76 + lineSway, 0, 78 + lineSway, 16);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(78 + lineSway, 16, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(78 + lineSway, 17, 5 + Math.sin(time * 0.08) * 2, 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Draw Distant Cargo Ship
    const drawCargoShip = (ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, isMobile: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      const shipScale = isMobile
        ? Math.max(0.3, Math.min(width / 1800, 0.5))
        : Math.max(0.4, Math.min(width / 1600, 0.7));
      ctx.scale(shipScale, shipScale);

      ctx.fillStyle = "rgba(15, 33, 58, 0.75)";
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(-50, 8);
      ctx.lineTo(48, 8);
      ctx.lineTo(58, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(20, 48, 82, 0.65)";
      ctx.fillRect(-35, -10, 60, 10);
      ctx.fillRect(-28, -16, 45, 6);

      ctx.fillStyle = "rgba(15, 33, 58, 0.8)";
      ctx.fillRect(-52, -18, 14, 18);
      ctx.fillRect(-49, -24, 8, 6);

      ctx.strokeStyle = "rgba(30, 64, 100, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-45, -24);
      ctx.lineTo(-45, -32);
      ctx.stroke();

      if (Math.sin(time * 0.08) > 0) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-45, -33, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-60, 6);
      ctx.lineTo(-85, 8);
      ctx.stroke();

      ctx.restore();
    };

    // Draw Sea Marker Buoy
    const drawBuoy = (ctx: CanvasRenderingContext2D, cx: number, cy: number, pitch: number, time: number, isMobile: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pitch * 0.7);
      const scale = isMobile
        ? Math.max(0.42, Math.min(width / 1400, 0.65))
        : Math.max(0.5, Math.min(width / 1300, 0.9));
      ctx.scale(scale, scale);

      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(8, 4);
      ctx.lineTo(5, -12);
      ctx.lineTo(-5, -12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(0, 4, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(0, -22);
      ctx.lineTo(4, -12);
      ctx.stroke();

      const isFlash = Math.sin(time * 0.07) > 0.4;
      ctx.fillStyle = isFlash ? "#10b981" : "#047857";
      if (isFlash) {
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(0, -23, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 5, 14 + Math.sin(time * 0.05) * 3, 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    // Draw Seagull
    const drawBird = (ctx: CanvasRenderingContext2D, b: Bird) => {
      ctx.save();
      const px = b.x * width;
      const py = b.y * height;
      const wingY = Math.sin(b.wingPhase) * (b.size * 0.5);

      ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(px - b.size, py + wingY);
      ctx.quadraticCurveTo(px - b.size * 0.4, py - b.size * 0.3, px, py);
      ctx.quadraticCurveTo(px + b.size * 0.4, py - b.size * 0.3, px + b.size, py + wingY);
      ctx.stroke();

      ctx.restore();
    };

    // Main Render Loop
    const render = () => {
      if (!isVisible || width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      if (!isReducedMotion) {
        time += 1;
      }

      const isMobile = width < 640;

      // Smooth daytime transition: target 1 for light theme, 0 for dark theme
      const targetDaytime = activeTheme === "light" ? 1 : 0;
      daytimeRef.current += (targetDaytime - daytimeRef.current) * 0.04;
      const dt = daytimeRef.current; // 0 = night, 1 = day

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // 1. SKY / ATMOSPHERIC HORIZON
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      // Night Colors vs Day Colors
      const nightSkyTop: [number, number, number, number] = [3, 11, 23, 1];
      const daySkyTop: [number, number, number, number] = [14, 116, 144, 1];

      const nightSkyMid: [number, number, number, number] = [8, 30, 58, 1];
      const daySkyMid: [number, number, number, number] = [2, 132, 199, 1];

      const nightSkyBot: [number, number, number, number] = [10, 42, 75, 1];
      const daySkyBot: [number, number, number, number] = [56, 189, 248, 1];

      skyGrad.addColorStop(0, lerpColor(nightSkyTop, daySkyTop, dt));
      skyGrad.addColorStop(0.38, lerpColor(nightSkyMid, daySkyMid, dt));
      skyGrad.addColorStop(0.58, lerpColor(nightSkyBot, daySkyBot, dt));
      skyGrad.addColorStop(1, lerpColor([4, 15, 32, 1], [14, 116, 144, 1], dt));

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. STARS (fade out during day)
      if (dt < 0.85) {
        const starAlphaMultiplier = (1 - dt / 0.85);
        stars.forEach((s) => {
          const currentAlpha =
            s.alpha * starAlphaMultiplier * (0.6 + 0.4 * Math.sin(time * s.twinkleSpeed + s.x * 10));
          ctx.save();
          ctx.beginPath();
          ctx.arc(s.x * width, s.y * height, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(224, 242, 254, ${currentAlpha})`;
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.restore();
        });
      }

      // 3. CELESTIAL ORBITAL MOTION (SUN & MOON)
      // Base positions for Sun & Moon
      const celestialX = isMobile ? width * 0.82 : width * 0.74;
      const celestialTopY = height * 0.18;
      const celestialBottomY = height * 0.58; // sinks beneath waves

      // Sun rises as dt -> 1
      const sunY = celestialBottomY - dt * (celestialBottomY - celestialTopY);
      drawSun(ctx, celestialX, sunY, dt, time);

      // Moon rises as dt -> 0
      const moonY = celestialTopY + dt * (celestialBottomY - celestialTopY);
      drawMoon(ctx, celestialX, moonY, 1 - dt);

      // 4. WATER SPECULAR COLUMN REFLECTION
      if (showSunGlint) {
        const glintWidth = isMobile ? 140 : 260;
        const glintGrad = ctx.createLinearGradient(celestialX - glintWidth / 2, 0, celestialX + glintWidth / 2, 0);

        const glintColorNight: [number, number, number, number] = [56, 189, 248, 0.1];
        const glintColorDay: [number, number, number, number] = [254, 240, 138, 0.22];

        glintGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        glintGrad.addColorStop(0.5, lerpColor(glintColorNight, glintColorDay, dt));
        glintGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = glintGrad;
        ctx.fillRect(celestialX - glintWidth / 2, height * 0.42, glintWidth, height * 0.58);
      }

      // 5. BIRDS
      if (showBirds) {
        birds.forEach((b) => {
          b.x = (b.x + b.speedX) % 1.1;
          b.y += b.speedY;
          if (b.y < 0.05 || b.y > 0.28) b.speedY *= -1;
          b.wingPhase += b.wingSpeed;
          drawBird(ctx, b);
        });
      }

      // 6. DISTANT HORIZON OCEAN LAYER
      const baseDistantY = isMobile ? height * 0.52 : height * 0.46;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseDistantY);

      const step = 6;
      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveDistant(xNorm, time, isMobile);
        ctx.lineTo(x, baseDistantY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const distantGrad = ctx.createLinearGradient(0, baseDistantY - 10, 0, height);
      distantGrad.addColorStop(0, lerpColor([10, 36, 68, 0.85], [14, 116, 144, 0.9], dt));
      distantGrad.addColorStop(1, lerpColor([6, 20, 42, 0.95], [3, 105, 161, 0.95], dt));
      ctx.fillStyle = distantGrad;
      ctx.fill();

      ctx.strokeStyle = lerpColor([56, 189, 248, 0.25], [125, 211, 252, 0.5], dt);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 7. DISTANT CARGO SHIP
      if (showBoats) {
        cargoShip.x = (cargoShip.x + cargoShip.speedX) % 1.15;
        const shipXNorm = cargoShip.x - 0.08;
        const shipPixelX = shipXNorm * width;
        const wCargo = getWaveDistant(shipXNorm, time, isMobile);
        const shipPixelY = baseDistantY + wCargo.y - 2;
        drawCargoShip(ctx, shipPixelX, shipPixelY, time, isMobile);
      }

      // 8. MID-OCEAN CURRENT SWELL
      const baseMidY = isMobile ? height * 0.62 : height * 0.58;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseMidY);

      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveMid(xNorm, time, isMobile);
        ctx.lineTo(x, baseMidY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const midGrad = ctx.createLinearGradient(0, baseMidY - 20, 0, height);
      midGrad.addColorStop(0, lerpColor([12, 60, 100, 0.75], [2, 132, 199, 0.85], dt));
      midGrad.addColorStop(0.6, lerpColor([10, 40, 75, 0.9], [13, 148, 136, 0.9], dt));
      midGrad.addColorStop(1, lerpColor([5, 20, 42, 1.0], [15, 118, 110, 1.0], dt));
      ctx.fillStyle = midGrad;
      ctx.fill();

      ctx.strokeStyle = lerpColor([45, 212, 191, 0.45], [94, 234, 212, 0.7], dt);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 9. NAVIGATIONAL BUOY
      if (showBoats) {
        const buoyXRatio = isMobile ? 0.15 : buoy.xRatio;
        const buoyWave = getWaveMain(buoyXRatio, time, isMobile);
        const buoyPixelX = buoyXRatio * width;
        const buoyPixelY = (isMobile ? height * 0.72 : height * 0.68) + buoyWave.y;
        buoy.pitch += (buoyWave.slope * 18 - buoy.pitch) * 0.1;
        drawBuoy(ctx, buoyPixelX, buoyPixelY, buoy.pitch, time, isMobile);
      }

      // 10. MAIN DYNAMIC WAVE (Fishing boat rides here)
      const baseMainY = isMobile ? height * 0.76 : height * 0.72;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseMainY);

      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveMain(xNorm, time, isMobile);
        ctx.lineTo(x, baseMainY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const mainGrad = ctx.createLinearGradient(0, baseMainY - 30, 0, height);
      mainGrad.addColorStop(0, lerpColor([14, 116, 144, 0.65], [13, 148, 136, 0.8], dt));
      mainGrad.addColorStop(0.3, lerpColor([13, 148, 136, 0.85], [14, 165, 233, 0.85], dt));
      mainGrad.addColorStop(1, lerpColor([8, 30, 60, 0.98], [15, 76, 129, 0.98], dt));
      ctx.fillStyle = mainGrad;
      ctx.fill();

      ctx.strokeStyle = lerpColor([125, 211, 252, 0.85], [204, 251, 241, 0.95], dt);
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();

      // 11. FISHING BOAT WITH FISHERMAN
      if (showBoats) {
        // On mobile, position boat cleanly at ~0.62 so it's fully visible and not blocked
        const boatX = isMobile ? 0.62 : fishingBoat.xRatio;
        const boatWave = getWaveMain(boatX, time, isMobile);
        const boatPixelX = boatX * width;
        const boatPixelY = baseMainY + boatWave.y - (isMobile ? 2 : 4);

        const targetPitch = Math.atan(boatWave.slope * (isMobile ? 2.8 : 3.5));
        fishingBoat.pitch += (targetPitch - fishingBoat.pitch) * 0.12;

        drawFishingBoat(ctx, boatPixelX, boatPixelY, fishingBoat.pitch, time, isMobile, dt);

        if (Math.random() < 0.35) {
          foamParticles.push({
            x: boatPixelX - (isMobile ? 22 : 35) * Math.cos(fishingBoat.pitch) + (Math.random() - 0.5) * 6,
            y: boatPixelY + (isMobile ? 8 : 12) + (Math.random() - 0.5) * 4,
            radius: 1.0 + Math.random() * 2.0,
            alpha: 0.7,
            decay: 0.018,
          });
        }
      }

      // 12. FISH SILHOUETTES
      fishes.forEach((f) => {
        f.x = (f.x + f.speedX) % 1.1;
        const px = f.x * width;
        const fishWave = getWaveMain(f.x, time, isMobile);
        const py = height * (isMobile ? 0.8 : f.baseYRatio) + fishWave.y * 0.4;
        const swimY = Math.sin(time * 0.08 + f.phase) * 3;

        ctx.save();
        ctx.translate(px, py + swimY);
        ctx.fillStyle = `rgba(165, 243, 252, ${0.25 * f.depth})`;

        ctx.beginPath();
        ctx.ellipse(0, 0, f.size * (isMobile ? 0.7 : 1), f.size * 0.35 * (isMobile ? 0.7 : 1), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        const tailOsc = Math.sin(time * 0.15 + f.phase) * (f.size * 0.4);
        ctx.moveTo(-f.size * 0.8 * (isMobile ? 0.7 : 1), 0);
        ctx.lineTo(-f.size * 1.4 * (isMobile ? 0.7 : 1), -f.size * 0.5 + tailOsc);
        ctx.lineTo(-f.size * 1.4 * (isMobile ? 0.7 : 1), f.size * 0.5 + tailOsc);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // 13. FOREGROUND COASTAL SURGE
      const baseFgY = isMobile ? height * 0.88 : height * 0.84;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseFgY);

      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveForeground(xNorm, time, isMobile);
        ctx.lineTo(x, baseFgY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const fgGrad = ctx.createLinearGradient(0, baseFgY - 20, 0, height);
      fgGrad.addColorStop(0, lerpColor([20, 184, 166, 0.45], [45, 212, 191, 0.6], dt));
      fgGrad.addColorStop(0.5, lerpColor([13, 148, 136, 0.7], [14, 165, 233, 0.75], dt));
      fgGrad.addColorStop(1, lerpColor([6, 24, 48, 0.95], [3, 105, 161, 0.95], dt));
      ctx.fillStyle = fgGrad;
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      // 14. WAKE FOAM PARTICLES
      for (let i = foamParticles.length - 1; i >= 0; i--) {
        const p = foamParticles[i];
        p.alpha -= p.decay;
        p.radius += 0.05;
        p.x -= 0.3;

        if (p.alpha <= 0) {
          foamParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mediaQuery.removeEventListener("change", onMotionChange);
      if (containerEl && interactive) {
        containerEl.removeEventListener("mousemove", handleMouseMove);
        containerEl.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [interactive, showBoats, showFisherman, showBirds, showSunGlint, speedMultiplier, activeTheme]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
        style={{ display: "block" }}
      />
    </div>
  );
};
