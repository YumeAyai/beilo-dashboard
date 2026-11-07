import { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  color: string;
  twinkleSpeed: number;
  twinkleOffset: number;
}

const STAR_COLORS = [
  '#ffffff',
  '#fff5e6',
  '#ffe4c4',
  '#ffd4a3',
  '#c9d8ff',
  '#a3b8ff',
  '#8eb8ff',
  '#d4e5ff',
];

function generateStars(count: number, seed: number): Star[] {
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const pseudoRandom = (seed: number, n: number) => {
      const x = Math.sin(seed + n * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };

    stars.push({
      x: pseudoRandom(seed, i * 3) * 100,
      y: pseudoRandom(seed, i * 3 + 1) * 100,
      size: pseudoRandom(seed, i * 3 + 2) * 2 + 0.5,
      baseOpacity: pseudoRandom(seed, i * 7 + 2) * 0.5 + 0.3,
      color:
        STAR_COLORS[
          Math.floor(pseudoRandom(seed, i * 11) * STAR_COLORS.length)
        ],
      twinkleSpeed: pseudoRandom(seed, i * 13 + 3) * 2 + 1,
      twinkleOffset:
        pseudoRandom(seed, i * 17 + 4) * Math.PI * 2,
    });
  }

  return stars;
}

export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const timeRef = useRef<number>(0);
  const isDarkRef = useRef(true);
  const moonCache = useRef<{ phase: number; ill: number; canvas: HTMLCanvasElement } | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    starsRef.current = generateStars(180, 42);

    /* =========================
       远山层叠
    ========================== */
    const drawMountainLayer = (
      peakRatio: number,
      baseY: number,
      height: number,
      color: string,
      alpha: number
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);

      const steps = Math.floor(canvas.width / 4);
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * canvas.width;
        const p = i / steps;
        const h = height * (0.3 + 0.7 * Math.sin(p * Math.PI * peakRatio) * Math.sin(p * 2.3) * 0.5 + Math.sin(p * 5.7) * 0.3);
        ctx.lineTo(x, baseY - h);
      }

      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    /* =========================
       云雾
    ========================== */
    const drawMist = (time: number, color: string, baseAlpha: number) => {
      for (let layer = 0; layer < 3; layer++) {
        const y = canvas.height * (0.55 + layer * 0.08);
        ctx.save();
        ctx.globalAlpha = baseAlpha + layer * 0.02;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 8) {
          const dy = Math.sin(x * 0.003 + time * 0.2 + layer * 2) * 18
            + Math.sin(x * 0.007 + time * 0.35) * 12;
          ctx.lineTo(x, y + dy);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    /* =========================
       飞鸟
    ========================== */
    const drawBirds = (time: number) => {
      const birdCount = 5;
      ctx.save();
      ctx.strokeStyle = 'rgba(60,70,90,0.25)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (let i = 0; i < birdCount; i++) {
        const baseX = canvas.width * (0.3 + i * 0.15);
        const baseY = canvas.height * (0.15 + i * 0.04);
        const offset = ((time * 15 + i * 80) % (canvas.width * 0.6)) - canvas.width * 0.1;
        const x = baseX + offset;
        const y = baseY + Math.sin(time * 0.5 + i) * 8;
        const wing = 6 + Math.sin(time * 3 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(x - wing, y);
        ctx.quadraticCurveTo(x - wing * 0.3, y - wing * 0.5, x, y);
        ctx.quadraticCurveTo(x + wing * 0.3, y - wing * 0.5, x + wing, y);
        ctx.stroke();
      }
      ctx.restore();
    };

    /* =========================
       北落星（白天淡雅版）
    ========================== */
    const drawDayStar = (time: number) => {
      const x = canvas.width * 0.78;
      const y = canvas.height * 0.18;
      const pulse = Math.sin(time * 0.6) * 0.06 + 1;

      const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * pulse);
      glow.addColorStop(0, 'rgba(180,200,230,0.08)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 1 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(190,210,235,0.4)';
      ctx.fill();
    };

    /* =========================
       北落星（夜间明亮版）
    ========================== */
    const drawNightStar = (time: number) => {
      const x = canvas.width * 0.78;
      const y = canvas.height * 0.18;
      const pulse = Math.sin(time * 0.6) * 0.1 + 1;

      const glow = ctx.createRadialGradient(x, y, 1, x, y, 45 * pulse);
      glow.addColorStop(0, 'rgba(200,220,255,0.25)');
      glow.addColorStop(0.4, 'rgba(150,180,240,0.08)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 45 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 2.5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      const innerGlow = ctx.createRadialGradient(x, y, 2, x, y, 8 * pulse);
      innerGlow.addColorStop(0, 'rgba(220,235,255,0.6)');
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(x, y, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
    };

    /* =========================
        月相计算
    ========================== */
    const getMoonPhaseData = () => {
      const now = new Date();
      const jd = now.getTime() / 86400000 + 2440587.5;
      const days = jd - 2451545.0;
      const synodic = 29.53058867;
      const newMoonJd = 2451550.1;

      const phase = (((jd - newMoonJd) % synodic) + synodic) % synodic / synodic;
      const illumination = 0.5 * (1 - Math.cos(phase * Math.PI * 2));

      const sunLon = (280.46 + 0.9856474 * days) % 360;
      const moonLon = (218.316 + 13.176396 * days) % 360;
      const diff = ((moonLon - sunLon + 540) % 360) - 180;
      const angle = (diff * Math.PI) / 180;

      return { phase, illumination, angle };
    };

    /* =========================
       月球渲染缓存（per-pixel 球面光照）
    ========================== */
    const renderMoonTexture = (ill: number, phaseVal: number, r: number) => {
      const keyPhase = Math.round(phaseVal * 1000);
      if (moonCache.current && moonCache.current.phase === keyPhase) {
        return moonCache.current.canvas;
      }

      const size = Math.ceil(r * 2) + 4;
      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement('canvas');
      }
      const off = offscreenRef.current;
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d')!;

      const cx = size / 2;
      const cy = size / 2;
      const img = octx.createImageData(size, size);
      const data = img.data;

      const cz = 2 * ill - 1;                          // cos(α)
      const sx = Math.sqrt(Math.max(0, 1 - cz * cz))   // sin(α)
        * (phaseVal < 0.5 ? 1 : -1);

      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const dx = px - cx;
          const dy = py - cy;
          const d2 = dx * dx + dy * dy;
          const r2 = r * r;

          const idx = (py * size + px) * 4;

          if (d2 > r2) {
            data[idx + 3] = 0; // 透明
            continue;
          }

          const z = Math.sqrt(r2 - d2);
          const nx = dx / r;
          const nz = z / r;

          const dot = nx * sx + nz * cz;

          // smoothstep 柔化 terminator
          const t = Math.max(0, Math.min(1, (dot + 0.06) / 0.12));

          // 亮面：白→灰蓝
          const lr = Math.round(246 - (1 - t) * 30);
          const lg = Math.round(245 - (1 - t) * 30);
          const lb = Math.round(251 - (1 - t) * 40);

          // 地照：暗面微弱蓝色
          const earth = 0.04 * (1 - t);
          const rVal = Math.round(lr * t + 130 * earth);
          const gVal = Math.round(lg * t + 155 * earth);
          const bVal = Math.round(lb * t + 200 * earth);

          data[idx] = rVal;
          data[idx + 1] = gVal;
          data[idx + 2] = bVal;
          data[idx + 3] = 255;
        }
      }

      octx.putImageData(img, 0, 0);
      moonCache.current = { phase: keyPhase, ill, canvas: off };
      return off;
    };

    /* =========================
       绘制月球（per-pixel 纹理 + 倾角旋转）
    ========================== */
    const drawMoon = () => {
      const x = canvas.width * 0.22;
      const y = canvas.height * 0.15;
      const r = 28;
      const { phase, illumination: ill, angle } = getMoonPhaseData();

      // 辉光（强度随月相，偏向亮面）
      const glowStrength = 0.02 + Math.pow(ill, 0.7) * 0.2;
      const glowOffset = phase < 0.5 ? -r * 0.22 : r * 0.22;
      const glow = ctx.createRadialGradient(
        x + glowOffset, y, r * 0.15,
        x + glowOffset, y, r * 2.4
      );
      glow.addColorStop(0, `rgba(210,220,255,${glowStrength})`);
      glow.addColorStop(0.45, `rgba(170,190,255,${glowStrength * 0.35})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // 贴 per-pixel 月球纹理
      const tex = renderMoonTexture(ill, phase, r);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-angle);
      ctx.drawImage(tex, -tex.width / 2, -tex.height / 2);
      ctx.restore();

      // 边缘高光
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + ill * 0.06})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    };

    /* =========================
       夜间星星
    ========================== */
    const drawStar = (star: Star, time: number) => {
      const sx = (star.x / 100) * canvas.width;
      const sy = (star.y / 100) * canvas.height;

      const twinkle =
        Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
      const opacity = star.baseOpacity * twinkle;

      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    /* =========================
       动画
    ========================== */
    const animate = () => {
      timeRef.current += 0.016;

      const currentIsDark = isDarkRef.current;

      if (currentIsDark) {
        /* 夜间 - 星空山水 */

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#080a18');
        gradient.addColorStop(0.3, '#0c1028');
        gradient.addColorStop(0.6, '#0e1430');
        gradient.addColorStop(1, '#0a0e24');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 星场（先画，山会自然遮盖下方星空）
        starsRef.current.forEach(star =>
          drawStar(star, timeRef.current)
        );

        // 远山剪影（不透明，遮盖山后星空）
        drawMountainLayer(2.8, canvas.height * 0.68, canvas.height * 0.22, '#33435c', 1);
        drawMountainLayer(3.2, canvas.height * 0.62, canvas.height * 0.18, '#3e4f6f', 0.7);
        drawMountainLayer(3.6, canvas.height * 0.57, canvas.height * 0.14, '#141d35', 0.6);

        // 夜间薄雾
        drawMist(timeRef.current, '#101830', 0.06);

        // 星月（最上层，遮盖背后星星）
        drawMoon();
        drawNightStar(timeRef.current);
      } else {
        /* 白天 - 中国山水 */

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#e8ecf2');
        gradient.addColorStop(0.3, '#dce2ec');
        gradient.addColorStop(0.6, '#d0d8e4');
        gradient.addColorStop(1, '#c8d0dc');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 远山层叠（近深远浅）
        drawMountainLayer(2.8, canvas.height * 0.68, canvas.height * 0.22, '#b0bcc8', 0.35);
        drawMountainLayer(3.2, canvas.height * 0.62, canvas.height * 0.18, '#c0c8d4', 0.28);
        drawMountainLayer(3.6, canvas.height * 0.57, canvas.height * 0.14, '#d0d6e0', 0.2);

        drawMist(timeRef.current, '#ffffff', 0.07);
        drawBirds(timeRef.current);
        drawDayStar(timeRef.current);
      }

      animationRef.current = requestAnimationFrame(
        animate
      );
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </Box>
  );
}