
import React, { useState } from 'react';
import { Download, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ResultDisplayProps {
  imageUrl: string;
  originalImageUrl?: string | null;
  title: string;
  onReset: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, originalImageUrl, title, onReset }) => {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.replace(/\s+/g, '_')}_Result.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleLocalReset = () => {
    setZoom(1);
    onReset();
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest ml-1">생성된 이미지</span>
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={handleZoomOut}
            title="축소" 
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-px h-4 bg-white/10 self-center mx-1"></div>
          <button 
            onClick={handleResetZoom}
            title="줌 초기화" 
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white flex items-center gap-1.5"
          >
            <Maximize2 size={16} />
            <span className="text-[10px] font-bold">{Math.round(zoom * 100)}%</span>
          </button>
          <div className="w-px h-4 bg-white/10 self-center mx-1"></div>
          <button 
            onClick={handleZoomIn}
            title="확대" 
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* 
          Overflow Container 
          Using flex and margin: auto on the child ensures that if the content is smaller than the container, 
          it's perfectly centered. If it's larger, margin: auto behaves safely by sticking to the edges 
          without negative-space clipping.
      */}
      <div className="relative glass rounded-2xl border border-indigo-500/30 overflow-auto shadow-2xl flex-1 bg-black/40 group custom-scrollbar flex">
        <div className="m-auto p-12 flex items-center justify-center min-w-full min-h-full">
          <div 
            className="transition-all duration-300 ease-out flex items-center justify-center"
            style={{
              width: `${zoom * 100}%`,
              height: 'auto',
              maxWidth: zoom > 1 ? 'none' : '100%',
            }}
          >
            <img 
              src={imageUrl} 
              alt="Result" 
              className="object-contain shadow-2xl rounded-lg pointer-events-none select-none transition-all duration-300"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: zoom > 1 ? `${zoom * 80}vw` : '80vw',
                maxHeight: zoom > 1 ? `${zoom * 70}vh` : '70vh',
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-semibold text-gray-200">AI {title} 생성이 완료되었습니다</h3>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download size={16} />
            이미지 저장
          </button>
          <button 
            onClick={handleLocalReset}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-gray-200 text-sm font-medium rounded-xl border border-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} />
            초기화
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
