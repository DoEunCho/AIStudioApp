
import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, onImageSelect, selectedImage, className = "" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onImageSelect(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewUrl = selectedImage ? URL.createObjectURL(selectedImage) : null;

  return (
    <div className={`flex flex-col gap-2`}>
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <div
        onClick={handleClick}
        className={`relative w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-black/20 overflow-hidden
          ${selectedImage 
            ? 'border-indigo-500/50 bg-indigo-500/5' 
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
          } ${className ? className : 'h-56'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full h-full p-2 group">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <span className="text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">이미지 교체</span>
            </div>
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 p-1.5 bg-red-500/80 backdrop-blur-md rounded-full hover:bg-red-600 transition-colors z-10 shadow-lg"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-500 gap-2 p-4">
            <div className="p-3 bg-white/5 rounded-full">
              <Upload size={20} />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">클릭하여 업로드</p>
              <p className="text-[10px] text-gray-600 mt-1">JPG, PNG, WEBP</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
