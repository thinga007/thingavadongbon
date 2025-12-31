
import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, MapPin, Camera, Image as ImageIcon, Video as VideoIcon,
  Settings2, Plus, Minus, ShieldCheck, MousePointer2,
  Layers, Sliders, Type, Frame, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw,
  Hash, Calendar, Map, ZoomIn, ZoomOut, AlignHorizontalJustifyCenter, Play, Pause, Loader2
} from 'lucide-react';
import { WatermarkData, INITIAL_DATA, INITIAL_CONFIGS } from './types';
import CanvasPreview from './components/CanvasPreview';

const App: React.FC = () => {
  const [data, setData] = useState<WatermarkData>(INITIAL_DATA);
  const [configs, setConfigs] = useState(INITIAL_CONFIGS);
  const [zoom, setZoom] = useState(1.0);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [mapVideo, setMapVideo] = useState<HTMLVideoElement | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
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

  const nudge = (element: string, key: 'dx' | 'dy' | 'x' | 'y', amount: number) => {
    const currentVal = (configs as any)[element][key];
    if (['box', 'map', 'id'].includes(element)) {
      updateMainConfig(element, key, currentVal + amount);
    } else {
      updateOffset(element, key, currentVal + amount);
    }
  };

  const loadImage = (file: File, setter: (img: HTMLImageElement) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => setter(img);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'logo' | 'map' | 'video' | 'mapVideo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'main') {
      setVideo(null);
      loadImage(file, setImage);
    }
    if (type === 'logo') loadImage(file, setLogo);
    if (type === 'map') {
      setMapVideo(null);
      loadImage(file, setMapImage);
    }
    if (type === 'mapVideo') {
      setMapImage(null);
      const v = document.createElement('video');
      v.src = URL.createObjectURL(file);
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      v.onloadedmetadata = () => {
        setMapVideo(v);
        v.play();
      };
    }
    if (type === 'video') {
      setImage(null);
      const v = document.createElement('video');
      v.src = URL.createObjectURL(file);
      v.loop = false;
      v.muted = true;
      v.playsInline = true;
      v.onloadedmetadata = () => {
        setVideo(v);
        v.play();
        setIsVideoPlaying(true);
      };
    }
  };

  const toggleVideo = () => {
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsVideoPlaying(true);
    } else {
      video.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setTimeout(() => {
      if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `timemark-pro-${Date.now()}.jpg`;
        link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
        link.click();
      }
      setIsExporting(false);
    }, 150);
  };

  const handleExportVideo = async () => {
    if (!canvasRef.current || !video) return;
    
    setIsExporting(true);
    setIsRecording(true);
    setRecordingProgress(0);
    chunksRef.current = [];

    video.pause();
    video.currentTime = 0;

    const mimeTypes = [
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm'
    ];
    const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    const extension = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';

    const stream = canvasRef.current.captureStream(30); 
    const recorder = new MediaRecorder(stream, {
      mimeType: supportedMimeType,
      videoBitsPerSecond: 8000000 
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: supportedMimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timemark-video-${Date.now()}.${extension}`;
      link.click();
      
      setIsExporting(false);
      setIsRecording(false);
      setRecordingProgress(0);
    };

    const progressInterval = setInterval(() => {
      if (video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        setRecordingProgress(Math.min(progress, 100));
      }
    }, 100);

    video.onended = () => {
      clearInterval(progressInterval);
      recorder.stop();
      video.onended = null;
    };

    recorder.start();
    video.play();
    setIsVideoPlaying(true);
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 overflow-hidden font-sans select-none">
      
      <aside className="w-[450px] flex-shrink-0 bg-[#0f172a] border-r border-white/10 flex flex-col shadow-2xl z-50">
        <div className="p-6 border-b border-white/5 bg-indigo-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-xl">
              <Camera className="w-6 h-6 text-indigo-950" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none text-white">TIMEMARK STUDIO</h1>
              <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase mt-1">Professional Pro Stamper</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5 shadow-inner">
            <ZoomOut size={12} className="text-slate-500" />
            <input 
              type="range" min="0.3" max="2" step="0.1" value={zoom} 
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-20 h-1 accent-indigo-500 cursor-pointer"
            />
            <ZoomIn size={12} className="text-slate-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-32">
          
          <section className="space-y-3">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" /> 1. TÀI NGUYÊN ĐẦU VÀO
            </h2>
            <div className="grid grid-cols-5 gap-1.5">
              <AssetBtn icon={<Camera/>} label="Ảnh chính" active={!!image} onClick={() => fileInputRef.current?.click()} />
              <AssetBtn icon={<VideoIcon/>} label="Video chính" active={!!video} onClick={() => videoInputRef.current?.click()} />
              <AssetBtn icon={<ImageIcon/>} label="Logo" active={!!logo} onClick={() => logoInputRef.current?.click()} />
              <AssetBtn icon={<MapPin/>} label="Ảnh b.đồ" active={!!mapImage} onClick={() => mapInputRef.current?.click()} />
              <AssetBtn icon={<VideoIcon/>} label="Vid b.đồ" active={!!mapVideo} onClick={() => mapVideoInputRef.current?.click()} />
              
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'main')} />
              <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileChange(e, 'video')} />
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
              <input type="file" ref={mapInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'map')} />
              <input type="file" ref={mapVideoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileChange(e, 'mapVideo')} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Type className="w-4 h-4" /> 2. CHI TIẾT NỘI DUNG
            </h2>

            <ControlBlock 
              label="Logo Đơn Vị" 
              icon={<Frame className="w-4 h-4 text-indigo-400"/>}
              offset={(configs as any).logo}
              onUpdate={(k, v) => updateOffset('logo', k, v)}
              onNudge={(k, a) => nudge('logo', k, a)}
            />

            <ControlBlock 
              label="Tên Đơn Vị" 
              value={data.unitName} name="unitName" onChange={handleInputChange}
              offset={(configs as any).unitName}
              onUpdate={(k, v) => updateOffset('unitName', k, v)}
              onNudge={(k, a) => nudge('unitName', k, a)}
              hasLetterSpacing
            />

            <ControlBlock 
              label="Nhiệm Vụ" 
              value={data.task} name="task" onChange={handleInputChange}
              offset={(configs as any).task}
              onUpdate={(k, v) => updateOffset('task', k, v)}
              onNudge={(k, a) => nudge('task', k, a)}
              hasLetterSpacing
            />

            <ControlBlock 
              label="Giờ" 
              value={data.time} name="time" onChange={handleInputChange}
              offset={(configs as any).time}
              onUpdate={(k, v) => updateOffset('time', k, v)}
              onNudge={(k, a) => nudge('time', k, a)}
              hasLetterSpacing
            />

            <div className="bg-slate-800/20 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400"/><h4 className="text-[10px] font-black text-slate-300 uppercase">Ngày tháng</h4></div>
                <select name="dateMode" value={data.dateMode} onChange={handleInputChange} className="bg-slate-900 text-[9px] font-bold border border-white/10 rounded px-2 py-0.5 outline-none text-indigo-400">
                  <option value="1-row">1 Hàng</option>
                  <option value="2-row">2 Hàng</option>
                </select>
              </div>
              <input type="text" name="date" value={data.date} onChange={handleInputChange} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
              <div className="grid grid-cols-2 gap-3">
                <Slider label="Scale Ngày" value={configs.date.scale} min={0.1} max={3} step={0.01} onChange={v => updateOffset('date', 'scale', v)} />
                <DPad onNudge={(k, a) => nudge('date', k, a)} />
              </div>
            </div>

            <ControlBlock 
              label="Dòng thông tin 1" 
              value={data.info1} name="info1" onChange={handleInputChange}
              offset={(configs as any).info1}
              onUpdate={(k, v) => updateOffset('info1', k, v)}
              onNudge={(k, a) => nudge('info1', k, a)}
              hasLetterSpacing
            />

            <ControlBlock 
              label="Dòng thông tin 2" 
              value={data.info2} name="info2" onChange={handleInputChange}
              offset={(configs as any).info2}
              onUpdate={(k, v) => updateOffset('info2', k, v)}
              onNudge={(k, a) => nudge('info2', k, a)}
              hasLetterSpacing
            />

            <ControlBlock 
              label="Dòng thông tin 3" 
              value={data.info3} name="info3" onChange={handleInputChange}
              offset={(configs as any).info3}
              onUpdate={(k, v) => updateOffset('info3', k, v)}
              onNudge={(k, a) => nudge('info3', k, a)}
              hasLetterSpacing
            />

            <div className="bg-slate-800/40 p-5 rounded-xl border-2 border-indigo-500/20 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-400"/>
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">MÃ ID VERIFIED</h4>
              </div>
              <input 
                type="text" 
                name="id" 
                value={data.id} 
                onChange={handleInputChange} 
                className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-[10px] font-mono font-bold text-slate-200 outline-none focus:border-indigo-500" 
              />
              <div className="grid grid-cols-2 gap-4">
                 <Slider label="Độ mờ" value={configs.id.opacity} min={0} max={1} step={0.01} onChange={v => updateMainConfig('id', 'opacity', v)} />
                 <div className="flex flex-col items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-black mb-1">Vị trí ID</span>
                    <DPad onNudge={(k, a) => nudge('id', (k === 'dx' ? 'x' : 'y'), a)} />
                 </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 pb-12">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4 h-4" /> 3. KHUNG CHÍNH & BẢN ĐỒ
            </h2>
            <div className="space-y-3">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="text-[9px] font-black text-indigo-400 uppercase">Khung Thông Tin</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Bo tròn góc" value={configs.box.borderRadius || 0} min={0} max={100} onChange={v => updateMainConfig('box', 'borderRadius', v)} />
                  <Slider label="Độ mờ" value={configs.box.opacity} min={0.1} max={1} step={0.01} onChange={v => updateMainConfig('box', 'opacity', v)} />
                </div>
              </div>
              <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-4">
                <h4 className="text-[9px] font-black text-indigo-400 uppercase">Bản Đồ</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Bo tròn góc" value={configs.map.borderRadius || 0} min={0} max={100} onChange={v => updateMainConfig('map', 'borderRadius', v)} />
                  <Slider label="Độ mờ" value={configs.map.opacity} min={0.1} max={1} step={0.01} onChange={v => updateMainConfig('map', 'opacity', v)} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="absolute bottom-0 left-0 w-[450px] p-6 bg-[#0f172a]/95 backdrop-blur-md border-t border-white/5 space-y-3">
          {video && (
            <button 
              disabled={isExporting || isRecording}
              onClick={handleExportVideo}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-tighter transition-all ${!isExporting ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
              {isRecording ? <><Loader2 className="w-4 h-4 animate-spin" /> ĐANG GHI: {recordingProgress.toFixed(0)}%</> : <><VideoIcon className="w-4 h-4" /> XUẤT VIDEO MP4</>}
            </button>
          )}
          
          <button 
            disabled={(!image && !video) || isExporting || isRecording}
            onClick={handleDownloadImage}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-tighter transition-all ${(image || video) && !isRecording ? 'bg-yellow-500 hover:bg-yellow-400 text-indigo-950 shadow-xl shadow-yellow-500/20 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
          >
            <Download className="w-4 h-4" /> {isExporting && !isRecording ? 'ĐANG XỬ LÝ...' : 'XUẤT ẢNH CHÂN THỰC'}
          </button>
        </div>
      </aside>

      <section className="flex-1 bg-[#020617] relative flex items-center justify-center overflow-auto p-20 scrollbar-hide">
        {(image || video) ? (
          <div 
            className="relative shadow-[0_0_120px_rgba(0,0,0,0.9)] bg-black"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}
          >
            <CanvasPreview 
              image={image} video={video} logo={logo} mapImage={mapImage} mapVideo={mapVideo}
              data={data} configs={configs} canvasRef={canvasRef}
              onUpdateConfig={(el, k, v) => updateMainConfig(el, k, v)}
              isExporting={isExporting}
            />
            {isRecording && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-[100]">
                <div className="bg-indigo-600 px-6 py-4 rounded-2xl border border-indigo-400 shadow-2xl flex flex-col items-center gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                     <span className="text-white font-black uppercase tracking-widest text-sm">Đang mã hóa video...</span>
                  </div>
                  <div className="w-48 h-1.5 bg-indigo-900 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${recordingProgress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-6 cursor-pointer group">
            <div className="w-48 h-48 rounded-[48px] bg-slate-900 border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:border-indigo-500/50 transition-all shadow-2xl">
              <Camera className="w-16 h-16 text-slate-700 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">STUDIO TRỐNG</h3>
              <p className="text-slate-500 text-sm mt-1">Vui lòng tải ảnh hoặc video hiện trường để bắt đầu</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

// Fix React.cloneElement type error by casting icon to React.ReactElement with any props.
const AssetBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${active ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10' : 'border-white/5 bg-slate-800/40 hover:border-slate-600 text-slate-500'}`}>
    {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
    <span className="text-[7px] font-black uppercase text-center leading-tight">{label}</span>
  </button>
);

const ControlBlock = ({ label, icon, value, name, onChange, offset, onUpdate, onNudge, hasLetterSpacing }: any) => (
  <div className="bg-slate-800/20 p-4 rounded-xl border border-white/5 space-y-3">
    <div className="flex items-center gap-2"><div className="p-1 rounded bg-black/30 text-indigo-400">{icon || <Type size={12}/>}</div><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</h4></div>
    {onChange && <input type="text" name={name} value={value} onChange={onChange} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />}
    <div className="grid grid-cols-2 gap-3">
      <Slider label="Cỡ chữ / Scale" value={offset.scale} min={0.1} max={3} step={0.01} onChange={v => onUpdate('scale', v)} />
      <DPad onNudge={onNudge} />
    </div>
    {hasLetterSpacing && (
      <Slider label="Kéo giãn chữ (Spacing)" value={offset.letterSpacing || 0} min={-10} max={50} step={0.5} onChange={v => onUpdate('letterSpacing', v)} />
    )}
  </div>
);

const Slider = ({ label, value, min, max, step = 1, onChange }: any) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[8px] text-slate-500 uppercase font-black">{label}</span>
      <span className="text-[9px] text-indigo-400 font-bold tabular-nums">{value.toFixed(step >= 1 ? 0 : 2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-0.5 bg-slate-700 appearance-none accent-indigo-500 cursor-pointer" />
  </div>
);

const DPad = ({ onNudge }: any) => (
  <div className="grid grid-cols-3 gap-0.5 bg-black/30 p-1 rounded-lg border border-white/5">
    <div className="col-start-2"><PadBtn icon={<ChevronUp/>} onClick={() => onNudge('dy', -2)} /></div>
    <PadBtn icon={<ChevronLeft/>} onClick={() => onNudge('dx', -2)} />
    <div className="w-5 h-5 flex items-center justify-center text-[6px] font-bold text-indigo-500/50 uppercase">Pos</div>
    <PadBtn icon={<ChevronRight/>} onClick={() => onNudge('dx', 2)} />
    <div className="col-start-2"><PadBtn icon={<ChevronDown/>} onClick={() => onNudge('dy', 2)} /></div>
  </div>
);

// Explicitly cast icon to React.ReactElement to fix type error in cloneElement.
const PadBtn = ({ icon, onClick }: any) => (
  <button onClick={onClick} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-75 shadow-sm">
    {React.cloneElement(icon as React.ReactElement<any>, { size: 10 })}
  </button>
);

export default App;
