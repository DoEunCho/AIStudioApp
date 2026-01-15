
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
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Form states
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [itemImages, setItemImages] = useState<(File | null)[]>([null]); // For multi-item upload
  const [prompt, setPrompt] = useState("");
  const [option, setOption] = useState("");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: "안녕하세요! 제 사진을 업로드하고 채팅을 시작해 보세요. 당신이 상상하는 어떤 페르소나라도 연기할 준비가 되어 있습니다.", timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");

  /**
   * Converts a File to a Gemini API compatible part.
   */
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
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          
          resolve({
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg'
            }
          });
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    // Validation
    if (activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis) {
      if (activeTab === ToolId.ItemSynthesis && !image1) {
        alert("인물 사진을 업로드해 주세요.");
        return;
      }
      if (itemImages.filter(img => img !== null).length === 0) {
        alert("최소 한 개 이상의 아이템 사진을 업로드해 주세요.");
        return;
      }
      if (activeTab === ToolId.VirtualModelFitting && !option) {
        alert("모델의 성별을 선택해 주세요.");
        return;
      }
    } else if (activeTab !== ToolId.PersonaChat && !image1) {
       alert("이미지를 업로드해 주세요.");
       return;
    }

    if (activeTab === ToolId.FaceHairChanger && !image2) {
      alert("변경하고 싶은 헤어스타일 이미지를 업로드해 주세요.");
      return;
    }

    if (activeTab === ToolId.FutureBaby && !image2) {
      alert("부모 2의 사진을 업로드해 주세요.");
      return;
    }
    
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];
      
      let systemTask = "";
      
      if (activeTab === ToolId.VirtualModelFitting) {
        const genderLabel = option === '남성' ? '남성(Male)' : '여성(Female)';
        systemTask = `전문적인 가상 AI ${genderLabel} 모델을 생성하고, 다음 의류 아이템들을 착용한 세련된 패션 화보 전신 컷을 생성하세요. `;
        systemTask += "배경은 인물이 돋보이는 깨끗한 스튜디오 배경으로 하고, 아이템들이 모델의 체형과 포즈에 맞게 자연스럽게 주름지거나 핏되어야 합니다. ";
        
        for (const file of itemImages) {
          if (file) {
            parts.push(await fileToPart(file));
          }
        }
        systemTask += `\n고품질 패션 잡지 화보 수준의 퀄리티를 구현하세요.`;
      } else if (activeTab === ToolId.ItemSynthesis) {
        if (image1) parts.push(await fileToPart(image1));
        systemTask = "당신은 세계 최고의 이미지 합성 전문가입니다. 제공된 첫 번째 사진 속 인물의 '얼굴, 체형, 헤어스타일, 정체성'을 100% 완벽하게 유지해야 합니다. 절대 인물을 다른 사람으로 변경하지 마세요. ";
        systemTask += "이 인물에게 나머지 업로드된 아이템 이미지들을 자연스럽게 착용시키거나 배치하세요. 포즈와 체형에 맞춰 실제처럼 보이도록 정교하게 합성하며, 고품질 패션 사진 결과를 생성하세요.";
        
        for (const file of itemImages) {
          if (file) {
            parts.push(await fileToPart(file));
          }
        }
      } else {
        if (image1) parts.push(await fileToPart(image1));
        if (image2) parts.push(await fileToPart(image2));
        
        switch (activeTab) {
          case ToolId.MagicEditor:
            systemTask = `다음 요청에 따라 이미지를 편집하세요: "${prompt}". 객체를 사실적으로 추가하거나 제거하는 데 집중하세요.`;
            break;
          case ToolId.SketchToWebtoon:
            systemTask = "이 스케치를 고품질의 전문적인 웹툰/만화 스타일로 변환하세요. 정교한 선화와 생동감 넘치는 채색을 적용하세요.";
            break;
          case ToolId.IDPhotoMaker:
            systemTask = "이 인물을 바탕으로 공식 증명 사진을 생성하세요. 중립적인 흰색 배경, 비즈니스 복장, 중앙 정렬 구도를 유지하세요.";
            break;
          case ToolId.FaceHairChanger:
            systemTask = `첫 번째 사진의 인물에게 두 번째 사진에 나온 헤어스타일을 자연스럽게 적용하세요. 인물의 얼굴 특징과 정체성은 유지하면서 헤어스타일과 색상만 변경하세요.`;
            break;
          case ToolId.FutureBaby:
            const genderText = option === '아들' ? '남자아이(Boy)' : option === '딸' ? '여자아이(Girl)' : '아이';
            systemTask = `제공된 두 부모의 사진을 바탕으로, 그들의 아이가 아기일 때 어떤 모습일지 사실적인 고품질 사진을 생성하세요. 아이의 성별은 ${genderText}여야 합니다. 부모의 특징을 절반씩 닮은 귀여운 아기 모습으로 생성하세요.`;
            break;
          case ToolId.AdPosterMaker:
            systemTask = `이미지 속 제품을 위한 전문적인 광고 포스터를 제작하세요. 테마: ${prompt}. 시각적 임팩트가 강해야 합니다.`;
            break;
          case ToolId.TimeTraveler:
            systemTask = `이 인물이 특정 시대에 살았거나 특정 나이(${option})일 때의 모습을 보여주세요. 핵심적인 얼굴 특징은 유지하세요.`;
            break;
          case ToolId.Character360:
            systemTask = "이미지 속 캐릭터의 앞, 옆, 뒤 모습을 보여주는 360도 턴어라운드 뷰를 생성하세요. 캐릭터의 정체성을 유지하면서 전신 뷰를 구현하세요.";
            break;
        }
      }
      
      parts.push({ text: systemTask });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "3:4" 
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResult(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        alert("AI 응답에서 이미지 데이터를 생성할 수 없습니다.");
      }
    } catch (error: any) {
      console.error("AI 생성 오류:", error);
      alert(`AI 생성 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`);
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];
      if (image1) parts.push(await fileToPart(image1));
      const chatContext = messages.map(m => `${m.sender === 'user' ? '사용자' : '캐릭터'}: ${m.text}`).join('\n');
      const finalPrompt = `당신은 제공된 이미지에 묘사된 캐릭터입니다. 대화 기록:\n${chatContext}\n사용자의 최신 메시지: ${inputForAi}\n이 캐릭터로서 자연스럽게 응답하세요. 짧고 캐릭터의 개성이 드러나게 답하세요. 한국어로 답변하세요.`;
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
      });

      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: response.text || "...", timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI 채팅 오류:", error);
    }
  };

  const resetTool = () => {
    setResult(null);
    setOriginalImageUrl(null);
    setImage1(null);
    setImage2(null);
    setItemImages([null]);
    setPrompt("");
    setOption("");
  };

  useEffect(() => {
    resetTool();
  }, [activeTab]);

  const addImageSlot = () => {
    if (itemImages.length < 6) {
      setItemImages([...itemImages, null]);
    }
  };

  const removeImageSlot = (index: number) => {
    if (itemImages.length > 1) {
      const newList = itemImages.filter((_, i) => i !== index);
      setItemImages(newList);
    } else {
      setItemImages([null]);
    }
  };

  const updateItemImage = (index: number, file: File | null) => {
    const newList = [...itemImages];
    newList[index] = file;
    setItemImages(newList);
  };

  const tools = [
    { id: ToolId.MagicEditor, label: '매직 에디터', icon: Wand2, desc: 'AI로 사진의 사물을 제거하거나 특정 부분을 편집하세요.' },
    { id: ToolId.SketchToWebtoon, label: '스케치 투 웹툰', icon: Paintbrush, desc: '손으로 그린 스케치를 전문적인 웹툰 스타일로 변환하세요.' },
    { id: ToolId.IDPhotoMaker, label: '증명사진 메이커', icon: UserSquare, desc: '셀카를 바탕으로 전문적인 여권 또는 ID 사진을 생성하세요.' },
    { id: ToolId.FaceHairChanger, label: '헤어 & 페이스 체인저', icon: Scissors, desc: '새로운 헤어스타일과 표정을 즉시 적용해 보세요.' },
    { id: ToolId.FutureBaby, label: '2세 예측', icon: Baby, desc: '두 부모의 사진을 바탕으로 미래의 아기 모습을 예측합니다.' },
    { id: ToolId.AdPosterMaker, label: '광고 포스터 메이커', icon: Megaphone, desc: '제품 사진을 활용해 고퀄리티 광고 포스터를 제작하세요.' },
    { id: ToolId.TimeTraveler, label: '타임 트래블러', icon: History, desc: '다른 시대의 모습이나 나이 든 자신의 모습을 확인하세요.' },
    { id: ToolId.VirtualModelFitting, label: '가상 모델 피팅', icon: Shirt, desc: '여러 의류 아이템을 착용한 새로운 AI 가상 모델을 생성합니다.' },
    { id: ToolId.ItemSynthesis, label: '아이템 합성', icon: Layers, desc: '인물 사진에 여러 아이템을 자연스럽게 착용시킨 모습을 생성합니다.' },
    { id: ToolId.PersonaChat, label: '페르소나 채팅', icon: MessageSquare, desc: '캐릭터에게 생명력을 불어넣고 대화를 나눠보세요.' },
    { id: ToolId.Character360, label: '360도 캐릭터 뷰', icon: Rotate3d, desc: '캐릭터 사진을 업로드하면 앞, 옆, 뒤 턴어라운드 뷰를 생성합니다.' },
  ];

  const currentTool = tools.find(t => t.id === activeTab);

  const getToolLabel = () => {
    switch (activeTab) {
      case ToolId.FutureBaby: return "부모 1 사진";
      case ToolId.FaceHairChanger: return "본인 사진";
      case ToolId.Character360: return "캐릭터 사진 업로드";
      case ToolId.PersonaChat: return "대화할 캐릭터 사진";
      case ToolId.ItemSynthesis: return "합성할 인물 사진 (인물 정체성 유지)";
      default: return "이미지 업로드";
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#030712] text-gray-100 font-sans">
      {loading && <LoadingOverlay />}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-40 h-full glass border-r border-white/10 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-white" size={20} />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight">AI 스튜디오</span>}
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            {tools.map((tool) => (
              <SidebarItem key={tool.id} icon={tool.icon} label={isSidebarOpen ? tool.label : ''} active={activeTab === tool.id} onClick={() => setActiveTab(tool.id)} />
            ))}
          </nav>
          <div className="p-4 glass border-t border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0" />
              {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">프로 멤버</span>
                  <span className="text-xs text-gray-500">요금제 업그레이드</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="hidden md:flex glass border-b border-white/10 p-4 items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{currentTool?.label}</h1>
              <p className="text-xs text-gray-400">{currentTool?.desc}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
          <div className="max-w-[1600px] mx-auto h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-stretch min-h-0 h-full">
              
              {/* Left Panel */}
              <div className="glass rounded-2xl border border-white/10 flex flex-col shadow-xl h-full overflow-hidden">
                <div className="p-6 pb-2 shrink-0">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">설정 및 업로드</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                  {activeTab === ToolId.VirtualModelFitting || activeTab === ToolId.ItemSynthesis ? (
                    <div className="space-y-6 pb-6">
                      {activeTab === ToolId.ItemSynthesis && (
                        <ImageUpload 
                          key={`${activeTab}-person`}
                          label={getToolLabel()} 
                          onImageSelect={setImage1} 
                          selectedImage={image1} 
                        />
                      )}
                      
                      {activeTab === ToolId.VirtualModelFitting && (
                        <div className="flex flex-col gap-3">
                          <label className="text-sm font-medium text-gray-400">모델 성별 선택</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['남성', '여성'].map((g) => (
                              <button 
                                key={g} 
                                onClick={() => setOption(g)} 
                                className={`p-3 rounded-xl text-sm font-medium transition-all border ${option === g ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                              >
                                {g === '남성' ? '👨 남성 모델' : '👩 여성 모델'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between sticky top-0 bg-[#0c101b] z-10 py-3">
                        <label className="text-sm font-medium text-gray-400">아이템 사진 (최대 6개)</label>
                        <button 
                          onClick={addImageSlot}
                          disabled={itemImages.length >= 6}
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-full hover:bg-indigo-600/30 transition-all border border-indigo-500/20 disabled:opacity-30"
                        >
                          <Plus size={14} /> 추가하기
                        </button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                        {itemImages.map((img, idx) => (
                          <div key={`${activeTab}-item-${idx}`} className="relative group">
                            <ImageUpload 
                              label={`아이템 ${idx + 1}`} 
                              onImageSelect={(file) => updateItemImage(idx, file)} 
                              selectedImage={img}
                              className="h-44"
                            />
                            {itemImages.length > 1 && (
                              <button 
                                onClick={() => removeImageSlot(idx)}
                                className="absolute top-[34px] right-2 p-1.5 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-all border border-red-500/20 opacity-0 group-hover:opacity-100 z-20"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <ImageUpload 
                        key={`${activeTab}-upload-1`}
                        label={getToolLabel()} 
                        onImageSelect={setImage1} 
                        selectedImage={image1} 
                      />

                      {(activeTab === ToolId.FutureBaby || activeTab === ToolId.FaceHairChanger) && (
                        <ImageUpload 
                          key={`${activeTab}-upload-2`}
                          label={activeTab === ToolId.FutureBaby ? "부모 2 사진" : "원하는 헤어스타일 이미지"} 
                          onImageSelect={setImage2} 
                          selectedImage={image2} 
                        />
                      )}

                      <div className="flex flex-col gap-6">
                        {activeTab === ToolId.FutureBaby && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">2세의 성별 선택</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['아들', '딸'].map((g) => (
                                <button key={g} onClick={() => setOption(g)} className={`p-3 rounded-xl text-sm font-medium transition-all border ${option === g ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                  {g === '아들' ? '👦 아들' : '👧 딸'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeTab === ToolId.MagicEditor && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">편집 지시사항</label>
                            <textarea className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none" placeholder="예: 배경의 자동차를 지워주고 하늘을 노을진 풍경으로 바꿔줘..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                          </div>
                        )}

                        {activeTab === ToolId.FaceHairChanger && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">추가 상세 요청</label>
                            <input className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 머리 색상을 좀 더 밝게..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                          </div>
                        )}

                        {activeTab === ToolId.TimeTraveler && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">시대/나이 선택</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['유년기', '노년기', '1920년대', '1990년대', '사이버펑크'].map((era) => (
                                <button key={era} onClick={() => setOption(era)} className={`p-2.5 rounded-lg text-xs transition-all border ${option === era ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                  {era}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeTab === ToolId.AdPosterMaker && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">포스터 컨셉</label>
                            <input className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 미니멀 럭셔리, 테크 네온, 여름 감성..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 pt-2 shrink-0 border-t border-white/5 bg-[#0c101b]/50 backdrop-blur-md">
                  {activeTab !== ToolId.PersonaChat && (
                    <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-indigo-600/30">
                      <span>{loading ? 'AI 작업 중...' : 'AI로 결과 생성'}</span>
                      {!loading && <Sparkles className="group-hover:rotate-12 transition-transform" size={20} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Right Panel */}
              <div className="flex flex-col h-full overflow-hidden">
                {activeTab === ToolId.PersonaChat ? (
                  <div className="glass rounded-2xl border border-white/10 flex flex-col h-full shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden border border-white/10">
                        {image1 ? <img src={URL.createObjectURL(image1)} className="w-full h-full object-cover" alt="Persona" /> : <UserSquare size={20} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{image1 ? 'AI 캐릭터' : '캐릭터 사진을 업로드해주세요'}</p>
                        <span className="text-[10px] text-green-500 uppercase font-bold tracking-wider">온라인</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="메시지를 입력하세요..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                      <button onClick={handleChatSend} disabled={!image1} className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl">
                        <Sparkles size={18} />
                      </button>
                    </div>
                  </div>
                ) : result ? (
                  <div className="animate-in fade-in duration-500 h-full flex flex-col overflow-hidden">
                    <ResultDisplay imageUrl={result} originalImageUrl={originalImageUrl} title={`${currentTool?.label}`} onReset={() => setResult(null)} />
                  </div>
                ) : (
                  <div className="glass rounded-2xl border border-white/10 p-12 flex flex-col items-center justify-center text-center gap-6 bg-gradient-to-b from-transparent to-indigo-500/5 h-full shadow-inner">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2 shadow-inner border border-white/10">
                      {currentTool && <currentTool.icon className="text-indigo-400" size={40} />}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">생성 준비 완료</h2>
                      <p className="text-gray-400 text-sm max-w-[320px] leading-relaxed">
                        왼쪽 패널에서 사진을 업로드하고 설정을 마쳐주세요. <br/>AI가 당신의 상상을 현실로 만들어 드립니다.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] uppercase font-bold border border-indigo-500/20 text-indigo-400">High Resolution</span>
                      <span className="px-3 py-1 bg-purple-500/10 rounded-full text-[10px] uppercase font-bold border border-purple-500/20 text-purple-400">Fast Generation</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
