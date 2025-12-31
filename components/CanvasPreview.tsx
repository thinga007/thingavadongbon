
import React, { useEffect, useState, useRef } from 'react';
import { WatermarkData } from '../types';

interface CanvasPreviewProps {
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
  logo: HTMLImageElement | null;
  mapImage: HTMLImageElement | null;
  mapVideo: HTMLVideoElement | null;
  data: WatermarkData;
  configs: any;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onUpdateConfig: (element: string, key: string, value: number) => void;
  isExporting?: boolean;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ 
  image, video, logo, mapImage, mapVideo, data, configs, canvasRef, onUpdateConfig, isExporting = false
}) => {
  const [dragState, setDragState] = useState<{
    target: string | null;
    mode: 'move' | 'resize';
    handle?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Fix "Expected 1 arguments, but got 0" by providing an initial value to useRef.
  const requestRef = useRef<number | undefined>(undefined);

  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (video) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    } else if (image) {
      if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }
    } else {
      return;
    }

    const W = canvas.width;
    const H = canvas.height;
    const baseScale = W / 1000;

    // 1. Draw Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (video) {
      ctx.drawImage(video, 0, 0, W, H);
    } else if (image) {
      ctx.drawImage(image, 0, 0, W, H);
    }

    // Helper: Rounded Rect with Inner Glow & Noise
    const drawGlassPanel = (x: number, y: number, w: number, h: number, radius: number, opacity: number, showGlow = true) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      
      // Draw shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 40 * baseScale;
      ctx.shadowOffsetY = 10 * baseScale;

      // Draw Main Panel
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius * baseScale);
      
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#10172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner Stroke (Glow)
      if (showGlow) {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1.5 * baseScale;
        ctx.stroke();
      }

      // 2. Subtle Noise Texture Overlay
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 2000; i++) {
        const nx = x + Math.random() * w;
        const ny = y + Math.random() * h;
        ctx.fillStyle = '#fff';
        ctx.fillRect(nx, ny, 1, 1);
      }
      
      ctx.restore();
    };

    const drawHandles = (x: number, y: number, w: number, h: number) => {
      if (isExporting) return;
      const size = 12 * baseScale;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 * baseScale;
      const pts = [
        [x, y], [x + w/2, y], [x + w, y],
        [x, y + h/2], [x + w, y + h/2],
        [x, y + h], [x + w/2, y + h], [x + w, y + h]
      ];
      pts.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    };

    // --- RENDER MAP ---
    const mX = configs.map.x * baseScale;
    const mY = configs.map.y * baseScale;
    const mW = configs.map.w * baseScale;
    const mH = configs.map.h * baseScale;
    const mR = configs.map.borderRadius || 20;

    ctx.save();
    // Border for map
    ctx.beginPath();
    ctx.roundRect(mX - 4*baseScale, mY - 4*baseScale, mW + 8*baseScale, mH + 8*baseScale, (mR+4) * baseScale);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();

    // Map content clip
    ctx.beginPath();
    ctx.roundRect(mX, mY, mW, mH, mR * baseScale);
    ctx.clip();
    
    if (mapVideo) {
      ctx.drawImage(mapVideo, mX, mY, mW, mH);
    } else if (mapImage) {
      ctx.drawImage(mapImage, mX, mY, mW, mH);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(mX, mY, mW, mH);
    }
    ctx.restore();
    drawHandles(mX, mY, mW, mH);

    // --- RENDER INFO BOX ---
    const bX = configs.box.x * baseScale;
    const bY = configs.box.y * baseScale;
    const bW = configs.box.w * baseScale;
    const bH = configs.box.h * baseScale;
    const bR = configs.box.borderRadius || 24;

    drawGlassPanel(bX, bY, bW, bH, bR, configs.box.opacity);

    // Dynamic HUD Accents (Camera brackets)
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3 * baseScale;
    const gap = 15 * baseScale;
    const len = 40 * baseScale;
    // TL
    ctx.beginPath(); ctx.moveTo(bX + gap, bY + gap + len); ctx.lineTo(bX + gap, bY + gap); ctx.lineTo(bX + gap + len, bY + gap); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(bX + bW - gap, bY + bH - gap - len); ctx.lineTo(bX + bW - gap, bY + bH - gap); ctx.lineTo(bX + bW - gap - len, bY + bH - gap); ctx.stroke();
    ctx.restore();

    // Separator line
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(bX + 25*baseScale, bY + (bH * 0.35), bW - 50*baseScale, 2 * baseScale);

    const drawText = (text: string, dx: number, dy: number, font: string, color: string, elementSpacing: number = 0) => {
      ctx.save();
      // Professional Drop Shadow for text
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4 * baseScale;
      ctx.shadowOffsetX = 2 * baseScale;
      ctx.shadowOffsetY = 2 * baseScale;
      ctx.fillStyle = color;
      ctx.font = font;
      
      const xPos = bX + dx * baseScale;
      const yPos = bY + dy * baseScale;

      if (elementSpacing !== 0) {
        const chars = text.split('');
        let currentX = xPos;
        const spacingVal = elementSpacing * baseScale;
        for (let i = 0; i < chars.length; i++) {
          ctx.fillText(chars[i], currentX, yPos);
          currentX += ctx.measureText(chars[i]).width + spacingVal;
        }
      } else {
        ctx.fillText(text, xPos, yPos);
      }
      ctx.restore();
    };

    // Logo
    const logoSize = 100 * configs.logo.scale * baseScale;
    const lx = bX + configs.logo.dx * baseScale;
    const ly = bY + configs.logo.dy * baseScale;
    if (logo) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(lx, ly, logoSize, logoSize, 12 * baseScale);
        ctx.clip();
        ctx.drawImage(logo, lx, ly, logoSize, logoSize);
        ctx.restore();
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(lx, ly, logoSize, logoSize, 12 * baseScale);
        ctx.fill();
    }

    // Content
    drawText(data.unitName.toUpperCase(), configs.unitName.dx, configs.unitName.dy, `bold ${36 * configs.unitName.scale * baseScale}px "Roboto Condensed"`, '#fbbf24', configs.unitName.letterSpacing);
    drawText(data.task, configs.task.dx, configs.task.dy, `bold ${26 * configs.task.scale * baseScale}px "Roboto Condensed"`, '#FFFFFF', configs.task.letterSpacing);
    drawText(data.time, configs.time.dx, configs.time.dy, `bold ${100 * configs.time.scale * baseScale}px "Roboto Condensed"`, '#fbbf24', configs.time.letterSpacing);

    const dCfg = configs.date;
    const dSpacing = dCfg.letterSpacing || 0;
    if (data.dateMode === '2-row') {
      const p = data.date.split(', ');
      drawText(p[0] || "", dCfg.dx, dCfg.dy - 35, `bold ${34 * dCfg.scale * baseScale}px "Roboto Condensed"`, '#FFFFFF', dSpacing);
      drawText(p[1] || "", dCfg.dx, dCfg.dy, `400 ${30 * dCfg.scale * baseScale}px "Roboto Condensed"`, '#cbd5e1', dSpacing);
    } else {
      drawText(data.date, dCfg.dx, dCfg.dy, `bold ${32 * dCfg.scale * baseScale}px "Roboto Condensed"`, '#FFFFFF', dSpacing);
    }

    [configs.info1, configs.info2, configs.info3].forEach((cfg, i) => {
      const text = (data as any)[`info${i+1}`];
      if (!text) return;
      const ix = bX + cfg.dx * baseScale;
      const iy = bY + cfg.dy * baseScale;
      // Location dot
      ctx.beginPath();
      ctx.arc(ix + 6*baseScale, iy - 10*baseScale, 6*baseScale, 0, Math.PI*2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      drawText(text, cfg.dx + 28, cfg.dy, `400 ${24 * cfg.scale * baseScale}px "Roboto Condensed"`, '#FFFFFF', cfg.letterSpacing);
    });

    drawHandles(bX, bY, bW, bH);

    // Verified ID
    ctx.save();
    ctx.globalAlpha = configs.id.opacity;
    ctx.translate(configs.id.x * baseScale, configs.id.y * baseScale);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${22 * configs.id.scale * baseScale}px monospace`;
    ctx.fillText(data.id, 0, 0);
    ctx.restore();

    // App Branding
    const brandingX = W - 40 * baseScale;
    const brandingY = H - 60 * baseScale;
    ctx.textAlign = 'right';
    ctx.font = `bold ${24 * baseScale}px "Roboto Condensed"`;
    ctx.fillStyle = '#fff';
    ctx.fillText("mark", brandingX, brandingY);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText("Time", brandingX - ctx.measureText("mark").width, brandingY);

    if (video || mapVideo) {
      requestRef.current = requestAnimationFrame(renderFrame);
    }
  };

  useEffect(() => {
    if (video || mapVideo) {
      requestRef.current = requestAnimationFrame(renderFrame);
    } else {
      renderFrame();
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [image, video, logo, mapImage, mapVideo, data, configs, isExporting]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const f = canvas.width / rect.width;
    return { x: (cx - rect.left) * f, y: (cy - rect.top) * f };
  };

  const handleStart = (e: any) => {
    if (isExporting) return;
    const p = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const baseScale = canvas.width / 1000;

    const hitTest = (target: string, x: number, y: number, w: number, h: number) => {
      const handles = [
        { id: 'tl', x, y }, { id: 'tm', x: x + w/2, y }, { id: 'tr', x: x + w, y },
        { id: 'ml', x, y: y + h/2 }, { id: 'mr', x: x + w, y: y + h/2 },
        { id: 'bl', x, y: y + h }, { id: 'bm', x: x + w/2, y: y + h }, { id: 'br', x: x + w, y: y + h }
      ];
      const hHandle = handles.find(h => Math.hypot(p.x - h.x, p.y - h.y) < 30 * baseScale);
      if (hHandle) return { mode: 'resize', handle: hHandle.id };
      if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return { mode: 'move' };
      return null;
    };

    const mapHit = hitTest('map', configs.map.x * baseScale, configs.map.y * baseScale, configs.map.w * baseScale, configs.map.h * baseScale);
    const boxHit = hitTest('box', configs.box.x * baseScale, configs.box.y * baseScale, configs.box.w * baseScale, configs.box.h * baseScale);
    const idHit = Math.hypot(p.x - configs.id.x * baseScale, p.y - configs.id.y * baseScale) < 150 * baseScale ? { mode: 'move' } : null;

    let target = mapHit ? 'map' : (boxHit ? 'box' : (idHit ? 'id' : null));
    let hit = mapHit || boxHit || idHit;

    if (target && hit) {
      setDragState({
        target,
        mode: hit.mode as any,
        handle: (hit as any).handle,
        startX: p.x,
        startY: p.y,
        initialX: (configs as any)[target].x,
        initialY: (configs as any)[target].y,
        initialW: (configs as any)[target].w || 0,
        initialH: (configs as any)[target].h || 0,
      });
    }
  };

  const handleMove = (e: any) => {
    if (!dragState || isExporting) return;
    const p = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const baseScale = canvas.width / 1000;
    
    const dx = (p.x - dragState.startX) / baseScale;
    const dy = (p.y - dragState.startY) / baseScale;
    const target = dragState.target!;

    if (dragState.mode === 'move') {
      onUpdateConfig(target, 'x', dragState.initialX + dx);
      onUpdateConfig(target, 'y', dragState.initialY + dy);
    } else {
      let nw = dragState.initialW;
      let nh = dragState.initialH;
      let nx = dragState.initialX;
      let ny = dragState.initialY;

      if (dragState.handle?.includes('r')) nw += dx;
      if (dragState.handle?.includes('b')) nh += dy;
      if (dragState.handle?.includes('l')) { nx += dx; nw -= dx; }
      if (dragState.handle?.includes('t')) { ny += dy; nh -= dy; }

      onUpdateConfig(target, 'x', nx);
      onUpdateConfig(target, 'y', ny);
      onUpdateConfig(target, 'w', Math.max(100, nw));
      onUpdateConfig(target, 'h', Math.max(100, nh));
    }
  };

  const handleEnd = () => setDragState(null);

  return (
    <canvas 
      ref={canvasRef} 
      onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
      className={`block cursor-crosshair touch-none ${isExporting ? 'pointer-events-none' : ''}`}
    />
  );
};

export default CanvasPreview;
