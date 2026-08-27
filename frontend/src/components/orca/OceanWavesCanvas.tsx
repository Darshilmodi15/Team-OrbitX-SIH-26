import React, { useEffect, useRef } from "react";
import { useTheme } from "@/lib/orca/theme";

interface OceanWavesCanvasProps {
  className?: string;
  interactive?: boolean;
  speedMultiplier?: number;
  forcedTheme?: "light" | "dark";
  showParticles?: boolean;
  showFoamCrests?: boolean;
  showBoats?: boolean;
  showFisherman?: boolean;
  showBirds?: boolean;
  showSunGlint?: boolean;
  style?: React.CSSProperties;
}

interface WaveCurrentParticle {
  x: number;
  y: number;
  speed: number;
  waveIndex: number;
  size: number;
  alpha: number;
  pulsePhase: number;
}

export const OceanWavesCanvas: React.FC<OceanWavesCanvasProps> = ({
  className = "",
  interactive = true,
  speedMultiplier = 1,
  forcedTheme,
  style,
}) => {
  const { resolvedTheme } = useTheme();
  const activeTheme = forcedTheme || resolvedTheme || "dark";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number; active: boolean }>({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    // Hydrographic current particles flowing along bathymetric waves
    const particleCount = 45;
    const particles: WaveCurrentParticle[] = [];

    function resize() {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx?.scale(dpr, dpr);

      // Re-initialize particles across width
      if (particles.length === 0) {
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speed: (0.4 + Math.random() * 0.8) * speedMultiplier,
            waveIndex: Math.floor(Math.random() * 4),
            size: 1.2 + Math.random() * 1.5,
            alpha: 0.2 + Math.random() * 0.5,
            pulsePhase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking for subtle interactive depth
    const onMouseMove = (e: MouseEvent) => {
      if (!interactive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = (e.clientY - rect.top) / rect.height;
      mouseRef.current.active = true;
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.targetX = 0.5;
      mouseRef.current.targetY = 0.5;
    };

    const container = containerRef.current;
    if (container && interactive) {
      container.addEventListener("mousemove", onMouseMove);
      container.addEventListener("mouseleave", onMouseLeave);
    }

    // Bathymetric wave definition parameters (Professional maritime command styling)
    const waveLayers = [
      {
        baseYRatio: 0.72,
        amplitude: 28,
        wavelength: 0.0018,
        speed: 0.012,
        phaseOffset: 0,
        colorTop: "rgba(13, 148, 136, 0.12)",
        colorBottom: "rgba(7, 21, 38, 0.95)",
        strokeColor: "rgba(45, 212, 191, 0.25)",
        strokeWidth: 1.5,
      },
      {
        baseYRatio: 0.78,
        amplitude: 34,
        wavelength: 0.0014,
        speed: 0.009,
        phaseOffset: 2.2,
        colorTop: "rgba(2, 132, 199, 0.14)",
        colorBottom: "rgba(6, 17, 31, 0.98)",
        strokeColor: "rgba(56, 189, 248, 0.3)",
        strokeWidth: 1.5,
      },
      {
        baseYRatio: 0.84,
        amplitude: 38,
        wavelength: 0.0011,
        speed: 0.007,
        phaseOffset: 4.1,
        colorTop: "rgba(15, 50, 84, 0.25)",
        colorBottom: "rgba(4, 13, 24, 1.0)",
        strokeColor: "rgba(14, 165, 233, 0.35)",
        strokeWidth: 2,
      },
      {
        baseYRatio: 0.91,
        amplitude: 24,
        wavelength: 0.0016,
        speed: 0.005,
        phaseOffset: 1.0,
        colorTop: "rgba(7, 21, 38, 0.6)",
        colorBottom: "rgba(3, 9, 18, 1.0)",
        strokeColor: "rgba(20, 184, 166, 0.4)",
        strokeWidth: 2.5,
      },
    ];

    function getWaveY(x: number, layer: (typeof waveLayers)[0], t: number, mX: number, mY: number): number {
      const baseY = height * layer.baseYRatio;
      const mouseInfluence = (mX - 0.5) * 20 + (mY - 0.5) * 15;
      const primary = Math.sin(x * layer.wavelength + t * layer.speed * speedMultiplier + layer.phaseOffset) * layer.amplitude;
      const secondary = Math.cos(x * layer.wavelength * 1.8 - t * layer.speed * 0.6 * speedMultiplier) * (layer.amplitude * 0.35);
      const tertiary = Math.sin(x * layer.wavelength * 0.6 + t * layer.speed * 0.4 * speedMultiplier) * (layer.amplitude * 0.2);
      return baseY + primary + secondary + tertiary + mouseInfluence;
    }

    function render() {
      if (!ctx || width <= 0 || height <= 0) return;

      time += 1;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const mX = mouseRef.current.x;
      const mY = mouseRef.current.y;

      // 1. Deep Naval Gradient Background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      if (activeTheme === "light") {
        bgGradient.addColorStop(0, "#0B2545");
        bgGradient.addColorStop(0.5, "#091D36");
        bgGradient.addColorStop(1, "#061324");
      } else {
        bgGradient.addColorStop(0, "#05111F");
        bgGradient.addColorStop(0.45, "#071628");
        bgGradient.addColorStop(1, "#030914");
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Defence-Grade Coordinate Grid & Bathymetric Contour Lines
      ctx.save();
      ctx.lineWidth = 1;
      const gridStepX = Math.max(90, width / 12);
      const gridStepY = Math.max(70, height / 8);

      ctx.strokeStyle = "rgba(56, 189, 248, 0.035)";
      ctx.beginPath();
      for (let gx = 0; gx <= width; gx += gridStepX) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
      }
      for (let gy = 0; gy <= height; gy += gridStepY) {
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
      }
      ctx.stroke();

      // Subtle nautical crosshairs
      ctx.fillStyle = "rgba(45, 212, 191, 0.08)";
      for (let gx = gridStepX; gx < width; gx += gridStepX * 2) {
        for (let gy = gridStepY; gy < height * 0.7; gy += gridStepY * 2) {
          ctx.fillRect(gx - 3, gy, 7, 1);
          ctx.fillRect(gx, gy - 3, 1, 7);
        }
      }
      ctx.restore();

      // 3. Render Bathymetric Marine Wave Layers
      waveLayers.forEach((layer) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);

        const sampleStep = 6;
        for (let x = 0; x <= width + sampleStep; x += sampleStep) {
          const y = getWaveY(x, layer, time, mX, mY);
          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Fill with deep ocean gradient
        const waveFill = ctx.createLinearGradient(0, height * (layer.baseYRatio - 0.2), 0, height);
        waveFill.addColorStop(0, layer.colorTop);
        waveFill.addColorStop(1, layer.colorBottom);
        ctx.fillStyle = waveFill;
        ctx.fill();

        // Stroke with clean, illuminated maritime hydrographic contour line
        ctx.strokeStyle = layer.strokeColor;
        ctx.lineWidth = layer.strokeWidth;
        ctx.beginPath();
        for (let x = 0; x <= width + sampleStep; x += sampleStep) {
          const y = getWaveY(x, layer, time, mX, mY);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
      });

      // 4. Subtle Hydrographic Velocity Particles (Ocean Current Data Stream)
      ctx.save();
      particles.forEach((p) => {
        p.x += p.speed;
        p.pulsePhase += 0.03;
        if (p.x > width + 10) {
          p.x = -10;
          p.waveIndex = Math.floor(Math.random() * waveLayers.length);
        }

        const layer = waveLayers[p.waveIndex] || waveLayers[0];
        const waveY = getWaveY(p.x, layer, time, mX, mY);
        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulsePhase));

        // Particle core
        ctx.fillStyle = `rgba(45, 212, 191, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, waveY - 2, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle current tail
        ctx.strokeStyle = `rgba(56, 189, 248, ${currentAlpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - 12 * p.speed, waveY - 2);
        ctx.lineTo(p.x, waveY - 2);
        ctx.stroke();
      });
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      if (container) {
        container.removeEventListener("mousemove", onMouseMove);
        container.removeEventListener("mouseleave", onMouseLeave);
      }
    };
  }, [activeTheme, interactive, speedMultiplier]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none pointer-events-auto ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
