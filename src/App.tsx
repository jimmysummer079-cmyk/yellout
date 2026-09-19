import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, HeartHandshake, PhoneCall, HelpCircle, Smartphone, Monitor, CloudRain, Layers } from 'lucide-react';
import { VentPost } from './types';
import { INITIAL_POSTS } from './utils/mockData';
import { generateCodename } from './utils/codenames';
import { VentingScreen } from './components/VentingScreen';
import { PlazaScreen } from './components/PlazaScreen';
import { NavBar } from './components/NavBar';
import { PrivacyBanner } from './components/PrivacyBanner';
import { CrisisModal } from './components/CrisisModal';
import { CustomTagModal } from './components/CustomTagModal';
import { ProductChartModal } from './components/ProductChartModal';
import { haptic } from './utils/haptics';
import { AmbientRainSound } from './utils/audioDsp';
import yelloutLogoImg from './assets/images/yellout_logo_1789808350358.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState<'vent' | 'plaza'>('vent');
  const [currentCodename, setCurrentCodename] = useState<string>(generateCodename);
  const [posts, setPosts] = useState<VentPost[]>(INITIAL_POSTS);
  const [customTags, setCustomTags] = useState<string[]>(['房贷']);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState<boolean>(false);
  const [isCustomTagModalOpen, setIsCustomTagModalOpen] = useState<boolean>(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [isRainActive, setIsRainActive] = useState<boolean>(false);

  const ambientRainRef = useRef<AmbientRainSound | null>(null);

  useEffect(() => {
    ambientRainRef.current = new AmbientRainSound();
    return () => {
      if (ambientRainRef.current) {
        ambientRainRef.current.stop();
      }
    };
  }, []);

  const toggleAmbientRain = () => {
    haptic.triggerTick();
    if (!ambientRainRef.current) return;
    if (isRainActive) {
      ambientRainRef.current.stop();
      setIsRainActive(false);
    } else {
      ambientRainRef.current.start();
      setIsRainActive(true);
    }
  };

  // 刷新当前脱敏身份代号（发泄完成后自动刷新，或手动刷新）
  const handleRefreshCodename = () => {
    setCurrentCodename(generateCodename());
  };

  // 用户完成了一次倾诉发泄，自动推送到同温层广场
  const handlePostCreated = (newPost: VentPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  // 更新帖子（互动点赞、短语音评论）
  const handleUpdatePost = (updatedPost: VentPost) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  // 添加自定义目标标签（限4字）
  const handleAddCustomTag = (tagName: string) => {
    if (!customTags.includes(tagName)) {
      setCustomTags((prev) => [...prev, tagName]);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-start selection:bg-amber-500/30 selection:text-amber-200">
      {/* 桌面端工具栏（画幅切换与危机求助快捷口） */}
      <header className="w-full bg-slate-950/80 border-b border-slate-800/80 px-3 sm:px-4 py-2 flex items-center justify-between text-xs z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic.triggerTick();
              setIsChartModalOpen(true);
            }}
            className="flex items-center gap-1.5 p-1 -ml-1 rounded-lg hover:bg-slate-800/80 transition-colors group"
            title="查看 YellOut 官方品牌 Logo 与产品全景架构图表"
          >
            <img
              src={yelloutLogoImg}
              alt="YellOut Logo"
              className="w-6 h-6 rounded-md object-cover border border-amber-500/50 shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-slate-100 tracking-wide text-xs group-hover:text-amber-300 transition-colors">
              YellOut
            </span>
          </button>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <h1 className="font-semibold text-slate-200 tracking-wide text-xs hidden sm:inline">
            中年情绪发泄树洞
          </h1>
          <span className="text-[11px] text-slate-500 hidden lg:inline">
            | 30-55岁无负担情绪避难所
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* 品牌图表与架构按钮 */}
          <button
            onClick={() => {
              haptic.triggerTick();
              setIsChartModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-amber-300 font-medium transition-colors"
            title="查看产品全景图表与官方 Logo"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">产品图表 & Logo</span>
          </button>

          {/* 车窗夜雨沉浸底噪开关 */}
          <button
            onClick={toggleAmbientRain}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              isRainActive
                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50 shadow-sm shadow-sky-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="开启/关闭「车窗夜雨」沉浸底噪（模拟下班车库避难所氛围）"
          >
            <CloudRain className={`w-3.5 h-3.5 ${isRainActive ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{isRainActive ? '车窗夜雨' : '车窗夜雨'}</span>
            {isRainActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />}
          </button>

          <button
            onClick={() => {
              haptic.triggerTick();
              setIsCrisisModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium transition-colors"
            title="心理援助热线与危机干预"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">温暖守护</span>
          </button>

          {/* 桌面端切换移动画幅/全宽显示 */}
          <button
            onClick={() => {
              haptic.triggerTick();
              setIsMobileFrame(!isMobileFrame);
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors hidden md:flex items-center gap-1"
            title={isMobileFrame ? '切换为大屏宽幅' : '切换为拟真手机画幅'}
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[11px]">宽幅</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px]">手机画幅</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 核心应用容器 */}
      <main
        className={`w-full flex-1 flex flex-col relative transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-md my-0 sm:my-3 border-x sm:border border-slate-800 sm:rounded-3xl shadow-2xl bg-gradient-to-b from-[#0b1220] via-[#090e1a] to-[#070b14] overflow-hidden min-h-[calc(100vh-42px)] sm:min-h-[820px]'
            : 'max-w-2xl bg-gradient-to-b from-[#0b1220] via-[#090e1a] to-[#070b14] border-x border-slate-800 min-h-[calc(100vh-42px)]'
        }`}
      >
        {/* 脱敏安全状态横幅 */}
        <PrivacyBanner />

        {/* 核心视图切换 */}
        {activeTab === 'vent' ? (
          <VentingScreen
            currentCodename={currentCodename}
            onRefreshCodename={handleRefreshCodename}
            onPostCreated={(newPost) => {
              handlePostCreated(newPost);
              // 也可以选择发完后停留并提示，或者随时可点击同温层查看
            }}
            onOpenCustomTagModal={() => setIsCustomTagModalOpen(true)}
            customTags={customTags}
            onTriggerCrisisModal={() => setIsCrisisModalOpen(true)}
          />
        ) : (
          <PlazaScreen
            posts={posts}
            onUpdatePost={handleUpdatePost}
            currentCodename={currentCodename}
          />
        )}

        {/* 底部导航栏 */}
        <NavBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          plazaCount={posts.length}
        />
      </main>

      {/* 模态弹窗 */}
      <CrisisModal
        isOpen={isCrisisModalOpen}
        onClose={() => setIsCrisisModalOpen(false)}
      />

      <CustomTagModal
        isOpen={isCustomTagModalOpen}
        onClose={() => setIsCustomTagModalOpen(false)}
        onAddTag={handleAddCustomTag}
      />

      <ProductChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
      />
    </div>
  );
}
