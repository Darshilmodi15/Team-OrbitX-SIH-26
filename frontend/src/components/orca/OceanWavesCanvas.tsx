import React, { useEffect, useRef } from "react";

interface WaveLayer {
  amplitude: number;
  baseHeightRatio: number; // 0 (top) to 1 (bottom)
  frequency: number;
  speed: number;
  phase: number;
  colorStart: string;
  colorEnd: string;
  crestColor?: string;
  crestLineWidth?: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseYRatio: number;
  speedX: number;
  phase: number;
  alpha: number;
  pulseSpeed: number;
}

interface OceanWavesCanvasProps {
  className?: string;
  interactive?: boolean;
  showParticles?: boolean;
  showFoamCrests?: boolean;
  speedMultiplier?: number;
  amplitudeMultiplier?: number;
  style?: React.CSSProperties;
}

export const OceanWavesCanvas: React.FC<OceanWavesCanvasProps> = ({
  className = "",
  interactive = true,
  showParticles = true,
  showFoamCrests = true,
  speedMultiplier = 1,
  amplitudeMultiplier = 1,
  style,
}) => {
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
    const onMotionPreferenceChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", onMotionPreferenceChange);

    // Wave layers with realistic marine oceanic depth colors
    const waveLayers: WaveLayer[] = [
      // 1. Deep Abyssal Swell (Bottom background, slow, deep navy/indigo)
      {
        amplitude: 45 * amplitudeMultiplier,
        baseHeightRatio: 0.52,
        frequency: 0.0018,
        speed: 0.006 * speedMultiplier,
        phase: 0,
        colorStart: "rgba(10, 28, 54, 0.95)",
        colorEnd: "rgba(7, 20, 40, 1.0)",
        opacity: 0.85,
      },
      // 2. Mid-ocean deep current (navy-teal blend)
      {
        amplitude: 38 * amplitudeMultiplier,
        baseHeightRatio: 0.58,
        frequency: 0.0028,
        speed: 0.011 * speedMultiplier,
        phase: 2.1,
        colorStart: "rgba(12, 53, 88, 0.75)",
        colorEnd: "rgba(8, 38, 68, 0.9)",
        crestColor: "rgba(56, 189, 248, 0.25)",
        crestLineWidth: 1.5,
        opacity: 0.7,
      },
      // 3. Dynamic Coastal Surge (rich marine teal / cyan)
      {
        amplitude: 32 * amplitudeMultiplier,
        baseHeightRatio: 0.65,
        frequency: 0.0038,
        speed: 0.016 * speedMultiplier,
        phase: 4.3,
        colorStart: "rgba(14, 116, 144, 0.55)",
        colorEnd: "rgba(15, 76, 117, 0.85)",
        crestColor: "rgba(45, 212, 191, 0.45)",
        crestLineWidth: 1.5,
        opacity: 0.65,
      },
      // 4. Surface Wave (vibrant aqua/emerald highlights & crests)
      {
        amplitude: 24 * amplitudeMultiplier,
        baseHeightRatio: 0.73,
        frequency: 0.0052,
        speed: 0.022 * speedMultiplier,
        phase: 1.5,
        colorStart: "rgba(20, 184, 166, 0.4)",
        colorEnd: "rgba(13, 148, 136, 0.7)",
        crestColor: "rgba(125, 211, 252, 0.85)",
        crestLineWidth: 2.0,
        opacity: 0.5,
      },
      // 5. Foreground Tidal Ripples (fast, light luminous foam crest)
      {
        amplitude: 16 * amplitudeMultiplier,
        baseHeightRatio: 0.82,
        frequency: 0.0075,
        speed: 0.028 * speedMultiplier,
        phase: 5.2,
        colorStart: "rgba(6, 182, 212, 0.25)",
        colorEnd: "rgba(15, 118, 110, 0.55)",
        crestColor: "rgba(255, 255, 255, 0.6)",
        crestLineWidth: 1.0,
        opacity: 0.45,
      },
    ];

    // Bioluminescent & sea-foam ambient floating particles
    const particleCount = showParticles ? 35 : 0;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random(),
        y: 0,
        radius: 0.8 + Math.random() * 1.8,
        baseYRatio: 0.48 + Math.random() * 0.45,
        speedX: 0.0002 + Math.random() * 0.0006,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.2 + Math.random() * 0.6,
        pulseSpeed: 0.02 + Math.random() * 0.04,
      });
    }

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

    // Use ResizeObserver for responsive canvas sizing
    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    resize();

    // IntersectionObserver to pause rendering when out of viewport
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) {
      intersectionObserver.observe(containerRef.current);
    }

    // Handle mouse movement for interactive swells
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

    // Render loop
    const render = () => {
      if (!isVisible || width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      if (!isReducedMotion) {
        time += 1;
      }

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Atmospheric deep ocean gradient background base
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "rgba(8, 22, 45, 1)");
      bgGrad.addColorStop(0.5, "rgba(10, 31, 60, 1)");
      bgGrad.addColorStop(1, "rgba(5, 18, 38, 1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient radial lighting (simulating sunlight or moonbeam piercing water)
      const lightX = width * (0.3 + mouseRef.current.x * 0.4);
      const lightY = height * 0.25;
      const radialGlow = ctx.createRadialGradient(lightX, lightY, 10, lightX, lightY, width * 0.7);
      radialGlow.addColorStop(0, "rgba(45, 212, 191, 0.15)");
      radialGlow.addColorStop(0.4, "rgba(14, 116, 144, 0.08)");
      radialGlow.addColorStop(1, "rgba(10, 28, 54, 0)");
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw each wave layer
      waveLayers.forEach((layer, index) => {
        ctx.save();
        ctx.beginPath();

        const baseHeight = height * layer.baseHeightRatio;
        const currentPhase = layer.phase + time * layer.speed;

        // Interaction effect: slight wave peak near mouse X
        const mouseDistortion = (xNorm: number) => {
          if (!mouseRef.current.active) return 0;
          const dist = Math.abs(xNorm - mouseRef.current.x);
          return Math.max(0, 1 - dist * 3.5) * 14 * (index % 2 === 0 ? 1 : -0.8);
        };

        // Start from bottom-left
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);

        // Step through horizontal slices
        const step = 8;
        for (let x = 0; x <= width + step; x += step) {
          const xNorm = x / width;

          // Trochoidal / multi-harmonic wave formula
          // Primary wave + secondary harmonic for realistic swell steepness
          const h1 = Math.sin(x * layer.frequency + currentPhase);
          const h2 = Math.sin(x * layer.frequency * 2.1 - currentPhase * 0.6) * 0.35;
          const h3 = Math.cos(x * layer.frequency * 0.5 + currentPhase * 1.2) * 0.2;

          // Sharpen the wave crests (trochoidal approximation)
          const harmonicSum = (h1 + h2 + h3) / 1.55;
          const crestSharpen = Math.pow(Math.abs(harmonicSum), 1.2) * Math.sign(harmonicSum);

          const y = baseHeight + crestSharpen * layer.amplitude + mouseDistortion(xNorm);

          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Close path to bottom-right and bottom-left
        ctx.lineTo(width, height);
        ctx.closePath();

        // Fill with vertical ocean gradient
        const waveGrad = ctx.createLinearGradient(0, baseHeight - layer.amplitude, 0, height);
        waveGrad.addColorStop(0, layer.colorStart);
        waveGrad.addColorStop(1, layer.colorEnd);

        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Draw luminous crest highlight line
        if (showFoamCrests && layer.crestColor) {
          ctx.beginPath();
          for (let x = 0; x <= width + step; x += step) {
            const xNorm = x / width;
            const h1 = Math.sin(x * layer.frequency + currentPhase);
            const h2 = Math.sin(x * layer.frequency * 2.1 - currentPhase * 0.6) * 0.35;
            const h3 = Math.cos(x * layer.frequency * 0.5 + currentPhase * 1.2) * 0.2;
            const harmonicSum = (h1 + h2 + h3) / 1.55;
            const crestSharpen = Math.pow(Math.abs(harmonicSum), 1.2) * Math.sign(harmonicSum);
            const y = baseHeight + crestSharpen * layer.amplitude + mouseDistortion(xNorm);

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.strokeStyle = layer.crestColor;
          ctx.lineWidth = layer.crestLineWidth || 1.5;
          ctx.stroke();
        }

        ctx.restore();
      });

      // Floating bio-luminescent sea particles & foam glimmers
      if (showParticles && particles.length > 0) {
        particles.forEach((p) => {
          p.x = (p.x + p.speedX) % 1;
          const pixelX = p.x * width;
          const wavePhase = time * 0.015 + p.phase;
          const waveOffset = Math.sin(pixelX * 0.004 + wavePhase) * 18;
          const pixelY = height * p.baseYRatio + waveOffset;

          const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time * p.pulseSpeed + p.phase));

          ctx.save();
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(165, 243, 252, ${currentAlpha})`;
          ctx.shadowColor = "rgba(45, 212, 191, 0.8)";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mediaQuery.removeEventListener("change", onMotionPreferenceChange);
      if (containerEl && interactive) {
        containerEl.removeEventListener("mousemove", handleMouseMove);
        containerEl.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [interactive, showParticles, showFoamCrests, speedMultiplier, amplitudeMultiplier]);

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
