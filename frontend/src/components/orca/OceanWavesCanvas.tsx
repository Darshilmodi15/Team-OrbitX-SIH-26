import React, { useEffect, useRef } from "react";

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

export const OceanWavesCanvas: React.FC<OceanWavesCanvasProps> = ({
  className = "",
  interactive = true,
  showBoats = true,
  showFisherman = true,
  showBirds = true,
  showSunGlint = true,
  speedMultiplier = 1,
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
    const onMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", onMotionChange);

    // Birds setup
    const birds: Bird[] = [];
    if (showBirds) {
      for (let i = 0; i < 5; i++) {
        birds.push({
          x: Math.random(),
          y: 0.08 + Math.random() * 0.18,
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
      x: 0.15,
      speedX: 0.00008,
      baseYRatio: 0.44,
    };

    // Fishing Boat state (riding primary swell)
    const fishingBoat = {
      xRatio: 0.68, // position on screen
      targetXRatio: 0.68,
      speedBob: 0,
      pitch: 0,
      netSwingPhase: 0,
    };

    // Navigational Buoy state
    const buoy = {
      xRatio: 0.22,
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

    // Analytical Wave Height & Slope Functions
    // Layer 1: Distant Ocean Swell
    const getWaveDistant = (xNorm: number, t: number) => {
      const freq = 12.0;
      const speed = 0.008 * speedMultiplier;
      const h1 = Math.sin(xNorm * freq + t * speed);
      const h2 = Math.cos(xNorm * freq * 1.8 - t * speed * 0.7) * 0.3;
      const y = (h1 + h2) * 8;
      const slope = (Math.cos(xNorm * freq + t * speed) * freq * 8) / width;
      return { y, slope };
    };

    // Layer 2: Mid-Ocean Swell (Where Cargo Ship sits)
    const getWaveMid = (xNorm: number, t: number) => {
      const freq = 8.5;
      const speed = 0.012 * speedMultiplier;
      const h1 = Math.sin(xNorm * freq + t * speed + 1.2);
      const h2 = Math.cos(xNorm * freq * 2.2 - t * speed * 0.8) * 0.35;
      const y = (h1 + h2) * 16;
      const slope = (Math.cos(xNorm * freq + t * speed + 1.2) * freq * 16) / width;
      return { y, slope };
    };

    // Layer 3: Main Dynamic Wave (Where Fishing Boat rides)
    const getWaveMain = (xNorm: number, t: number) => {
      const freq1 = 6.2;
      const freq2 = 12.8;
      const speed1 = 0.018 * speedMultiplier;
      const speed2 = 0.011 * speedMultiplier;

      // Mouse swell interaction
      let mouseAdd = 0;
      let mouseSlope = 0;
      if (mouseRef.current.active) {
        const dist = xNorm - mouseRef.current.x;
        const influence = Math.exp(-dist * dist * 32);
        mouseAdd = influence * 16 * Math.sin(t * 0.04);
        mouseSlope = -2 * dist * 32 * influence * 16 * Math.sin(t * 0.04);
      }

      const s1 = Math.sin(xNorm * freq1 + t * speed1);
      const s2 = Math.sin(xNorm * freq2 - t * speed2 + 2.4) * 0.38;
      const s3 = Math.cos(xNorm * 3.1 + t * 0.007) * 0.22;

      // Trochoidal sharpening
      const combined = (s1 + s2 + s3) / 1.6;
      const sharpened = Math.pow(Math.abs(combined), 1.25) * Math.sign(combined);
      const y = sharpened * 28 + mouseAdd;

      const deriv =
        (Math.cos(xNorm * freq1 + t * speed1) * freq1 * 28 +
          Math.cos(xNorm * freq2 - t * speed2 + 2.4) * freq2 * 0.38 * 28) /
        width;
      const slope = deriv + mouseSlope / width;

      return { y, slope, raw: sharpened };
    };

    // Layer 4: Foreground Coastal Breakers
    const getWaveForeground = (xNorm: number, t: number) => {
      const freq = 7.8;
      const speed = 0.025 * speedMultiplier;
      const h1 = Math.sin(xNorm * freq + t * speed + 4.1);
      const h2 = Math.cos(xNorm * freq * 1.9 - t * speed * 1.1) * 0.4;
      const combined = (h1 + h2) / 1.4;
      const sharpened = Math.pow(Math.abs(combined), 1.3) * Math.sign(combined);
      const y = sharpened * 24;
      const slope = (Math.cos(xNorm * freq + t * speed + 4.1) * freq * 24) / width;
      return { y, slope, raw: sharpened };
    };

    // Draw a stylized 2D Traditional Coastal Fishing Boat with Fisherman & Net
    const drawFishingBoat = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      pitch: number,
      time: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pitch * 0.85); // Realistic rotational pitch

      const scale = Math.max(0.65, Math.min(width / 1100, 1.15));
      ctx.scale(scale, scale);

      // Boat Shadow on water
      ctx.fillStyle = "rgba(4, 18, 38, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 48, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1. Boat Hull
      ctx.beginPath();
      ctx.moveTo(-45, -2);
      ctx.bezierCurveTo(-42, 16, -20, 20, 0, 20);
      ctx.bezierCurveTo(28, 20, 48, 12, 54, -4);
      ctx.lineTo(44, -5);
      ctx.bezierCurveTo(20, -7, -20, -7, -45, -2);
      ctx.closePath();

      const hullGrad = ctx.createLinearGradient(0, -6, 0, 20);
      hullGrad.addColorStop(0, "#0e7490"); // Marine cyan upper hull
      hullGrad.addColorStop(0.4, "#0f172a"); // Deep navy hull body
      hullGrad.addColorStop(1, "#020617"); // Dark keel
      ctx.fillStyle = hullGrad;
      ctx.fill();

      // Hull Stripe (Safety orange/amber maritime stripe)
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-40, 2);
      ctx.bezierCurveTo(-15, 6, 20, 6, 48, -1);
      ctx.stroke();

      // White Waterline trim
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-42, -1);
      ctx.bezierCurveTo(-15, -4, 20, -4, 50, -4);
      ctx.stroke();

      // 2. Cabin / Deck Wheelhouse
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-22, -18, 22, 14);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-20, -16, 18, 10);

      // Cabin Windows (Glowing warm light)
      ctx.fillStyle = "rgba(254, 240, 138, 0.85)";
      ctx.shadowColor = "rgba(250, 204, 21, 0.7)";
      ctx.shadowBlur = 8;
      ctx.fillRect(-18, -14, 6, 6);
      ctx.fillRect(-9, -14, 6, 6);
      ctx.shadowBlur = 0;

      // 3. Mast & Rigging
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(8, -48); // Main Mast
      ctx.stroke();

      // Crossbar
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(16, -36);
      ctx.stroke();

      // Rigging lines
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

      // Warm Mast Lantern (ORCA Nav light)
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(8, -49, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Indian Flag / Maritime Pennant
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(8, -46);
      ctx.lineTo(18 + Math.sin(time * 0.06) * 2, -44);
      ctx.lineTo(8, -40);
      ctx.fill();

      // 4. Fisherman Silhouette
      if (showFisherman) {
        // Fisherman standing near bow/rigging
        ctx.fillStyle = "#0f172a";

        // Legs & torso
        ctx.beginPath();
        ctx.moveTo(22, -5);
        ctx.lineTo(26, -18);
        ctx.lineTo(31, -18);
        ctx.lineTo(33, -5);
        ctx.fill();

        // Torso & raincoat
        ctx.fillStyle = "#0284c7"; // Blue/Teal windcheater
        ctx.beginPath();
        ctx.roundRect(24, -24, 9, 10, 2);
        ctx.fill();

        // Fisherman Head with conical / sailor hat
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(28.5, -27, 3, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(24, -28);
        ctx.lineTo(28.5, -33);
        ctx.lineTo(33, -28);
        ctx.closePath();
        ctx.fill();

        // Arms holding Fishing Line / Rod
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(26, -20);
        ctx.lineTo(35, -22);
        ctx.lineTo(42, -26);
        ctx.stroke();

        // Fishing Rod
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(38, -20);
        ctx.lineTo(62, -38);
        ctx.stroke();

        // Fishing Line extending into ocean with dynamic sway
        const lineSway = Math.sin(time * 0.05) * 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(62, -38);
        ctx.bezierCurveTo(72, -18, 76 + lineSway, 0, 78 + lineSway, 16);
        ctx.stroke();

        // Fishing Float / Bobber in the water
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(78 + lineSway, 16, 2, 0, Math.PI * 2);
        ctx.fill();

        // Float ripple circles
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(78 + lineSway, 17, 5 + Math.sin(time * 0.08) * 2, 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Draw Distant Cargo Ship on horizon
    const drawCargoShip = (ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      const shipScale = Math.max(0.4, Math.min(width / 1600, 0.7));
      ctx.scale(shipScale, shipScale);

      // Distant silhouette with atmospheric fog fade
      ctx.fillStyle = "rgba(15, 33, 58, 0.75)";

      // Hull
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(-50, 8);
      ctx.lineTo(48, 8);
      ctx.lineTo(58, 0);
      ctx.closePath();
      ctx.fill();

      // Containers stack
      ctx.fillStyle = "rgba(20, 48, 82, 0.65)";
      ctx.fillRect(-35, -10, 60, 10);
      ctx.fillRect(-28, -16, 45, 6);

      // Bridge / Superstructure at stern
      ctx.fillStyle = "rgba(15, 33, 58, 0.8)";
      ctx.fillRect(-52, -18, 14, 18);
      ctx.fillRect(-49, -24, 8, 6);

      // Radar Mast & Red/Green beacon
      ctx.strokeStyle = "rgba(30, 64, 100, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-45, -24);
      ctx.lineTo(-45, -32);
      ctx.stroke();

      // Blinking navigation mast light
      if (Math.sin(time * 0.08) > 0) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-45, -33, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Small wake behind cargo ship
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-60, 6);
      ctx.lineTo(-85, 8);
      ctx.stroke();

      ctx.restore();
    };

    // Draw Sea Marker Buoy
    const drawBuoy = (ctx: CanvasRenderingContext2D, cx: number, cy: number, pitch: number, time: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pitch * 0.7);
      const scale = Math.max(0.5, Math.min(width / 1300, 0.9));
      ctx.scale(scale, scale);

      // Buoy Body (Conical flotation base)
      ctx.fillStyle = "#e11d48"; // Maritime safety red
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(8, 4);
      ctx.lineTo(5, -12);
      ctx.lineTo(-5, -12);
      ctx.closePath();
      ctx.fill();

      // Base ring
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(0, 4, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top cage / solar beacon mast
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(0, -22);
      ctx.lineTo(4, -12);
      ctx.stroke();

      // Flashing Emerald/Green Beacon
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

      // Ripple rings around buoy base
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 5, 14 + Math.sin(time * 0.05) * 3, 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    // Draw Seagulls in flight
    const drawBird = (ctx: CanvasRenderingContext2D, b: Bird) => {
      ctx.save();
      const px = b.x * width;
      const py = b.y * height;
      const wingY = Math.sin(b.wingPhase) * (b.size * 0.5);

      ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";

      ctx.beginPath();
      // Left Wing
      ctx.moveTo(px - b.size, py + wingY);
      ctx.quadraticCurveTo(px - b.size * 0.4, py - b.size * 0.3, px, py);
      // Right Wing
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

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // 1. SKY / HORIZON GRADIENT BASE
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "rgba(5, 18, 38, 1)");
      skyGrad.addColorStop(0.35, "rgba(8, 30, 58, 1)");
      skyGrad.addColorStop(0.55, "rgba(10, 42, 75, 1)");
      skyGrad.addColorStop(1, "rgba(4, 15, 32, 1)");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. SUN / MOON GLOW & HORIZON LIGHTING
      const sunX = width * 0.72;
      const sunY = height * 0.28;

      // Soft sun disk
      const sunDisk = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.4);
      sunDisk.addColorStop(0, "rgba(56, 189, 248, 0.22)");
      sunDisk.addColorStop(0.2, "rgba(45, 212, 191, 0.12)");
      sunDisk.addColorStop(0.6, "rgba(14, 116, 144, 0.05)");
      sunDisk.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = sunDisk;
      ctx.fillRect(0, 0, width, height);

      // 3. SUNLIGHT WATER SPECULAR COLUMN REFLECTION
      if (showSunGlint) {
        const glintGrad = ctx.createLinearGradient(sunX - 120, 0, sunX + 120, 0);
        glintGrad.addColorStop(0, "rgba(45, 212, 191, 0)");
        glintGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
        glintGrad.addColorStop(1, "rgba(45, 212, 191, 0)");
        ctx.fillStyle = glintGrad;
        ctx.fillRect(sunX - 120, height * 0.4, 240, height * 0.6);
      }

      // 4. DRAW SEAGULLS
      if (showBirds) {
        birds.forEach((b) => {
          b.x = (b.x + b.speedX) % 1.1;
          b.y += b.speedY;
          if (b.y < 0.05 || b.y > 0.32) b.speedY *= -1;
          b.wingPhase += b.wingSpeed;
          drawBird(ctx, b);
        });
      }

      // 5. DISTANT HORIZON OCEAN LAYER
      const baseDistantY = height * 0.46;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseDistantY);

      const step = 6;
      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveDistant(xNorm, time);
        ctx.lineTo(x, baseDistantY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const distantGrad = ctx.createLinearGradient(0, baseDistantY - 10, 0, height);
      distantGrad.addColorStop(0, "rgba(10, 36, 68, 0.85)");
      distantGrad.addColorStop(1, "rgba(6, 20, 42, 0.95)");
      ctx.fillStyle = distantGrad;
      ctx.fill();

      // Distant Horizon Wave Crest Highlight
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 6. DISTANT CARGO SHIP
      if (showBoats) {
        cargoShip.x = (cargoShip.x + cargoShip.speedX) % 1.15;
        const shipXNorm = cargoShip.x - 0.08;
        const shipPixelX = shipXNorm * width;
        const wCargo = getWaveDistant(shipXNorm, time);
        const shipPixelY = baseDistantY + wCargo.y - 2;
        drawCargoShip(ctx, shipPixelX, shipPixelY, time);
      }

      // 7. MID-OCEAN CURRENT SWELL
      const baseMidY = height * 0.58;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseMidY);

      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveMid(xNorm, time);
        ctx.lineTo(x, baseMidY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const midGrad = ctx.createLinearGradient(0, baseMidY - 20, 0, height);
      midGrad.addColorStop(0, "rgba(12, 60, 100, 0.75)");
      midGrad.addColorStop(0.6, "rgba(10, 40, 75, 0.9)");
      midGrad.addColorStop(1, "rgba(5, 20, 42, 1.0)");
      ctx.fillStyle = midGrad;
      ctx.fill();

      // Mid-Wave Luminous Edge
      ctx.strokeStyle = "rgba(45, 212, 191, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 8. NAVIGATIONAL BUOY (Riding Mid/Main wave)
      if (showBoats) {
        const buoyWave = getWaveMain(buoy.xRatio, time);
        const buoyPixelX = buoy.xRatio * width;
        const buoyPixelY = height * 0.68 + buoyWave.y;
        buoy.pitch += (buoyWave.slope * 18 - buoy.pitch) * 0.1;
        drawBuoy(ctx, buoyPixelX, buoyPixelY, buoy.pitch, time);
      }

      // 9. MAIN DYNAMIC WAVE (Where Fishing Boat Rides)
      const baseMainY = height * 0.72;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseMainY);

      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveMain(xNorm, time);
        ctx.lineTo(x, baseMainY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const mainGrad = ctx.createLinearGradient(0, baseMainY - 30, 0, height);
      mainGrad.addColorStop(0, "rgba(14, 116, 144, 0.65)");
      mainGrad.addColorStop(0.3, "rgba(13, 148, 136, 0.85)");
      mainGrad.addColorStop(1, "rgba(8, 30, 60, 0.98)");
      ctx.fillStyle = mainGrad;
      ctx.fill();

      // Luminous Crest Outline & Foam Line
      ctx.strokeStyle = "rgba(125, 211, 252, 0.85)";
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();

      // 10. TRADITIONAL COASTAL FISHING BOAT WITH FISHERMAN
      if (showBoats) {
        // Fishing boat rides the main wave swell at fishingBoat.xRatio
        const boatWave = getWaveMain(fishingBoat.xRatio, time);
        const boatPixelX = fishingBoat.xRatio * width;
        const boatPixelY = baseMainY + boatWave.y - 4;

        // Smooth pitch interpolation based on analytical wave slope
        const targetPitch = Math.atan(boatWave.slope * 3.5);
        fishingBoat.pitch += (targetPitch - fishingBoat.pitch) * 0.12;

        drawFishingBoat(ctx, boatPixelX, boatPixelY, fishingBoat.pitch, time);

        // Generate wake foam behind boat
        if (Math.random() < 0.35) {
          foamParticles.push({
            x: boatPixelX - 35 * Math.cos(fishingBoat.pitch) + (Math.random() - 0.5) * 8,
            y: boatPixelY + 12 + (Math.random() - 0.5) * 4,
            radius: 1.2 + Math.random() * 2.5,
            alpha: 0.7,
            decay: 0.015,
          });
        }
      }

      // 11. SUB-SURFACE FISH SILHOUETTES
      fishes.forEach((f) => {
        f.x = (f.x + f.speedX) % 1.1;
        const px = f.x * width;
        const fishWave = getWaveMain(f.x, time);
        const py = height * f.baseYRatio + fishWave.y * 0.4;
        const swimY = Math.sin(time * 0.08 + f.phase) * 3;

        ctx.save();
        ctx.translate(px, py + swimY);
        ctx.fillStyle = `rgba(165, 243, 252, ${0.25 * f.depth})`;

        // Streamlined fish silhouette
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fish tail fin
        ctx.beginPath();
        const tailOsc = Math.sin(time * 0.15 + f.phase) * (f.size * 0.4);
        ctx.moveTo(-f.size * 0.8, 0);
        ctx.lineTo(-f.size * 1.4, -f.size * 0.5 + tailOsc);
        ctx.lineTo(-f.size * 1.4, f.size * 0.5 + tailOsc);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // 12. FOREGROUND COASTAL BREAKERS & TIDAL SURGE
      const baseFgY = height * 0.84;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, baseFgY);

      for (let x = 0; x <= width + step; x += step) {
        const xNorm = x / width;
        const w = getWaveForeground(xNorm, time);
        ctx.lineTo(x, baseFgY + w.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const fgGrad = ctx.createLinearGradient(0, baseFgY - 20, 0, height);
      fgGrad.addColorStop(0, "rgba(20, 184, 166, 0.45)");
      fgGrad.addColorStop(0.5, "rgba(13, 148, 136, 0.7)");
      fgGrad.addColorStop(1, "rgba(6, 24, 48, 0.95)");
      ctx.fillStyle = fgGrad;
      ctx.fill();

      // Foreground Crisp White-Water Foam Crest
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      // 13. WAKE & FOAM PARTICLES SIMULATION
      for (let i = foamParticles.length - 1; i >= 0; i--) {
        const p = foamParticles[i];
        p.alpha -= p.decay;
        p.radius += 0.05;
        p.x -= 0.3; // drift with tide

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
  }, [interactive, showBoats, showFisherman, showBirds, showSunGlint, speedMultiplier]);

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
