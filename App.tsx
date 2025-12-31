
import React, { useState, useRef } from 'react';
import { 
  Download, MapPin, Camera, Image as ImageIcon, Video as VideoIcon,
  Layers, Type, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Hash, Calendar, ZoomIn, ZoomOut, Loader2, Minus, Plus,
  ChevronsRight, Settings2, ShieldCheck, MoveVertical
} from 'lucide-react';
import { WatermarkData, INITIAL_DATA, INITIAL_CONFIGS } from './types';
import CanvasPreview from './components/CanvasPreview';

const App: React.FC = () => {
  const [data, setData] = useState<WatermarkData>(INITIAL_DATA);
  const [configs, setConfigs] = useState(INITIAL_CONFIGS);
  const [zoom, setZoom] = useState(0.8); 
  const [isExporting, setIsExporting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [mapVideo, setMapVideo] = useState<HTMLVideoElement | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const mapVideoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const updateMainConfig = (element: string, key: string, value: number) => {
    setConfigs(prev => ({
      ...prev,
      [element]: { ...prev[element as keyof typeof prev], [key]: value }
    }));
  };

  const updateOffset = (element: string, key: string, value: number) => {
    setConfigs(prev => ({
      ...prev,
      [element]: { ...prev[element as keyof typeof prev], [key]: value }
    }));
  };

  const nudge = (element: string, key: string, amount: number) => {
    const currentVal = (configs as any)[element][key] || 0;
    if (['box', 'map', 'id', 'verifiedStamp', 'sepLine', 'sepArrows'].includes(element)) {
      updateMainConfig(element, key, currentVal + amount);
    } else {
      updateOffset(element, key, currentVal + amount);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'logo' | 'map' | 'video' | 'mapVideo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'main') {
      setVideo(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => setImage(img);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (type === 'logo') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => setLogo(img);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (type === 'map') {
      setMapVideo(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => setMapImage(img);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (type === 'mapVideo') {
      setMapImage(null);
      const v = document.createElement('video');
      v.src = URL.createObjectURL(file);
      v.loop = true; v.muted = true; v.playsInline = true;
      v.onloadedmetadata = () => { setMapVideo(v); v.play(); };
    } else if (type === 'video') {
      setImage(null);
      const v = document.createElement('video');
      v.src = URL.createObjectURL(file);
      v.loop = false; v.muted = true; v.playsInline = true;
      v.onloadedmetadata = () => { setVideo(v); v.play(); };
    }
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setTimeout(() => {
      if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `timemark-${Date.now()}.jpg`;
        link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
        link.click();
      }
      setIsExporting(false);
    }, 200);
  };

  const handleExportVideo = async () => {
    if (!canvasRef.current || !video) return;
    setIsExporting(true);
    setIsRecording(true);
    chunksRef.current = [];
    video.pause(); video.currentTime = 0;

    const mimeTypes = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9'];
    const supported = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    const stream = canvasRef.current.captureStream(30); 
    const recorder = new MediaRecorder(stream, { mimeType: supported, videoBitsPerSecond: 8000000 });

    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: supported });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timemark-video-${Date.now()}.${supported.includes('mp4') ? 'mp4' : 'webm'}`;
      link.click();
      setIsExporting(false); setIsRecording(false);
    };

    video.onended = () => recorder.stop();
    recorder.start();
    video.play();
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 overflow-hidden font-sans select-none">
      <aside className="w-[420px] flex-shrink-0 bg-[#0f172a] border-r border-white/10 flex flex-col shadow-2xl z-50">
        <div className="p-5 border-b border-white/5 bg-indigo-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-xl"><Camera className="w-5 h-5 text-indigo-950" /></div>
            <div>
              <h1 className="text-md font-black tracking-tighter uppercase leading-none text-white">TIMEMARK STUDIO</h1>
              <p className="text-[9px] text-indigo-400 font-bold uppercase mt-1">Professional Stamper</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5">
            <ZoomOut size={12} className="text-slate-500" />
            <input type="range" min="0.2" max="1.5" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-16 h-1 accent-indigo-500" />
            <ZoomIn size={12} className="text-slate-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide pb-40">
          <section className="space-y-3">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layers size={14} /> 1. INPUT MEDIA</h2>
            <div className="grid grid-cols-5 gap-1">
              <AssetBtn icon={<Camera/>} label="Ảnh" active={!!image} onClick={() => fileInputRef.current?.click()} />
              <AssetBtn icon={<VideoIcon/>} label="Video" active={!!video} onClick={() => videoInputRef.current?.click()} />
              <AssetBtn icon={<ImageIcon/>} label="Logo" active={!!logo} onClick={() => logoInputRef.current?.click()} />
              <AssetBtn icon={<MapPin/>} label="Map" active={!!mapImage} onClick={() => mapInputRef.current?.click()} />
              <AssetBtn icon={<VideoIcon/>} label="Map V" active={!!mapVideo} onClick={() => mapVideoInputRef.current?.click()} />
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'main')} />
              <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileChange(e, 'video')} />
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
              <input type="file" ref={mapInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'map')} />
              <input type="file" ref={mapVideoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileChange(e, 'mapVideo')} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Type size={14} /> 2. WATERMARK CONTENT</h2>
            
            <ControlBlock label="Logo" offset={configs.logo} onUpdate={(k, v) => updateOffset('logo', k, v)} onNudge={(k, a) => nudge('logo', k, a)} />
            
            <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
              <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-yellow-400"><Minus size={12}/></div><h4 className="text-[9px] font-black text-slate-400 uppercase">Dải Phân Cách (Dính Khung)</h4></div>
              <div className="space-y-4">
                <div className="p-3 bg-black/20 rounded-lg space-y-3">
                    <p className="text-[8px] font-bold text-yellow-500 uppercase border-b border-white/5 pb-1">Thanh Ngang</p>
                    <div className="grid grid-cols-1 gap-3">
                        <NumericControl label="Vị trí dọc (dy)" value={configs.sepLine.dy} min={0} max={600} step={1} onChange={v => updateMainConfig('sepLine', 'dy', v)} />
                        <NumericControl label="Độ dày" value={configs.sepLine.thickness || 1} min={0.1} max={10} step={0.1} onChange={v => updateMainConfig('sepLine', 'thickness', v)} />
                        <NumericControl label="Độ mờ" value={configs.sepLine.opacity || 1} min={0} max={1} step={0.05} onChange={v => updateMainConfig('sepLine', 'opacity', v)} />
                    </div>
                </div>
                <div className="p-3 bg-black/20 rounded-lg space-y-3">
                    <p className="text-[8px] font-bold text-yellow-500 uppercase border-b border-white/5 pb-1">Dải Mũi Tên {">>>>>"}</p>
                    <div className="grid grid-cols-1 gap-3">
                        <NumericControl label="Vị trí dọc (dy)" value={configs.sepArrows.dy} min={0} max={600} step={1} onChange={v => updateMainConfig('sepArrows', 'dy', v)} />
                        <NumericControl label="Tỷ lệ (Scale)" value={configs.sepArrows.scale} min={0.1} max={3} step={0.05} onChange={v => updateMainConfig('sepArrows', 'scale', v)} />
                        <NumericControl label="Độ mờ" value={configs.sepArrows.opacity || 0.6} min={0} max={1} step={0.05} onChange={v => updateMainConfig('sepArrows', 'opacity', v)} />
                    </div>
                </div>
              </div>
            </div>

            <ControlBlock label="Đơn vị" value={data.unitName} name="unitName" onChange={handleInputChange} offset={configs.unitName} onUpdate={(k, v) => updateOffset('unitName', k, v)} onNudge={(k, a) => nudge('unitName', k, a)} hasSpacing />
            <ControlBlock label="Nhiệm vụ" value={data.task} name="task" onChange={handleInputChange} offset={configs.task} onUpdate={(k, v) => updateOffset('task', k, v)} onNudge={(k, a) => nudge('task', k, a)} hasSpacing />
            <ControlBlock label="Giờ" value={data.time} name="time" onChange={handleInputChange} offset={configs.time} onUpdate={(k, v) => updateOffset('time', k, v)} onNudge={(k, a) => nudge('time', k, a)} hasSpacing />
            
            <div className="bg-slate-800/20 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-indigo-400"><Calendar size={12}/></div><h4 className="text-[9px] font-black text-slate-400 uppercase">Ngày tháng</h4></div>
                <select name="dateMode" value={data.dateMode} onChange={handleInputChange} className="bg-slate-900 text-[8px] border-none text-indigo-400 font-bold p-1 rounded">
                   <option value="1-row">1 Dòng</option>
                   <option value="2-row">2 Dòng</option>
                </select>
              </div>
              <textarea name="date" value={data.date} onChange={handleInputChange as any} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-100 min-h-[50px]" />
              <div className="grid grid-cols-1 gap-3">
                <NumericControl label="Tỷ lệ" value={configs.date.scale} min={0.1} max={3} step={0.01} onChange={v => updateOffset('date', 'scale', v)} />
                <NumericControl label="Kéo giãn dọc" value={configs.date.vSpacing || 0} min={-50} max={100} step={1} onChange={v => updateOffset('date', 'vSpacing', v)} />
                <DPad onNudge={(k, a) => nudge('date', k, a)} />
              </div>
            </div>

            <ControlBlock label="Thông tin 1" value={data.info1} name="info1" onChange={handleInputChange} offset={configs.info1} onUpdate={(k, v) => updateOffset('info1', k, v)} onNudge={(k, a) => nudge('info1', k, a)} hasSpacing />
            <ControlBlock label="Thông tin 2" value={data.info2} name="info2" onChange={handleInputChange} offset={configs.info2} onUpdate={(k, v) => updateOffset('info2', k, v)} onNudge={(k, a) => nudge('info2', k, a)} hasSpacing />
            <ControlBlock label="Thông tin 3" value={data.info3} name="info3" onChange={handleInputChange} offset={configs.info3} onUpdate={(k, v) => updateOffset('info3', k, v)} onNudge={(k, a) => nudge('info3', k, a)} hasSpacing />
            
            <div className="bg-slate-800/20 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-indigo-400"><Hash size={12}/></div><h4 className="text-[9px] font-black text-slate-400 uppercase">ID Xoay dọc</h4></div>
              <input type="text" name="id" value={data.id} onChange={handleInputChange} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-100 outline-none" />
              <div className="grid grid-cols-1 gap-3">
                <NumericControl label="Tỷ lệ" value={configs.id.scale} min={0.1} max={3} step={0.1} onChange={v => updateMainConfig('id', 'scale', v)} />
                <DPad onNudge={(k, a) => nudge('id', k, a)} />
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
              <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-indigo-400"><ShieldCheck size={12}/></div><h4 className="text-[9px] font-black text-slate-400 uppercase">Verified Stamp (Góc)</h4></div>
              <div className="grid grid-cols-1 gap-3">
                <NumericControl label="Tỷ lệ" value={configs.verifiedStamp.scale} min={0.1} max={3} step={0.05} onChange={v => updateMainConfig('verifiedStamp', 'scale', v)} />
                <DPad onNudge={(k, a) => nudge('verifiedStamp', k, a)} />
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
              <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-indigo-400"><Settings2 size={12}/></div><h4 className="text-[9px] font-black text-slate-400 uppercase">Cấu hình Khung</h4></div>
              <div className="grid grid-cols-1 gap-3">
                <NumericControl label="Chiều rộng" value={configs.box.w} min={50} max={1000} step={1} onChange={v => updateMainConfig('box', 'w', v)} />
                <NumericControl label="Chiều cao" value={configs.box.h} min={50} max={1000} step={1} onChange={v => updateMainConfig('box', 'h', v)} />
                <NumericControl label="Bo góc" value={configs.box.borderRadius || 0} min={0} max={200} step={1} onChange={v => updateMainConfig('box', 'borderRadius', v)} />
                <NumericControl label="Độ mờ nền" value={configs.box.opacity} min={0} max={1} step={0.01} onChange={v => updateMainConfig('box', 'opacity', v)} />
                <DPad onNudge={(k, a) => nudge('box', k, a)} />
              </div>
            </div>
          </section>
        </div>

        <div className="absolute bottom-0 left-0 w-[420px] p-5 bg-[#0f172a]/95 backdrop-blur-md border-t border-white/5 space-y-2">
          {video && (
            <button disabled={isExporting} onClick={handleExportVideo} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase transition-all shadow-lg shadow-indigo-600/20">
              {isRecording ? <Loader2 className="animate-spin" /> : <VideoIcon size={16} />} XUẤT VIDEO MP4
            </button>
          )}
          <button disabled={(!image && !video) || isExporting} onClick={handleDownloadImage} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-indigo-950 font-black text-xs uppercase transition-all shadow-lg shadow-yellow-500/20">
            <Download size={16} /> {isExporting ? 'XỬ LÝ...' : 'XUẤT ẢNH CHÂN THỰC'}
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[#020617] relative flex items-center justify-center overflow-hidden p-10">
        {(image || video) ? (
          <div className="relative" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)' }}>
            <CanvasPreview 
              image={image} video={video} logo={logo} mapImage={mapImage} mapVideo={mapVideo}
              data={data} configs={configs} canvasRef={canvasRef}
              onUpdateConfig={(el, k, v) => updateMainConfig(el, k, v)}
              isExporting={isExporting}
            />
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
            <Camera size={64} className="text-slate-700" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Bắt đầu bằng cách tải ảnh lên</p>
          </div>
        )}
      </main>
    </div>
  );
};

const NumericControl = ({ label, value, step = 1, min = -500, max = 1500, onChange }: any) => (
  <div className="flex flex-col gap-1.5 p-2 bg-black/10 rounded-lg">
    <div className="flex justify-between items-center px-1">
      <span className="text-[7px] text-slate-500 uppercase font-black">{label}</span>
      <span className="text-[8px] text-indigo-400 font-bold">{Number(value.toFixed(2))}</span>
    </div>
    
    <div className="flex flex-col gap-2">
      {/* Con lăn (Slider) */}
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={e => onChange(parseFloat(e.target.value))} 
        className="w-full h-1 bg-slate-800 appearance-none accent-indigo-500 rounded-full cursor-pointer hover:accent-indigo-400 transition-all"
      />
      
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(value - step)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
          <Minus size={10} />
        </button>
        <input 
          type="number" 
          value={Number(value.toFixed(2))} 
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-slate-900 border border-white/5 rounded text-[10px] font-bold text-center text-indigo-400 py-1 outline-none focus:border-indigo-500/50"
        />
        <button onClick={() => onChange(value + step)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors">
          <Plus size={10} />
        </button>
      </div>
    </div>
  </div>
);

const AssetBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${active ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg' : 'border-white/5 bg-slate-800/40 text-slate-500 hover:border-slate-600'}`}>
    {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
    <span className="text-[7px] font-black uppercase text-center">{label}</span>
  </button>
);

const ControlBlock = ({ label, icon, value, name, onChange, offset, onUpdate, onNudge, hasSpacing }: any) => (
  <div className="bg-slate-800/20 p-4 rounded-xl border border-white/5 space-y-3">
    <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-indigo-400">{icon || <Type size={12}/>}</div><h4 className="text-[9px] font-black text-slate-400 uppercase">{label}</h4></div>
    {onChange && <textarea name={name} value={value} onChange={onChange as any} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 min-h-[40px]" />}
    <div className="grid grid-cols-1 gap-3">
      <NumericControl label="Tỷ lệ (Scale)" value={offset.scale} min={0.1} max={3} step={0.01} onChange={v => onUpdate('scale', v)} />
      {hasSpacing && (
          <>
            <NumericControl label="Vị trí ngang (dx)" value={offset.dx} min={-100} max={600} step={1} onChange={v => onUpdate('dx', v)} />
            <NumericControl label="Vị trí dọc (dy)" value={offset.dy} min={-100} max={600} step={1} onChange={v => onUpdate('dy', v)} />
            <NumericControl label="Khoảng cách chữ" value={offset.letterSpacing || 0} min={-10} max={50} step={0.5} onChange={v => onUpdate('letterSpacing', v)} />
            <NumericControl label="Giãn dòng (vSpacing)" value={offset.vSpacing || 0} min={-50} max={100} step={1} onChange={v => onUpdate('vSpacing', v)} />
          </>
      )}
      {!hasSpacing && <DPad onNudge={onNudge} />}
    </div>
  </div>
);

const DPad = ({ onNudge }: any) => (
  <div className="grid grid-cols-3 gap-0.5 bg-black/20 p-1 rounded-lg">
    <div className="col-start-2"><PadBtn icon={<ChevronUp/>} onClick={() => onNudge('dy', -2)} /></div>
    <PadBtn icon={<ChevronLeft/>} onClick={() => onNudge('dx', -2)} />
    <div className="flex items-center justify-center text-[5px] text-indigo-500 font-bold uppercase">Pos</div>
    <PadBtn icon={<ChevronRight/>} onClick={() => onNudge('dx', 2)} />
    <div className="col-start-2"><PadBtn icon={<ChevronDown/>} onClick={() => onNudge('dy', 2)} /></div>
  </div>
);

const PadBtn = ({ icon, onClick }: any) => (
  <button onClick={onClick} className="w-4 h-4 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center text-slate-500 hover:text-white transition-all">
    {React.cloneElement(icon as React.ReactElement<any>, { size: 10 })}
  </button>
);

export default App;
