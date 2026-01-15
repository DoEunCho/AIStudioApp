
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
  Layers
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

  // Form states
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [itemImages, setItemImages] = useState<(File | null)[]>([null]); 
  const [prompt, setPrompt] = useState("");
  const [option, setOption] = useState("");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: "안녕하세요! 제 사진을 업로드하고 채팅을 시작해 보세요. 당신이 상상하는 어떤 페르소나라도 연기할 준비가 되어 있습니다.", timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");

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
          if (!ctx) { reject(new Error("Canvas error")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          resolve({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
        };
        img.onerror = () => reject(new Error("Load error"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Read error"));
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
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key가 설정되지 않았습니다. Netlify 환경 변수를 확인해 주세요.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];
      let systemTask = "";
      
      if (activeTab === ToolId.VirtualModelFitting) {
        systemTask = `전문적인 가상 AI ${option} 모델을 생성하고 아이템들을 착용한 패션 화보를 생성하세요.`;
        for (const file of itemImages) if (file) parts.push(await fileToPart(file));
      } else if (activeTab === ToolId.ItemSynthesis) {
        if (image1) parts.push(await fileToPart(image1));
        systemTask = "인물의 정체성을 완벽히 유지하며 아이템들을 자연스럽게 합성하세요.";
        for (const file of itemImages) if (file) parts.push(await fileToPart(file));
      } else {
        if (image1) parts.push(await fileToPart(image1));
        if (image2) parts.push(await fileToPart(image2));
        switch (activeTab) {
          case ToolId.MagicEditor: systemTask = `편집 요청: ${prompt}`; break;
          case ToolId.SketchToWebtoon: systemTask = "웹툰 스타일 변환"; break;
          case ToolId.IDPhotoMaker: systemTask = "증명사진 생성"; break;
          case ToolId.FaceHairChanger: systemTask = "헤어스타일 합성"; break;
          case ToolId.FutureBaby: systemTask = `${option} 아이 예측`; break;
          case ToolId.AdPosterMaker: systemTask = `광고 포스터 제작: ${prompt}`; break;
          case ToolId.TimeTraveler: systemTask = `${option} 시대 시간 여행`; break;
          case ToolId.Character360: systemTask = "캐릭터 360도 뷰"; break;
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
        alert("이미지 생성에 실패했습니다.");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "오류가 발생했습니다.");
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
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];
      if (image1) parts.push(await fileToPart(image1));
      parts.push({ text: `당신은 이미지 속 캐릭터입니다. 응답: ${inputForAi}` });
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts } });
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: response.text || "...", timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) { console.error(error); }
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

  return (
    <div className="flex h-screen w-full bg-[#030712] text-gray-100 font-sans">
      {loading && <LoadingOverlay />}
      <aside className={`fixed md:relative z-40 h-full glass border-r border-white/10 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="text-white" size={20} />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl">AI 스튜디오</span>}
          </div>
          <nav className="flex-1 overflow-y-auto">
            {tools.map((tool) => (
              <SidebarItem key={tool.id} icon={tool.icon} label={isSidebarOpen ? tool.label : ''} active={activeTab === tool.id} onClick={() => setActiveTab(tool.id)} />
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex glass border-b border-white/10 p-4 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg"><Menu size={20} /></button>
            <div>
              <h1 className="text-lg font-semibold">{currentTool?.label}</h1>
              <p className="text-xs text-gray-400">{currentTool?.desc}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-[1600px] mx-auto h-full grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="glass rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-xl">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis) ? (
                  <div className="space-y-6">
                    {activeTab === ToolId.ItemSynthesis && <ImageUpload label="합성할 인물 사진" onImageSelect={setImage1} selectedImage={image1} />}
                    {activeTab === ToolId.VirtualModelFitting && (
                      <div className="grid grid-cols-2 gap-2">
                        {['남성', '여성'].map(g => (
                          <button key={g} onClick={() => setOption(g)} className={`p-3 rounded-xl border transition-all ${option === g ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10'}`}>{g} 모델</button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center"><label className="text-sm text-gray-400">아이템 사진</label><button onClick={addImageSlot} className="text-xs bg-indigo-600/20 px-3 py-1 rounded-full">+ 추가</button></div>
                    <div className="grid grid-cols-2 gap-4">
                      {itemImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <ImageUpload label={`아이템 ${idx+1}`} onImageSelect={f => updateItemImage(idx, f)} selectedImage={img} className="h-32" />
                          <button onClick={() => removeImageSlot(idx)} className="absolute top-8 right-2 p-1 bg-red-500/20 text-red-500 rounded"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ImageUpload label="이미지 업로드" onImageSelect={setImage1} selectedImage={image1} />
                    {activeTab === ToolId.MagicEditor && <textarea className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm" placeholder="편집 내용 입력..." value={prompt} onChange={e => setPrompt(e.target.value)} />}
                    {activeTab === ToolId.FutureBaby && <div className="grid grid-cols-2 gap-2">{['아들', '딸'].map(g => <button key={g} onClick={() => setOption(g)} className={`p-3 rounded-xl border ${option === g ? 'bg-indigo-600' : 'bg-white/5'}`}>{g}</button>)}</div>}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-white/5">
                {activeTab !== ToolId.PersonaChat && (
                  <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700">
                    {loading ? '생성 중...' : 'AI 생성하기'} <Sparkles size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col h-full">
              {activeTab === ToolId.PersonaChat ? (
                <div className="glass rounded-2xl border border-white/10 flex flex-col h-full shadow-2xl overflow-hidden">
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {messages.map(m => <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`px-4 py-2 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-indigo-600' : 'bg-white/10'}`}>{m.text}</div></div>)}
                   </div>
                   <div className="p-4 border-t border-white/10 flex gap-2">
                     <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2" placeholder="메시지 입력..." />
                     <button onClick={handleChatSend} className="p-2 bg-indigo-600 rounded-xl"><Sparkles size={18} /></button>
                   </div>
                </div>
              ) : result ? (
                <ResultDisplay imageUrl={result} title={currentTool?.label || ""} onReset={() => setResult(null)} />
              ) : (
                <div className="glass rounded-2xl border border-white/10 flex-1 flex flex-col items-center justify-center text-center p-12">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">{currentTool && <currentTool.icon className="text-indigo-400" size={40} />}</div>
                   <h2 className="text-xl font-bold">이미지를 생성하려면 사진을 업로드하세요</h2>
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
