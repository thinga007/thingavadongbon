
import React, { useEffect, useState, useRef } from 'react';
import { WatermarkData, INITIAL_CONFIGS } from '../types';

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

  const requestRef = useRef<number | undefined>(undefined);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const COLORS = {
    YELLOW: '#f8ef1c',
    ORANGE_YELLOW: '#FFB800', 
    WHITE: '#FFFFFF',
    RED_DOT: '#ef4444'
  };

  useEffect(() => {
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !fontsLoaded) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (video) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      }
    } else if (image) {
      if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      }
    } else return;

    const W = canvas.width; const H = canvas.height;
    const baseScale = W / 1000;

    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (video) ctx.drawImage(video, 0, 0, W, H);
    else if (image) ctx.drawImage(image, 0, 0, W, H);

    const drawHandles = (x: number, y: number, w: number, h: number) => {
      if (isExporting) return;
      const size = 12 * baseScale;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2 * baseScale;
      
      // Vẽ handles: 4 góc + 4 cạnh
      const pts = [
        [x, y], [x + w, y], [x, y + h], [x + w, y + h], // Góc
        [x + w/2, y], [x + w/2, y + h], // Trên, dưới (giữa)
        [x, y + h/2], [x + w, y + h/2]  // Trái, phải (giữa)
      ];
      
      pts.forEach(([px, py]) => {
        ctx.beginPath(); ctx.arc(px, py, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    };

    // --- MAP ---
    if (mapImage || mapVideo) {
      const mX = configs.map.x * baseScale; const mY = configs.map.y * baseScale;
      const mW = configs.map.w * baseScale; const mH = configs.map.h * baseScale;
      const mR = (configs.map.borderRadius || 5) * baseScale;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(mX - 2*baseScale, mY - 2*baseScale, mW + 4*baseScale, mH + 4*baseScale, mR + 2*baseScale);
      ctx.fillStyle = 'white'; ctx.fill();
      ctx.beginPath(); ctx.roundRect(mX, mY, mW, mH, mR); ctx.clip();
      if (mapVideo) ctx.drawImage(mapVideo, mX, mY, mW, mH);
      else if (mapImage) ctx.drawImage(mapImage, mX, mY, mW, mH);
      ctx.restore();
      drawHandles(mX, mY, mW, mH);
    }

    // --- INFO BOX ---
    const bX = configs.box.x * baseScale; const bY = configs.box.y * baseScale;
    const bW = configs.box.w * baseScale; const bH = configs.box.h * baseScale;
    const bR = (configs.box.borderRadius || 8) * baseScale;
    const contentScaleFactor = bW / (450 * baseScale);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 15 * baseScale;
    ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, bR);
    const boxGrad = ctx.createLinearGradient(bX, bY, bX, bY + bH);
    boxGrad.addColorStop(0, `rgba(30, 58, 138, ${configs.box.opacity})`); 
    boxGrad.addColorStop(1, `rgba(37, 99, 235, ${configs.box.opacity})`); 
    ctx.fillStyle = boxGrad; ctx.fill();
    ctx.restore();

    // 1. THANH NGANG
    const sLineY = bY + configs.sepLine.dy * baseScale * contentScaleFactor;
    const sThickness = (configs.sepLine.thickness || 1.5) * baseScale * contentScaleFactor;
    ctx.save();
    ctx.globalAlpha = configs.sepLine.opacity || 1.0;
    ctx.fillStyle = COLORS.YELLOW; 
    ctx.fillRect(bX, sLineY, bW, sThickness);
    ctx.restore();

    // 2. DẢI MŨI TÊN
    const sArrowY = bY + configs.sepArrows.dy * baseScale * contentScaleFactor;
    ctx.save();
    ctx.beginPath(); ctx.rect(bX, sArrowY - 50 * baseScale, bW, 100 * baseScale); ctx.clip();
    const arrowFontSize = 14 * baseScale * configs.sepArrows.scale * contentScaleFactor; 
    ctx.font = `900 ${arrowFontSize}px "Roboto Condensed"`; 
    ctx.fillStyle = COLORS.YELLOW; 
    ctx.globalAlpha = configs.sepArrows.opacity || 0.6;
    const arrowChar = ">";
    const charWidth = ctx.measureText(arrowChar).width * 0.75;
    const arrowCount = Math.ceil(bW / charWidth) + 2;
    let arrowString = "";
    for(let i=0; i<arrowCount; i++) arrowString += arrowChar;
    ctx.fillText(arrowString, bX, sArrowY + arrowFontSize * 0.4);
    ctx.restore();

    const drawMultilineText = (text: string, dx: number, dy: number, font: string, color: string, spacing: number = 0, vSpacing: number = 0) => {
      if (!text) return;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4 * baseScale;
      ctx.fillStyle = color; ctx.font = font;
      const xPos = bX + dx * baseScale * contentScaleFactor;
      let currY = bY + dy * baseScale * contentScaleFactor;
      
      const lines = text.split('\n');
      const fontSizeMatch = font.match(/[\d.]+/);
      const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[0]) : 24;
      const lineHeight = (fontSize * 1.2) + (vSpacing * baseScale * contentScaleFactor);

      lines.forEach((line) => {
        if (spacing !== 0) {
          let currX = xPos;
          line.split('').forEach(c => {
            ctx.fillText(c, currX, currY);
            currX += ctx.measureText(c).width + (spacing * baseScale * contentScaleFactor);
          });
        } else ctx.fillText(line, xPos, currY);
        currY += lineHeight;
      });
      ctx.restore();
    };

    // LOGO
    const logoSize = 100 * (configs.logo.scale || 1) * baseScale * contentScaleFactor;
    const lx = bX + configs.logo.dx * baseScale * contentScaleFactor;
    const ly = bY + configs.logo.dy * baseScale * contentScaleFactor;
    if (logo) {
      ctx.save(); ctx.beginPath();
      ctx.roundRect(lx, ly, logoSize, logoSize, 5 * baseScale * contentScaleFactor);
      ctx.fillStyle = COLORS.WHITE; ctx.fill(); ctx.clip();
      ctx.drawImage(logo, lx, ly, logoSize, logoSize);
      ctx.restore();
    }

    const condensed = '"Roboto Condensed", sans-serif';
    drawMultilineText(data.unitName, configs.unitName.dx, configs.unitName.dy, `bold ${34 * configs.unitName.scale * baseScale * contentScaleFactor}px ${condensed}`, COLORS.YELLOW, configs.unitName.letterSpacing, configs.unitName.vSpacing);
    drawMultilineText(data.task, configs.task.dx, configs.task.dy, `bold ${28 * configs.task.scale * baseScale * contentScaleFactor}px ${condensed}`, COLORS.WHITE, configs.task.letterSpacing, configs.task.vSpacing);
    drawMultilineText(data.time, configs.time.dx, configs.time.dy, `bold ${100 * configs.time.scale * baseScale * contentScaleFactor}px ${condensed}`, COLORS.YELLOW, configs.time.letterSpacing, configs.time.vSpacing);
    drawMultilineText(data.date, configs.date.dx, configs.date.dy, `400 ${32 * configs.date.scale * baseScale * contentScaleFactor}px ${condensed}`, COLORS.WHITE, configs.date.letterSpacing, configs.date.vSpacing);

    [configs.info1, configs.info2, configs.info3].forEach((cfg, i) => {
      const txt = (data as any)[`info${i+1}`]; if (!txt) return;
      ctx.fillStyle = COLORS.RED_DOT; 
      const squareSize = 14 * baseScale * contentScaleFactor;
      ctx.fillRect(bX + cfg.dx * baseScale * contentScaleFactor, bY + (cfg.dy - squareSize) * baseScale * contentScaleFactor, squareSize, squareSize);
      drawMultilineText(txt, cfg.dx + 25, cfg.dy, `400 ${28 * cfg.scale * baseScale * contentScaleFactor}px ${condensed}`, COLORS.WHITE, cfg.letterSpacing, cfg.vSpacing);
    });

    drawHandles(bX, bY, bW, bH);

    // ID
    ctx.save(); 
    ctx.globalAlpha = configs.id.opacity; 
    ctx.translate(configs.id.x * baseScale, configs.id.y * baseScale); 
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = COLORS.WHITE; 
    ctx.font = `400 ${16 * configs.id.scale * baseScale}px monospace`; 
    ctx.textAlign = 'center';
    ctx.fillText(data.id, 0, 0); 
    ctx.restore();

    // Verified Stamp
    ctx.save();
    const vsX = configs.verifiedStamp.x * baseScale;
    const vsY = configs.verifiedStamp.y * baseScale;
    const vsS = configs.verifiedStamp.scale * baseScale;
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4 * vsS;

    const mainFontSize = 48 * vsS;
    const subFontSize = 26 * vsS;
    ctx.font = `bold ${mainFontSize}px ${condensed}`;
    const mStr = "mark"; const tStr = "Time";
    const tmWidth = ctx.measureText(tStr + mStr).width;
    const mW = ctx.measureText(mStr).width;

    ctx.font = `400 ${subFontSize}px ${condensed}`;
    const subStr = "100% Chân thực";
    const subWidthRaw = ctx.measureText(subStr).width;
    const subSpacing = (tmWidth - subWidthRaw) / (subStr.length - 1);

    let currSubX = vsX - tmWidth;
    subStr.split('').forEach(char => {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(char, currSubX + ctx.measureText(char).width, vsY);
      currSubX += ctx.measureText(char).width + subSpacing;
    });

    ctx.font = `bold ${mainFontSize}px ${condensed}`;
    ctx.fillStyle = COLORS.WHITE; ctx.fillText(mStr, vsX, vsY - 28 * vsS);
    ctx.fillStyle = COLORS.ORANGE_YELLOW; ctx.fillText(tStr, vsX - mW, vsY - 28 * vsS);
    ctx.restore();

    if (video || mapVideo) requestRef.current = requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    if (fontsLoaded) {
      if (video || mapVideo) requestRef.current = requestAnimationFrame(renderFrame);
      else renderFrame();
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [image, video, logo, mapImage, mapVideo, data, configs, isExporting, fontsLoaded]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height) };
  };

  const handleStart = (e: any) => {
    if (isExporting) return;
    const p = getPos(e); const canvas = canvasRef.current; if (!canvas) return;
    const baseScale = canvas.width / 1000;

    const checkHit = (target: string) => {
      const c = (configs as any)[target]; if (!c) return null;
      const x = (c.x * baseScale);
      const y = (c.y * baseScale);
      const w = (c.w || 200) * baseScale;
      const h = (c.h || 100) * baseScale;
      
      if (target === 'verifiedStamp' || target === 'id') {
         if (Math.hypot(p.x - x, p.y - y) < 180 * baseScale) return { mode: 'move' };
         return null;
      }

      const handleSize = 45 * baseScale;
      // Handles: Góc + Các cạnh giữa
      const handles = [
        { id: 'tl', hx: x, hy: y }, { id: 'tr', hx: x + w, hy: y },
        { id: 'bl', hx: x, hy: y + h }, { id: 'br', hx: x + w, hy: y + h },
        { id: 't', hx: x + w/2, hy: y }, { id: 'b', hx: x + w/2, hy: y + h },
        { id: 'l', hx: x, hy: y + h/2 }, { id: 'r', hx: x + w, hy: y + h/2 }
      ];
      
      const foundHandle = handles.find(h => Math.hypot(p.x - h.hx, p.y - h.hy) < handleSize);
      if (foundHandle) return { mode: 'resize', handle: foundHandle.id };
      if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return { mode: 'move' };
      return null;
    };

    for (const t of ['map', 'box', 'verifiedStamp', 'id']) {
      const hit = checkHit(t);
      if (hit) {
        setDragState({ 
          target: t, mode: hit.mode as any, handle: (hit as any).handle, 
          startX: p.x, startY: p.y, 
          initialX: (configs as any)[t].x ?? 0, 
          initialY: (configs as any)[t].y ?? 0, 
          initialW: (configs as any)[t].w ?? 450, 
          initialH: (configs as any)[t].h ?? 400 
        });
        return;
      }
    }
  };

  const handleMove = (e: any) => {
    if (!dragState) return;
    const p = getPos(e); const canvas = canvasRef.current!; const baseScale = canvas.width / 1000;
    const dx = (p.x - dragState.startX) / baseScale; const dy = (p.y - dragState.startY) / baseScale;

    if (dragState.mode === 'move') {
      onUpdateConfig(dragState.target!, 'x', dragState.initialX + dx); 
      onUpdateConfig(dragState.target!, 'y', dragState.initialY + dy);
    } else {
        let nw = dragState.initialW; let nh = dragState.initialH;
        let nx = dragState.initialX; let ny = dragState.initialY;
        const h = dragState.handle;

        // Logic kéo giãn đa hướng
        if (h?.includes('r')) nw += dx;
        if (h?.includes('b')) nh += dy;
        if (h?.includes('l')) { nx += dx; nw -= dx; }
        if (h?.includes('t')) { ny += dy; nh -= dy; }

        if (h?.includes('l') || h?.includes('t')) {
          onUpdateConfig(dragState.target!, 'x', nx);
          onUpdateConfig(dragState.target!, 'y', ny);
        }
        onUpdateConfig(dragState.target!, 'w', Math.max(50, nw)); 
        onUpdateConfig(dragState.target!, 'h', Math.max(50, nh));
    }
  };

  return <canvas ref={canvasRef} onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={() => setDragState(null)} onMouseLeave={() => setDragState(null)} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={() => setDragState(null)} className="block touch-none max-w-full h-auto shadow-2xl" />;
};

export default CanvasPreview;
