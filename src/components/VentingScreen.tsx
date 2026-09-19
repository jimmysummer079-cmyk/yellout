import React, { useState, useRef, useEffect } from 'react';
import { Mic, Plus, Sparkles, RefreshCw, Volume2, Shield, Flame, Wind, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TargetOption, VoiceEffect, VentPost } from '../types';
import { VoiceRecorder, playBurnToAshSound } from '../utils/audioDsp';
import { haptic } from '../utils/haptics';
import { generateCodename } from '../utils/codenames';
import yellCoverImg from '../assets/images/yell_catharsis_bg_1789806964056.jpg';

interface VentingScreenProps {
  currentCodename: string;
  onRefreshCodename: () => void;
  onPostCreated: (post: VentPost) => void;
  onOpenCustomTagModal: () => void;
  customTags: string[];
  onTriggerCrisisModal: () => void;
}

export const VentingScreen: React.FC<VentingScreenProps> = ({
  currentCodename,
  onRefreshCodename,
  onPostCreated,
  onOpenCustomTagModal,
  customTags,
  onTriggerCrisisModal,
}) => {
  // 预设发泄目标标签
  const defaultTargets: TargetOption[] = [
    { id: 'leader', name: '领导' },
    { id: 'partner', name: '伴侣' },
    { id: 'client', name: '客户' },
    { id: 'life', name: '生活' },
    { id: 'anonymous', name: '匿名' },
  ];

  const allTargets: TargetOption[] = [
    ...defaultTargets,
    ...customTags.map((t) => ({ id: `custom-${t}`, name: t, isCustom: true })),
  ];

  const [selectedTarget, setSelectedTarget] = useState<string>('领导');
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffect>('deep');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.2);
  const [isBurnMode, setIsBurnMode] = useState(false);
  const [lastActionStatus, setLastActionStatus] = useState<'sent' | 'burned' | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // 初始化录音机
  useEffect(() => {
    recorderRef.current = new VoiceRecorder();
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const voiceEffects: { id: VoiceEffect; name: string; desc: string; icon: string }[] = [
    { id: 'deep', name: '厚重', desc: '低沉沉稳 · 掩盖声线', icon: '🎙️' },
    { id: 'robotic', name: '机械', desc: '调频共振 · 纯净冷冽', icon: '⚙️' },
    { id: 'ethereal', name: '空灵', desc: '泛音扩散 · 远山回响', icon: '🌌' },
  ];

  // 开始长按倾诉
  const handleStartRecord = async (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) return;

    if ('touches' in e && e.touches.length > 0) {
      touchStartYRef.current = e.touches[0].clientY;
    } else if ('clientY' in e) {
      touchStartYRef.current = e.clientY;
    }

    haptic.triggerPress();
    setIsRecording(true);
    setIsBurnMode(false);
    setRecordSeconds(0);
    startTimeRef.current = Date.now();

    // 计时器（最长 60 秒）
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordSeconds(elapsed);
      if (elapsed >= 60) {
        handleStopRecord(false);
      }
    }, 250);

    if (recorderRef.current) {
      await recorderRef.current.start((vol) => {
        setAudioVolume(vol);
      });
    }
  };

  // 手指滑动检测（上滑超过 60px 进入“焚入虚空”模式）
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isRecording) return;
    let currentY = 0;
    if ('touches' in e && e.touches.length > 0) {
      currentY = e.touches[0].clientY;
    } else if ('clientY' in e) {
      currentY = e.clientY;
    }
    // 上滑超过 60px 触发焚烧虚空状态
    if (touchStartYRef.current - currentY > 60) {
      if (!isBurnMode) {
        setIsBurnMode(true);
        haptic.triggerTick();
      }
    } else {
      if (isBurnMode) {
        setIsBurnMode(false);
      }
    }
  };

  // 释放完成倾诉：焚入虚空 或 飘入同温层
  const handleStopRecord = async (isForcedCancel = false) => {
    if (!isRecording) return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const wasInBurnMode = isBurnMode;
    setIsRecording(false);
    setIsBurnMode(false);

    if (isForcedCancel) {
      if (recorderRef.current) recorderRef.current.cancel();
      return;
    }

    // 模式 A：焚入虚空（化为灰烬，不向外发送，不留一字节）
    if (wasInBurnMode) {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
      playBurnToAshSound();
      haptic.triggerBurn();
      setLastActionStatus('burned');
      setTimeout(() => setLastActionStatus(null), 4000);
      // 脱敏：刷新代号
      onRefreshCodename();
      return;
    }

    // 模式 B：时间过短微调
    if (duration < 1) {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
      return;
    }

    // 模式 C：飘入同温层广场（24小时后自动焚毁）
    haptic.triggerRelease();

    if (recorderRef.current) {
      const result = await recorderRef.current.stop();
      let audioBlobUrl: string | undefined;
      if (result.blob) {
        audioBlobUrl = URL.createObjectURL(result.blob);
      }

      // 构建发泄帖子
      const newPost: VentPost = {
        id: `vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        codename: currentCodename,
        targetTag: selectedTarget,
        duration: Math.min(60, duration),
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 3600 * 1000,
        voiceEffect: selectedEffect,
        waveformData: result.waveform,
        audioBlobUrl,
        reactions: {
          hugs: 1,
          understands: 1,
          resonates: 1,
        },
        userReactions: {
          hugs: false,
          understands: false,
          resonates: false,
        },
        voiceReplies: [],
        moodWhisper: '“深吸了一口气，终于把压在心底的话倾倒了出来...”',
      };

      onPostCreated(newPost);
      setLastActionStatus('sent');
      setTimeout(() => setLastActionStatus(null), 3500);

      // PRD 规范：身份脱敏，代号随发泄次数动态更新
      onRefreshCodename();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 pt-3 pb-6 max-w-md mx-auto w-full select-none relative">
      {/* YELL 咆哮封面横幅 (打工人/白领大喊发泄的灵魂视觉) */}
      <div className="w-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl mb-3 group shrink-0">
        <img
          src={yellCoverImg}
          alt="YELL 咆哮发泄封面"
          referrerPolicy="no-referrer"
          className="w-full h-28 sm:h-32 object-cover object-center transform group-hover:scale-105 transition-transform duration-700 brightness-90"
        />
        {/* 暗色渐变遮罩，保证文字清晰且氛围深沉 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090e1a] via-[#090e1a]/65 to-transparent flex flex-col justify-end p-3 sm:p-3.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black tracking-widest text-[10px] uppercase shadow-sm">
              YELL · 咆哮
            </span>
            <span className="text-[11px] text-amber-300/90 font-medium">
              撕开隐忍 · 允许自己大喊一声
            </span>
          </div>
          <p className="text-xs text-slate-300 font-light truncate">
            面对账单、领导与家庭，在这里把憋在喉咙里的委屈全吼出来
          </p>
        </div>
      </div>

      {/* 顶部脱敏身份栏与发泄对象选择 */}
      <div className="w-full space-y-3">
        {/* 动态代号展示 */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">当前脱敏代号:</span>
            <span className="text-xs font-bold text-amber-300 font-mono tracking-wide">
              {currentCodename}
            </span>
          </div>
          <button
            onClick={() => {
              haptic.triggerTick();
              onRefreshCodename();
            }}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-0.5 px-2 rounded hover:bg-slate-800"
            title="手动刷新动态代号"
          >
            <RefreshCw className="w-3 h-3" />
            <span>换个代号</span>
          </button>
        </div>

        {/* 对象选择器 (水平滑块，支持+号自定义) */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-xs font-medium text-slate-400">倾诉对象</span>
            <span className="text-[11px] text-slate-500">向谁倾倒你的重负</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {allTargets.map((target) => {
              const isSelected = selectedTarget === target.name;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    haptic.triggerTick();
                    setSelectedTarget(target.name);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  #{target.name}
                </button>
              );
            })}

            {/* + 号极简自定义（限4字） */}
            <button
              onClick={() => {
                haptic.triggerTick();
                onOpenCustomTagModal();
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-800/50 border border-dashed border-slate-700 hover:border-amber-500/50 hover:text-amber-300 transition-all shrink-0 flex items-center gap-1"
              title="添加自定义标签（限4字）"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>自定义</span>
            </button>
          </div>
        </div>

        {/* 变声脱敏方案选择 */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>DSP 实时变调脱敏</span>
            </span>
            <span className="text-[10px] text-slate-500">完全掩盖生理声线</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {voiceEffects.map((eff) => {
              const isSelected = selectedEffect === eff.id;
              return (
                <button
                  key={eff.id}
                  onClick={() => {
                    haptic.triggerTick();
                    setSelectedEffect(eff.id);
                  }}
                  className={`py-2 px-2 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{eff.icon}</span>
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {eff.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{eff.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 核心按键区域 (含「焚入虚空」与「飘向同温层」双向极简出口) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-3 relative">
        {/* 上方【🔥 焚入虚空】拖拽释放指示区 */}
        <div className="h-14 flex items-center justify-center mb-2">
          {isRecording ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: isBurnMode ? -4 : 0,
                scale: isBurnMode ? 1.12 : 1,
              }}
              className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-colors ${
                isBurnMode
                  ? 'bg-orange-950/90 border-orange-500 text-orange-200 shadow-lg shadow-orange-500/40'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400'
              }`}
            >
              <Flame
                className={`w-4 h-4 ${
                  isBurnMode ? 'text-orange-400 animate-bounce' : 'text-slate-400'
                }`}
              />
              <span className="text-xs font-bold">
                {isBurnMode ? '松开即刻【焚入虚空 · 化为灰烬】' : '上滑拖至此处焚入虚空 (立毁不存)'}
              </span>
            </motion.div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                松手 ➔ 飘向同温层
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                上滑 ➔ 焚入虚空化灰
              </span>
            </div>
          )}
        </div>

        {/* 背景呼吸光晕与水波纹效果 */}
        <div className="relative flex items-center justify-center">
          {/* 扩散波纹 1 */}
          <motion.div
            animate={{
              scale: isRecording ? [1, 1.35, 1.55] : [1, 1.08, 1],
              opacity: isRecording ? [0.6, 0.3, 0] : [0.15, 0.25, 0.15],
            }}
            transition={{
              repeat: Infinity,
              duration: isRecording ? 1.4 : 3.6,
              ease: 'easeInOut',
            }}
            className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full pointer-events-none ${
              isBurnMode
                ? 'bg-orange-600/35'
                : isRecording
                ? 'bg-amber-500/30'
                : 'bg-slate-800/40'
            }`}
          />

          {/* 扩散波纹 2 */}
          <motion.div
            animate={{
              scale: isRecording ? [1, 1.2, 1.35] : [1, 1.04, 1],
              opacity: isRecording ? [0.8, 0.4, 0] : [0.2, 0.35, 0.2],
            }}
            transition={{
              repeat: Infinity,
              duration: isRecording ? 1.4 : 3.6,
              delay: isRecording ? 0.3 : 0,
              ease: 'easeInOut',
            }}
            className={`absolute w-56 h-56 sm:w-60 sm:h-60 rounded-full pointer-events-none ${
              isBurnMode
                ? 'bg-orange-500/30'
                : isRecording
                ? 'bg-amber-400/25'
                : 'bg-slate-700/20'
            }`}
          />

          {/* The Big Button 本体 */}
          <button
            id="the-big-vent-button"
            onMouseDown={handleStartRecord}
            onMouseUp={() => handleStopRecord(false)}
            onMouseMove={handleTouchMove}
            onMouseLeave={() => {
              if (isRecording) handleStopRecord(true);
            }}
            onTouchStart={handleStartRecord}
            onTouchEnd={() => handleStopRecord(false)}
            onTouchMove={handleTouchMove}
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full relative z-10 flex flex-col items-center justify-center transition-transform duration-200 cursor-pointer shadow-2xl active:scale-95 ${
              isBurnMode
                ? 'bg-gradient-to-b from-orange-800 to-stone-950 border-4 border-orange-400 text-orange-100 shadow-orange-950/90'
                : isRecording
                ? 'bg-gradient-to-b from-amber-600 to-amber-800 border-4 border-amber-300 text-slate-950 shadow-amber-900/80'
                : 'bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-4 border-slate-700 text-slate-200 hover:border-slate-600 hover:from-slate-750 shadow-slate-950/80'
            }`}
            style={{
              boxShadow: isBurnMode
                ? `0 0 50px rgba(249, 115, 22, 0.7)`
                : isRecording
                ? `0 0 ${40 + audioVolume * 60}px rgba(245, 158, 11, ${0.3 + audioVolume * 0.4})`
                : '0 20px 40px -15px rgba(0,0,0,0.7)',
            }}
          >
            {isRecording ? (
              <div className="flex flex-col items-center">
                {isBurnMode ? (
                  <>
                    <Flame className="w-10 h-10 text-orange-300 animate-pulse mb-1" />
                    <span className="text-sm font-bold text-orange-100">松开焚入虚空</span>
                    <span className="text-[11px] text-orange-300/80 mt-1">
                      化为灰烬 · 零字节留存
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 mb-1 text-slate-950">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
                      <span className="text-2xl font-black font-mono tracking-wider">
                        {formatSeconds(recordSeconds)}
                      </span>
                    </div>
                    {/* 动态音量声波跳动 */}
                    <div className="flex items-center gap-1 h-6 my-1">
                      {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((multiplier, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 bg-slate-950 rounded-full transition-all duration-75"
                          style={{
                            height: `${Math.max(6, audioVolume * 24 * multiplier)}px`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-950 mt-1">
                      松手飘入同温层
                    </span>
                    <span className="text-[10px] text-slate-900/70 mt-0.5">
                      ↑ 上滑焚入虚空
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center px-4">
                <div className="w-14 h-14 rounded-full bg-slate-700/60 flex items-center justify-center mb-2 border border-slate-600/50">
                  <Mic className="w-7 h-7 text-amber-400" />
                </div>
                <span className="text-base font-bold text-slate-100 tracking-wide">
                  长按倾诉
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  松手发送 / 上滑焚化
                </span>
              </div>
            )}
          </button>
        </div>

        {/* 状态指示信息与灰烬火星反馈 */}
        <div className="text-center mt-5 h-12 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {lastActionStatus === 'burned' ? (
              <motion.div
                key="burned-msg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 text-xs text-orange-300 bg-orange-950/70 border border-orange-500/40 px-3.5 py-1.5 rounded-full shadow-lg shadow-orange-950/50"
              >
                <Flame className="w-4 h-4 text-orange-400" />
                <span>已焚入虚空 · 化为灰烬 · 释怀放下 · 零痕迹残留</span>
              </motion.div>
            ) : lastActionStatus === 'sent' ? (
              <motion.div
                key="sent-msg"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>已脱敏推送到同温层广场 · 24小时后随风消散</span>
              </motion.div>
            ) : isRecording ? (
              <motion.div
                key="recording-msg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-slate-400 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  {isBurnMode
                    ? '准备焚毁，松手即灰飞烟灭'
                    : `正在进行「${selectedEffect === 'deep' ? '厚重' : selectedEffect === 'robotic' ? '机械' : '空灵'}」变声处理...`}
                </span>
              </motion.div>
            ) : (
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>无社交评价 · 不留真实声线 · 纯粹心理泄压</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 底部极简提示 */}
      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 px-1">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>本地声学算法实时脱敏</span>
        </span>
        <button
          onClick={() => {
            haptic.triggerTick();
            onTriggerCrisisModal();
          }}
          className="text-slate-400 hover:text-amber-400 transition-colors underline underline-offset-2"
        >
          心理危机援助热线
        </button>
      </div>
    </div>
  );
};
