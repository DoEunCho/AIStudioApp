
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  AlertCircle,
  Loader2,
  CheckCircle2,
  Settings,
  Download,
  RefreshCw,
  Send
} from 'lucide-react';
import { ToolId, Message } from './types';
import ImageUpload from './components/ImageUpload';
import LoadingOverlay from './components/LoadingOverlay';
import ResultDisplay from './components/ResultDisplay';
import { GoogleGenAI } from "@google/genai";

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
  
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [itemImages, setItemImages] = useState<(File | null)[]>([null]); 
  const [prompt, setPrompt] = useState("");
  const [option, setOption] = useState("");
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: "안녕하세요! 캐릭터 사진을 업로드하고 대화를 시작해 보세요.", timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Create a persistent URL for the character image to be used in the chat
  const characterAvatarUrl = useMemo(() => {
    if (!image1) return null;
    return URL.createObjectURL(image1);
  }, [image1]);

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (characterAvatarUrl) URL.revokeObjectURL(characterAvatarUrl);
    };
  }, [characterAvatarUrl]);

  const fileToPart = async (file: File) => {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1536;
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
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      alert("API 키가 설정되지 않았습니다. 개발 환경 설정을 확인해 주세요.");
      return;
    }

    // Tool-specific validation
    if (activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis) {
      if (activeTab === ToolId.ItemSynthesis && !image1) { alert("인물 사진을 업로드해 주세요."); return; }
      if (itemImages.filter(img => img !== null).length === 0) { alert("최소 한 개 이상의 아이템 사진을 업로드해 주세요."); return; }
      if (activeTab === ToolId.VirtualModelFitting && !option) { alert("모델의 성별을 선택해 주세요."); return; }
    } else if (activeTab === ToolId.IDPhotoMaker) {
      if (!image1) { alert("이미지를 업로드해 주세요."); return; }
      if (!option) { alert("증명사진의 성별(복장 스타일)을 선택해 주세요."); return; }
    } else if (activeTab === ToolId.FutureBaby) {
      if (!image1 || !image2) { alert("부모 두 명의 사진을 모두 업로드해 주세요."); return; }
      if (!option) { alert("예측할 아기의 성별을 선택해 주세요."); return; }
    } else if (activeTab !== ToolId.PersonaChat && !image1) {
       alert("이미지를 업로드해 주세요."); return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
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
          case ToolId.IDPhotoMaker: 
            systemTask = `Create a formal ID photo. The person should be wearing appropriate ${option === '여성' ? 'female' : 'male'} formal business attire (suit/blazer). Background should be plain light gray or blue.`; 
            break;
          case ToolId.FaceHairChanger: systemTask = "Change hairstyle naturally"; break;
          case ToolId.FutureBaby: systemTask = `Analyze the features of both parents and predict what their ${option === '딸' ? 'daughter' : 'son'} would look like as a toddler or young child. High quality, realistic portrait.`; break;
          case ToolId.AdPosterMaker: systemTask = `Create a commercial poster: ${prompt}`; break;
          case ToolId.TimeTraveler: systemTask = `Transform the person in the image to the ${option} version or era. Maintain facial features but change clothing and environmental style to match ${option}.`; break;
          case ToolId.Character360: systemTask = "Generate 360 degree turnaround view"; break;
        }
      }
      
      parts.push({ text: systemTask });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "3:4" } }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResult(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        const textResponse = response.text;
        if (textResponse) alert(`AI 안내: ${textResponse}`);
        else alert("이미지 생성 결과가 없습니다. 다시 시도해 주세요.");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      const msg = error.message || "";
      if (msg.includes("permission denied") || msg.includes("403")) {
        alert("API 권한 오류입니다. API 키의 유효성과 프로젝트 설정을 확인해 주세요.");
      } else {
        alert(`생성 중 오류 발생: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    const apiKey = process.env.API_KEY;
    if (!chatInput.trim() || !apiKey) return;
    
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: chatInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];
      if (image1) parts.push(await fileToPart(image1));
      parts.push({ text: `You are the character in the image. Reply to the user's message: ${currentInput}` });
      
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts } 
      });
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: response.text || "...", timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) { 
      console.error("Chat Error:", error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: "죄송합니다. 메시지 처리 중 오류가 발생했습니다.", timestamp: new Date() };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const resetTool = useCallback(() => {
    setResult(null); setImage1(null); setImage2(null); setItemImages([null]); setPrompt(""); setOption("");
    setMessages([{ id: '1', sender: 'ai', text: "안녕하세요! 캐릭터 사진을 업로드하고 대화를 시작해 보세요.", timestamp: new Date() }]);
  }, []);

  useEffect(() => { resetTool(); }, [activeTab, resetTool]);

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

  return (
    <div className="flex h-screen w-full bg-[#030712] text-gray-100 font-sans overflow-hidden">
      {loading && <LoadingOverlay />}
      
      <aside className={`fixed md:relative z-40 h-full glass border-r border-white/10 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
              <Sparkles className="text-white" size={20} />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl whitespace-nowrap bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">AI 스튜디오</span>}
          </div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
            {tools.map((tool) => (
              <SidebarItem key={tool.id} icon={tool.icon} label={isSidebarOpen ? tool.label : ''} active={activeTab === tool.id} onClick={() => setActiveTab(tool.id)} />
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex glass border-b border-white/10 p-4 items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-95"><Menu size={20} /></button>
            <div>
              <h1 className="text-base md:text-lg font-bold truncate max-w-[200px] md:max-w-none text-white">{currentTool?.label}</h1>
              <p className="text-[10px] md:text-xs text-gray-400 font-medium uppercase tracking-wider">{currentTool?.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/5 border border-green-500/20 rounded-full shadow-sm">
            <CheckCircle2 size={12} className="text-green-500" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">System Ready</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto h-full grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 pb-12">
            
            {/* Input Section */}
            <div className="glass rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl h-fit max-h-full transition-all duration-500 hover:border-white/20">
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                {(activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis) ? (
                  <div className="space-y-8">
                    {activeTab === ToolId.ItemSynthesis && <ImageUpload label="합성할 인물 사진" onImageSelect={setImage1} selectedImage={image1} />}
                    {activeTab === ToolId.VirtualModelFitting && (
                      <div className="grid grid-cols-2 gap-4">
                        {['남성', '여성'].map(g => (
                          <button key={g} onClick={() => setOption(g)} className={`p-4 rounded-2xl border-2 transition-all font-bold ${option === g ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>{g} 모델</button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">아이템 사진 리스트</label>
                      <button onClick={addImageSlot} className="text-[10px] font-bold bg-indigo-600/20 text-indigo-400 border border-indigo-400/30 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-full transition-all uppercase">+ 사진 추가</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {itemImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <ImageUpload label={`아이템 ${idx+1}`} onImageSelect={f => updateItemImage(idx, f)} selectedImage={img} className="h-40" />
                          {itemImages.length > 1 && (
                            <button onClick={() => removeImageSlot(idx)} className="absolute top-10 right-2 p-2 bg-red-500/80 backdrop-blur-md hover:bg-red-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 size={12} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {activeTab === ToolId.FutureBaby ? (
                      <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                          <ImageUpload label="부모 1 (아빠/엄마)" onImageSelect={setImage1} selectedImage={image1} className="h-48" />
                          <ImageUpload label="부모 2 (아빠/엄마)" onImageSelect={setImage2} selectedImage={image2} className="h-48" />
                        </div>
                        <div className="space-y-4">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">예측할 아기 성별</label>
                           <div className="grid grid-cols-2 gap-4">
                             {['아들', '딸'].map(g => (
                               <button key={g} onClick={() => setOption(g)} className={`p-4 rounded-2xl border-2 transition-all font-bold ${option === g ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20 text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'}`}>{g}</button>
                             ))}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageUpload 
                          label={activeTab === ToolId.PersonaChat ? "캐릭터 프로필 설정" : "이미지 업로드"} 
                          onImageSelect={setImage1} 
                          selectedImage={image1} 
                        />
                        
                        {activeTab === ToolId.MagicEditor && (
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">편집 명령</label>
                            <textarea className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-4 text-sm focus:border-indigo-500 transition-all outline-none min-h-[120px]" placeholder="예: 배경을 해변으로 바꿔줘, 로봇 팔을 달아줘 등..." value={prompt} onChange={e => setPrompt(e.target.value)} />
                          </div>
                        )}

                        {activeTab === ToolId.IDPhotoMaker && (
                          <div className="space-y-4">
                             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">성별 선택 (복장 스타일)</label>
                             <div className="grid grid-cols-2 gap-4">
                               {['남성', '여성'].map(g => (
                                 <button key={g} onClick={() => setOption(g)} className={`p-4 rounded-2xl border-2 transition-all font-bold ${option === g ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20 text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'}`}>{g}</button>
                               ))}
                             </div>
                          </div>
                        )}
                        
                        {activeTab === ToolId.TimeTraveler && (
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">변환 옵션</label>
                            <div className="grid grid-cols-2 gap-4">
                              {['어린시절', '노년기', '1920년대', '1990년대', '19세기', '사이버펑크'].map(era => (
                                <button key={era} onClick={() => setOption(era)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${option === era ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400'}`}>{era}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {activeTab === ToolId.AdPosterMaker && (
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">광고 내용</label>
                            <input className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all" placeholder="광고 카피나 분위기를 입력하세요..." value={prompt} onChange={e => setPrompt(e.target.value)} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 border-t border-white/5 bg-black/20 shrink-0">
                {activeTab !== ToolId.PersonaChat && (
                  <button 
                    onClick={handleGenerate} 
                    disabled={loading} 
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] group"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles className="group-hover:rotate-12 transition-transform" size={20} />}
                    {loading ? 'AI 엔진 가동 중...' : 'AI 생성하기'}
                  </button>
                )}
              </div>
            </div>

            {/* Result Section */}
            <div className="flex flex-col h-full min-h-[500px]">
              {activeTab === ToolId.PersonaChat ? (
                <div className="glass rounded-3xl border border-white/10 flex flex-col h-full shadow-2xl overflow-hidden bg-black/20 relative group hover:border-white/20 transition-all duration-500">
                   {/* Chat Header with Character Profile */}
                   <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl">
                     <div className="flex items-center gap-4">
                       <div className="relative">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 overflow-hidden shadow-inner">
                           {characterAvatarUrl ? (
                             <img src={characterAvatarUrl} alt="Character" className="w-full h-full object-cover" />
                           ) : (
                             <MessageSquare size={24} className="text-indigo-400" />
                           )}
                         </div>
                         <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0a0c14] rounded-full shadow-sm"></div>
                       </div>
                       <div>
                         <span className="font-bold text-sm block text-white">AI 페르소나</span>
                         <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</span>
                           <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                           <span className="text-[10px] text-gray-400 uppercase tracking-widest">Character Mode</span>
                         </div>
                       </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={resetTool} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"><RefreshCw size={16} /></button>
                     </div>
                   </div>
                   
                   {/* Chat Messages */}
                   <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/30">
                     {messages.map(m => (
                       <div key={m.id} className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                         {m.sender === 'ai' && (
                           <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 overflow-hidden shrink-0 mt-1 shadow-md">
                             {characterAvatarUrl ? (
                               <img src={characterAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                             ) : (
                               <Sparkles size={14} className="m-auto mt-2 text-indigo-400" />
                             )}
                           </div>
                         )}
                         <div className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                           <div className={`px-5 py-3 rounded-2xl text-sm max-w-[85%] break-words shadow-xl transition-all duration-300 ${
                             m.sender === 'user' 
                               ? 'bg-indigo-600 text-white rounded-tr-none' 
                               : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5 backdrop-blur-md'
                           }`}>
                             {m.text}
                           </div>
                           <span className="text-[8px] mt-1.5 opacity-40 font-bold tracking-tighter">
                             {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Chat Input */}
                   <div className="p-6 border-t border-white/10 flex gap-3 bg-black/50 backdrop-blur-2xl">
                     <div className="flex-1 relative">
                        <input 
                          value={chatInput} 
                          onChange={e => setChatInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && handleChatSend()} 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-12 py-4 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600 shadow-inner" 
                          placeholder="메시지를 입력하세요..." 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold pointer-events-none bg-black/20 px-1.5 py-0.5 rounded border border-white/5">Enter</div>
                     </div>
                     <button 
                       onClick={handleChatSend} 
                       className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/30 active:scale-90 flex items-center justify-center group"
                     >
                       <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                     </button>
                   </div>
                </div>
              ) : result ? (
                <ResultDisplay imageUrl={result} title={currentTool?.label || ""} onReset={() => setResult(null)} />
              ) : (
                <div className="glass rounded-3xl border border-white/10 flex-1 flex flex-col items-center justify-center text-center p-12 bg-black/10 border-dashed">
                   <div className="w-28 h-28 bg-indigo-600/10 rounded-full flex items-center justify-center mb-8 border-2 border-indigo-600/20 animate-pulse">
                     {currentTool && <currentTool.icon className="text-indigo-400" size={56} />}
                   </div>
                   <h2 className="text-2xl font-bold mb-4 text-white">이미지 생성 준비 완료</h2>
                   <p className="text-gray-400 text-sm max-w-[320px] leading-relaxed">왼쪽 패널에서 사진을 업로드하고 생성 버튼을 누르면 AI가 실시간으로 변환을 시작합니다.</p>
                   
                   <div className="mt-12 flex gap-4 opacity-30">
                     <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></div>
                     <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></div>
                     <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></div>
                   </div>
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
