
import React, { useState, useEffect } from 'react';
import { 
  Wand2, 
  Paintbrush, 
  UserSquare, 
  Scissors, 
  Baby, 
  Megaphone, 
  History, 
  Shirt, 
  MessageSquare, 
  Rotate3d,
  Menu,
  X,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Key,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { ToolId, Message } from './types';
import ImageUpload from './components/ImageUpload';
import LoadingOverlay from './components/LoadingOverlay';
import ResultDisplay from './components/ResultDisplay';
import { GoogleGenAI } from "@google/genai";

// Removed conflicting declare global block for Window.aistudio
// as it is already defined by the environment as AIStudio.

const SidebarItem: React.FC<{ 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}> = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200
      ${active 
        ? 'text-indigo-400 sidebar-item-active' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolId>(ToolId.MagicEditor);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [itemImages, setItemImages] = useState<(File | null)[]>([null]); 
  const [prompt, setPrompt] = useState("");
  const [option, setOption] = useState("");
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: "안녕하세요! 사진을 업로드하고 캐릭터와 대화를 시작해 보세요.", timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      // Using type casting to access the globally injected aistudio object
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    } catch (e) {
      setHasApiKey(false);
    }
  };

  const handleOpenKeySelector = async () => {
    // Using type casting to access the globally injected aistudio object
    await (window as any).aistudio.openSelectKey();
    setHasApiKey(true); // Assume success after dialog
  };

  const fileToPart = async (file: File) => {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 2048;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = (height / width) * MAX_DIM;
              width = MAX_DIM;
            } else {
              width = (width / height) * MAX_DIM;
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Canvas context failed")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          resolve({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis) {
      if (activeTab === ToolId.ItemSynthesis && !image1) { alert("인물 사진을 업로드해 주세요."); return; }
      if (itemImages.filter(img => img !== null).length === 0) { alert("최소 한 개 이상의 아이템 사진을 업로드해 주세요."); return; }
      if (activeTab === ToolId.VirtualModelFitting && !option) { alert("모델의 성별을 선택해 주세요."); return; }
    } else if (activeTab !== ToolId.PersonaChat && !image1) {
       alert("이미지를 업로드해 주세요."); return;
    }

    setLoading(true);
    try {
      // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];
      let systemTask = "";
      
      if (activeTab === ToolId.VirtualModelFitting) {
        systemTask = `Create a professional AI ${option} model wearing these fashion items. High quality photography style.`;
        for (const file of itemImages) if (file) parts.push(await fileToPart(file));
      } else if (activeTab === ToolId.ItemSynthesis) {
        if (image1) parts.push(await fileToPart(image1));
        systemTask = "Synthesize these items onto the person while maintaining their identity perfectly.";
        for (const file of itemImages) if (file) parts.push(await fileToPart(file));
      } else {
        if (image1) parts.push(await fileToPart(image1));
        if (image2) parts.push(await fileToPart(image2));
        switch (activeTab) {
          case ToolId.MagicEditor: systemTask = `Edit instruction: ${prompt}`; break;
          case ToolId.SketchToWebtoon: systemTask = "Convert to webtoon style"; break;
          case ToolId.IDPhotoMaker: systemTask = "Create a formal ID photo"; break;
          case ToolId.FaceHairChanger: systemTask = "Change hairstyle naturally"; break;
          case ToolId.FutureBaby: systemTask = `Predict future baby (${option})`; break;
          case ToolId.AdPosterMaker: systemTask = `Create a commercial poster: ${prompt}`; break;
          case ToolId.TimeTraveler: systemTask = `Transform to ${option} era`; break;
          case ToolId.Character360: systemTask = "Generate 360 degree turnaround view"; break;
        }
      }
      
      parts.push({ text: systemTask });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "3:4", imageSize: "1K" } }
      });

      // Find the image part, do not assume it is the first part.
      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResult(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        alert("이미지 생성 결과가 없습니다. 다시 시도해 주세요.");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        alert("API 키 프로젝트가 올바르지 않습니다. 다시 선택해 주세요.");
      } else {
        alert(`오류 발생: ${error.message || "알 수 없는 오류가 발생했습니다."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: chatInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const inputForAi = chatInput;
    setChatInput("");
    
    try {
      // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];
      if (image1) parts.push(await fileToPart(image1));
      parts.push({ text: `You are the character in the image. Reply to: ${inputForAi}` });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: { parts } 
      });
      // Correct extraction of text from GenerateContentResponse
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: response.text || "...", timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) { 
      console.error("Chat Error:", error);
      if (error.message?.includes("Requested entity was not found")) setHasApiKey(false);
    }
  };

  const resetTool = () => {
    setResult(null); setImage1(null); setImage2(null); setItemImages([null]); setPrompt(""); setOption("");
  };

  useEffect(() => { resetTool(); }, [activeTab]);

  const addImageSlot = () => { if (itemImages.length < 6) setItemImages([...itemImages, null]); };
  const removeImageSlot = (idx: number) => { setItemImages(itemImages.length > 1 ? itemImages.filter((_, i) => i !== idx) : [null]); };
  const updateItemImage = (idx: number, file: File | null) => {
    const newList = [...itemImages]; newList[idx] = file; setItemImages(newList);
  };

  const tools = [
    { id: ToolId.MagicEditor, label: '매직 에디터', icon: Wand2, desc: 'AI 사진 편집' },
    { id: ToolId.SketchToWebtoon, label: '스케치 투 웹툰', icon: Paintbrush, desc: '웹툰 변환' },
    { id: ToolId.IDPhotoMaker, label: '증명사진 메이커', icon: UserSquare, desc: 'ID 사진 생성' },
    { id: ToolId.FaceHairChanger, label: '헤어 & 페이스 체인저', icon: Scissors, desc: '스타일 변경' },
    { id: ToolId.FutureBaby, label: '2세 예측', icon: Baby, desc: '미래 아기 모습' },
    { id: ToolId.AdPosterMaker, label: '광고 포스터 메이커', icon: Megaphone, desc: '포스터 제작' },
    { id: ToolId.TimeTraveler, label: '타임 트래블러', icon: History, desc: '나이/시대 변환' },
    { id: ToolId.VirtualModelFitting, label: '가상 모델 피팅', icon: Shirt, desc: 'AI 모델 생성' },
    { id: ToolId.ItemSynthesis, label: '아이템 합성', icon: Layers, desc: '인물 정체성 유지 합성' },
    { id: ToolId.PersonaChat, label: '페르소나 채팅', icon: MessageSquare, desc: '캐릭터와 대화' },
    { id: ToolId.Character360, label: '360도 캐릭터 뷰', icon: Rotate3d, desc: '턴어라운드 생성' },
  ];

  const currentTool = tools.find(t => t.id === activeTab);

  if (hasApiKey === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#030712] p-6 text-white">
        <div className="glass max-w-md w-full p-10 rounded-3xl border border-indigo-500/30 text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/40">
            <Key className="text-indigo-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-4">API 키가 필요합니다</h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            AI 스튜디오의 고성능 모델을 사용하려면 본인의 구글 유료 프로젝트 API 키가 필요합니다. 과금은 선택하신 프로젝트의 설정에 따라 발생합니다.
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleOpenKeySelector}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
            >
              API 키 선택하기
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
            >
              결제 및 요금 정책 안내 <ExternalLink size={12} />
            </a>
          </div>
          <div className="mt-10 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[11px] text-red-300/80 leading-relaxed">
              공유 받은 앱을 사용할 때 자신의 유료 프로젝트 키를 사용하면 보안이 유지되며 귀하의 계정 할당량만 사용됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#030712] text-gray-100 font-sans">
      {loading && <LoadingOverlay />}
      <aside className={`fixed md:relative z-40 h-full glass border-r border-white/10 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="text-white" size={20} />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl whitespace-nowrap">AI 스튜디오</span>}
          </div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            {tools.map((tool) => (
              <SidebarItem key={tool.id} icon={tool.icon} label={isSidebarOpen ? tool.label : ''} active={activeTab === tool.id} onClick={() => setActiveTab(tool.id)} />
            ))}
          </nav>
          <div className="p-4 border-t border-white/5">
            <button 
              onClick={handleOpenKeySelector}
              className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-gray-400 flex items-center justify-center gap-2 transition-colors"
            >
              <Key size={12} /> {isSidebarOpen ? 'API 키 다시 선택' : ''}
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex glass border-b border-white/10 p-4 items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Menu size={20} /></button>
            <div>
              <h1 className="text-base md:text-lg font-semibold truncate max-w-[200px] md:max-w-none">{currentTool?.label}</h1>
              <p className="text-[10px] md:text-xs text-gray-400">{currentTool?.desc}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto h-full grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
            <div className="glass rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl h-fit max-h-full">
              <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
                {(activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis) ? (
                  <div className="space-y-6">
                    {activeTab === ToolId.ItemSynthesis && <ImageUpload label="합성할 인물 사진" onImageSelect={setImage1} selectedImage={image1} />}
                    {activeTab === ToolId.VirtualModelFitting && (
                      <div className="grid grid-cols-2 gap-3">
                        {['남성', '여성'].map(g => (
                          <button key={g} onClick={() => setOption(g)} className={`p-4 rounded-xl border-2 transition-all font-bold ${option === g ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>{g} 모델</button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center"><label className="text-sm font-bold text-indigo-400 uppercase tracking-wider">아이템 사진 리스트</label><button onClick={addImageSlot} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-full transition-all">+ 사진 추가</button></div>
                    <div className="grid grid-cols-2 gap-4">
                      {itemImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <ImageUpload label={`아이템 ${idx+1}`} onImageSelect={f => updateItemImage(idx, f)} selectedImage={img} className="h-32" />
                          <button onClick={() => removeImageSlot(idx)} className="absolute top-8 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ImageUpload label="이미지 업로드" onImageSelect={setImage1} selectedImage={image1} />
                    {activeTab === ToolId.MagicEditor && <textarea className="w-full bg-black/40 border-2 border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 transition-all outline-none" rows={4} placeholder="예: 배경을 해변으로 바꿔줘, 로봇 팔을 달아줘 등..." value={prompt} onChange={e => setPrompt(e.target.value)} />}
                    {activeTab === ToolId.FutureBaby && <div className="grid grid-cols-2 gap-3">{['아들', '딸'].map(g => <button key={g} onClick={() => setOption(g)} className={`p-4 rounded-xl border-2 transition-all font-bold ${option === g ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>{g}</button>)}</div>}
                    {activeTab === ToolId.TimeTraveler && (
                      <div className="grid grid-cols-2 gap-3">
                        {['어린시절', '노년기', '19세기', '사이버펑크'].map(era => (
                          <button key={era} onClick={() => setOption(era)} className={`p-3 rounded-xl border-2 text-sm transition-all ${option === era ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}>{era}</button>
                        ))}
                      </div>
                    )}
                    {activeTab === ToolId.AdPosterMaker && <input className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" placeholder="광고 카피나 분위기를 입력하세요..." value={prompt} onChange={e => setPrompt(e.target.value)} />}
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 border-t border-white/5 bg-black/20 shrink-0">
                {activeTab !== ToolId.PersonaChat && (
                  <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                    {loading ? 'AI 연산 중...' : 'AI 생성하기'} <Sparkles size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col h-full min-h-[400px]">
              {activeTab === ToolId.PersonaChat ? (
                <div className="glass rounded-2xl border border-white/10 flex flex-col h-full shadow-2xl overflow-hidden bg-black/20">
                   <div className="p-4 border-b border-white/5 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                       <MessageSquare size={20} className="text-indigo-400" />
                     </div>
                     <span className="font-bold text-sm">페르소나 채팅</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                     {messages.map(m => (
                       <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] break-words shadow-lg ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'}`}>
                           {m.text}
                         </div>
                       </div>
                     ))}
                   </div>
                   <div className="p-4 border-t border-white/5 flex gap-2 bg-black/40">
                     <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all" placeholder="메시지를 입력하세요..." />
                     <button onClick={handleChatSend} className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"><Sparkles size={18} /></button>
                   </div>
                </div>
              ) : result ? (
                <ResultDisplay imageUrl={result} title={currentTool?.label || ""} onReset={() => setResult(null)} />
              ) : (
                <div className="glass rounded-2xl border border-white/10 flex-1 flex flex-col items-center justify-center text-center p-12 bg-black/10">
                   <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center mb-6 border-2 border-indigo-600/20 animate-pulse">
                     {currentTool && <currentTool.icon className="text-indigo-400" size={48} />}
                   </div>
                   <h2 className="text-xl font-bold mb-3">이미지 생성 준비 완료</h2>
                   <p className="text-gray-400 text-sm max-w-[280px]">왼쪽 패널에서 사진을 업로드하고 생성 버튼을 눌러보세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
