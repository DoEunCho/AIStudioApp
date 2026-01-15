
import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, onImageSelect, selectedImage, className = "" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Handle Blob URL lifecycle to prevent memory leaks and unnecessary re-renders
  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);

    // Clean up the URL when the component unmounts or selectedImage changes
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedImage]);

  const handleClick = (e: React.MouseEvent) => {
    // If clicking on the "Replace Image" or empty area, trigger input
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      onImageSelect(file);
    }
    // Reset value so the same file can be selected again if cleared
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering handleClick
    onImageSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`flex flex-col gap-2`}>
      <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <div
        onClick={handleClick}
        className={`relative w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-black/30 overflow-hidden group
          ${selectedImage 
            ? 'border-indigo-500/50 bg-indigo-500/5' 
            : 'border-white/10 hover:border-indigo-500/30 hover:bg-white/5'
          } ${className ? className : 'h-56'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full h-full p-3 flex items-center justify-center">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full">
                  <RefreshCw size={20} className="text-white" />
                </div>
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">이미지 교체</span>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all z-10 shadow-lg hover:rotate-90"
              title="이미지 삭제"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-400 gap-3 p-6 text-center">
            <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-indigo-500/10 group-hover:scale-110 transition-all duration-300">
              <Upload size={28} className="group-hover:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold group-hover:text-indigo-400 transition-colors">클릭하여 업로드</p>
              <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">JPG, PNG, WEBP (최대 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add explicit export of RefreshCw icon for the component
const RefreshCw = ({ size, className }: { size: number, className: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

export default ImageUpload;
