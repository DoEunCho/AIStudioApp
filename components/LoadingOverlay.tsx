
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/80 p-8 rounded-2xl border border-white/10 flex flex-col items-center shadow-2xl">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">AI가 분석 중입니다...</h3>
        <p className="text-gray-400 text-center max-w-[250px]">
          픽셀을 합성하고 인공지능 패턴을 적용하고 있습니다. 잠시만 기다려주세요.
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
