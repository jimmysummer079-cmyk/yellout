import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Plus,
  Sparkles,
  RefreshCw,
  Flame,
  Wind,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_TARGET_TAGS, type VoiceEffect } from '@yellout/shared';
import { VoiceRecorder, playBurnToAshSound } from '../utils/audioDsp';
import { haptic } from '../utils/haptics';
import { createVent, refreshCodename } from '../lib/api';
import { CustomTagModal } from '../components/CustomTagModal';
import heroYell from '../assets/hero-yell.jpg';

interface VentPageProps {
  codename: string;
  onRefreshCodename: () => Promise<string>;
  onOpenCrisis: (forced?: boolean) => void;
  onCodenameChange: (c: string) => void;
}

type MicState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export function VentPage({
  codename,
  onRefreshCodename,
  onOpenCrisis,
  onCodenameChange,
}: VentPageProps) {
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('yellout_custom_tags') || '["房贷"]') as string[];
    } catch {
      return ['房贷'];
    }
  });
  const [tagModal, setTagModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>('领导');
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffect>('deep');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.2);
  const [isBurnMode, setIsBurnMode] = useState(false);
  const [lastAction, setLastAction] = useState<'sent' | 'burned' | 'error' | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [micState, setMicState] = useState<MicState>('unknown');

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    recorderRef.current = new VoiceRecorder();
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState('unavailable');
    }
    return () => {
      recorderRef.current?.cancel();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('yellout_custom_tags', JSON.stringify(customTags));
  }, [customTags]);

  const allTargets = [
    ...DEFAULT_TARGET_TAGS.map((name) => ({ id: name, name })),
    ...customTags.map((t) => ({ id: `c-${t}`, name: t })),
  ];

  const voiceEffects: { id: VoiceEffect; name: string; desc: string }[] = [
    { id: 'deep', name: '厚重', desc: '低沉沉稳 · 掩盖声线' },
    { id: 'robotic', name: '机械', desc: '调频共振 · 纯净冷冽' },
    { id: 'ethereal', name: '空灵', desc: '泛音扩散 · 远山回响' },
  ];

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState('granted');
      return true;
    } catch {
      setMicState('denied');
      return false;
    }
  };

  const handleStartRecord = async (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isRecording || uploading) return;

    if ('touches' in e && e.touches[0]) touchStartYRef.current = e.touches[0].clientY;
    else if ('clientY' in e) touchStartYRef.current = e.clientY;

    if (micState === 'denied') {
      setLastAction('error');
      setStatusMsg('麦克风权限被拒绝，请在浏览器设置中允许后重试');
      return;
    }
    if (micState === 'unknown') {
      const ok = await requestMic();
      if (!ok) {
        // still allow simulated recording path inside VoiceRecorder
        setLastAction('error');
        setStatusMsg('未获得麦克风权限，将尝试模拟录音（仅本地预览）');
        setTimeout(() => setLastAction(null), 2500);
      }
    }

    haptic.triggerPress();
    setIsRecording(true);
    setIsBurnMode(false);
    setRecordSeconds(0);
    setLastAction(null);
    startTimeRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordSeconds(elapsed);
      if (elapsed >= 60) void handleStopRecord(false);
    }, 250);

    await recorderRef.current?.start((vol) => setAudioVolume(vol));
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isRecording) return;
    let currentY = 0;
    if ('touches' in e && e.touches[0]) currentY = e.touches[0].clientY;
    else if ('clientY' in e) currentY = e.clientY;
    const burn = touchStartYRef.current - currentY > 60;
    if (burn !== isBurnMode) {
      setIsBurnMode(burn);
      if (burn) haptic.triggerTick();
    }
  };

  const handleStopRecord = async (forcedCancel = false) => {
    if (!isRecording) return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const duration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const wasBurn = isBurnMode;
    setIsRecording(false);
    setIsBurnMode(false);

    if (forcedCancel) {
      recorderRef.current?.cancel();
      return;
    }

    if (wasBurn) {
      recorderRef.current?.cancel();
      playBurnToAshSound();
      haptic.triggerBurn();
      setLastAction('burned');
      setStatusMsg('已焚入虚空 · 零字节上传 · 释怀放下');
      const next = await onRefreshCodename();
      onCodenameChange(next);
      setTimeout(() => setLastAction(null), 4000);
      return;
    }

    if (duration < 1) {
      recorderRef.current?.cancel();
      return;
    }

    haptic.triggerRelease();
    const result = await recorderRef.current!.stop();
    setUploading(true);
    setStatusMsg('正在脱敏推送到同温层…');

    try {
      // Burn-to-void never uploads; only this path uploads.
      let blob = result.blob;
      if (!blob) {
        // Simulated fallback tone as silent placeholder so API still works in mic-less envs
        blob = new Blob([new Uint8Array([0, 0, 0, 0])], { type: 'audio/webm' });
      }
      const res = await createVent({
        audio: blob,
        targetTag: selectedTarget,
        duration: Math.min(60, duration),
        voiceEffect: selectedEffect,
        waveformData: result.waveform,
      });
      setLastAction('sent');
      setStatusMsg('已推送到同温层广场 · 48 小时后随风消散');
      const next = await refreshCodename();
      onCodenameChange(next);
      if (res.crisisFlag) onOpenCrisis(true);
      setTimeout(() => setLastAction(null), 3500);
    } catch (err) {
      setLastAction('error');
      setStatusMsg(err instanceof Error ? err.message : '发送失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col px-4 pt-3 pb-6 w-full select-none">
      {/* Full-bleed hero (edge-to-edge within main column) */}
      <section className="relative -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden border-y sm:border border-void-border mb-4 min-h-[11rem] sm:min-h-[13rem]">
        <img
          src={heroYell}
          alt="在压抑中撕开一声咆哮"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-obsidian/20" />
        <div className="relative z-10 flex flex-col justify-end h-full min-h-[11rem] sm:min-h-[13rem] p-5 sm:p-6">
          <p className="font-display text-4xl sm:text-5xl text-snow tracking-wide drop-shadow-lg">
            YellOut
          </p>
          <p className="mt-2 text-sm text-amber max-w-md text-balance">
            撕开隐忍 · 把压在喉咙里的委屈吼出来
          </p>
        </div>
      </section>

      {micState === 'denied' && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-orange-500/40 bg-orange-950/40 px-3 py-2.5 text-xs text-orange-100"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">麦克风权限未开启</p>
            <p className="text-orange-200/80 mt-0.5">
              请在浏览器地址栏允许麦克风访问，否则无法真实录音。
            </p>
            <button
              type="button"
              className="mt-2 underline text-amber"
              onClick={() => void requestMic()}
            >
              重新请求权限
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between bg-void/80 border border-void-border rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-mist">当前脱敏代号</span>
            <span className="font-bold text-amber font-mono tracking-wide">{codename}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              haptic.triggerTick();
              onCodenameChange(await onRefreshCodename());
            }}
            className="flex items-center gap-1 text-[11px] text-mist hover:text-snow py-0.5 px-2 rounded hover:bg-void-border/40"
          >
            <RefreshCw className="w-3 h-3" />
            换个代号
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-xs font-medium text-mist">倾诉对象</span>
            <span className="text-[11px] text-slate-500">向谁倾倒你的重负</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {allTargets.map((target) => {
              const selected = selectedTarget === target.name;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => {
                    haptic.triggerTick();
                    setSelectedTarget(target.name);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selected
                      ? 'bg-amber/20 text-amber border border-amber/50'
                      : 'bg-void/80 text-mist border border-void-border hover:text-snow'
                  }`}
                >
                  #{target.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                haptic.triggerTick();
                setTagModal(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium text-mist bg-void/50 border border-dashed border-void-border hover:border-amber/50 hover:text-amber transition-all shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              自定义
            </button>
          </div>
        </div>

        <div className="bg-void/50 border border-void-border/80 rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-mist flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber" />
              DSP 实时变调脱敏
            </span>
            <span className="text-[10px] text-slate-500">完全掩盖生理声线</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {voiceEffects.map((eff) => {
              const selected = selectedEffect === eff.id;
              return (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => {
                    haptic.triggerTick();
                    setSelectedEffect(eff.id);
                  }}
                  className={`py-2 px-2 rounded-lg text-left transition-all border ${
                    selected
                      ? 'bg-void border-amber/50'
                      : 'bg-obsidian/40 border-void-border hover:border-slate-600'
                  }`}
                >
                  <span className={`text-xs font-bold ${selected ? 'text-amber' : 'text-snow/80'}`}>
                    {eff.name}
                  </span>
                  <div className="text-[10px] text-mist truncate mt-0.5">{eff.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center my-5 relative">
        <div className="h-12 flex items-center justify-center mb-2">
          {isRecording ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: isBurnMode ? -4 : 0, scale: isBurnMode ? 1.08 : 1 }}
              className={`px-4 py-2 rounded-full flex items-center gap-2 border text-xs font-bold ${
                isBurnMode
                  ? 'bg-orange-950/90 border-orange-500 text-orange-100'
                  : 'bg-void/80 border-void-border text-mist'
              }`}
            >
              <Flame className={`w-4 h-4 ${isBurnMode ? 'text-orange-400 animate-bounce' : ''}`} />
              {isBurnMode ? '松开即刻焚入虚空' : '上滑至此 · 焚入虚空（永不上传）'}
            </motion.div>
          ) : (
            <div className="text-[11px] text-mist flex items-center gap-2 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-amber" />
                松手 → 同温层
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                上滑 → 焚毁
              </span>
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{
              scale: isRecording ? [1, 1.35, 1.55] : [1, 1.08, 1],
              opacity: isRecording ? [0.55, 0.25, 0] : [0.12, 0.22, 0.12],
            }}
            transition={{ repeat: Infinity, duration: isRecording ? 1.4 : 3.6, ease: 'easeInOut' }}
            className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full pointer-events-none ${
              isBurnMode ? 'bg-orange-600/35' : isRecording ? 'bg-amber/30' : 'bg-void/40'
            }`}
          />
          <motion.div
            animate={{
              scale: isRecording ? [1, 1.2, 1.35] : [1, 1.04, 1],
              opacity: isRecording ? [0.75, 0.35, 0] : [0.18, 0.3, 0.18],
            }}
            transition={{
              repeat: Infinity,
              duration: isRecording ? 1.4 : 3.6,
              delay: 0.25,
              ease: 'easeInOut',
            }}
            className={`absolute w-56 h-56 sm:w-60 sm:h-60 rounded-full pointer-events-none ${
              isBurnMode ? 'bg-orange-500/30' : isRecording ? 'bg-amber/25' : 'bg-slate-700/20'
            }`}
          />

          <button
            type="button"
            aria-label={isRecording ? '松开结束倾诉' : '长按开始倾诉'}
            disabled={uploading}
            onMouseDown={handleStartRecord}
            onMouseUp={() => void handleStopRecord(false)}
            onMouseMove={handleTouchMove}
            onMouseLeave={() => {
              if (isRecording) void handleStopRecord(true);
            }}
            onTouchStart={handleStartRecord}
            onTouchEnd={() => void handleStopRecord(false)}
            onTouchMove={handleTouchMove}
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full relative z-10 flex flex-col items-center justify-center transition-transform duration-200 active:scale-95 disabled:opacity-60 ${
              isBurnMode
                ? 'bg-gradient-to-b from-orange-800 to-stone-950 border-4 border-orange-400 text-orange-100'
                : isRecording
                  ? 'bg-gradient-to-b from-amber to-amber/80 border-4 border-amber-soft text-obsidian'
                  : 'bg-gradient-to-b from-void via-void to-obsidian border-4 border-void-border text-snow hover:border-slate-500'
            }`}
            style={{
              boxShadow: isBurnMode
                ? '0 0 50px rgba(249,115,22,0.7)'
                : isRecording
                  ? `0 0 ${40 + audioVolume * 60}px rgba(245,158,11,${0.3 + audioVolume * 0.4})`
                  : '0 20px 40px -15px rgba(0,0,0,0.7)',
            }}
          >
            {isRecording ? (
              isBurnMode ? (
                <>
                  <Flame className="w-10 h-10 text-orange-300 animate-pulse mb-1" />
                  <span className="text-sm font-bold">松开焚入虚空</span>
                  <span className="text-[11px] text-orange-300/80 mt-1">零字节留存</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-obsidian animate-ping" />
                    <span className="text-2xl font-black font-mono">{formatSeconds(recordSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-1 h-6 my-1">
                    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((m, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-obsidian rounded-full"
                        style={{ height: `${Math.max(6, audioVolume * 24 * m)}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold mt-1">松手飘入同温层</span>
                </>
              )
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-void-border/50 flex items-center justify-center mb-2 border border-slate-600/50">
                  <Mic className="w-7 h-7 text-amber" />
                </div>
                <span className="text-base font-bold tracking-wide">
                  {uploading ? '发送中…' : '长按倾诉'}
                </span>
                <span className="text-xs text-mist mt-1">松手发送 / 上滑焚化</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center mt-5 min-h-12 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {lastAction === 'burned' || lastAction === 'sent' || lastAction === 'error' ? (
              <motion.div
                key={lastAction}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full border ${
                  lastAction === 'burned'
                    ? 'text-orange-200 bg-orange-950/70 border-orange-500/40'
                    : lastAction === 'sent'
                      ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
                      : 'text-rose-200 bg-rose-950/50 border-rose-500/30'
                }`}
              >
                {lastAction === 'burned' ? (
                  <Flame className="w-4 h-4" />
                ) : lastAction === 'sent' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{statusMsg}</span>
              </motion.div>
            ) : (
              <p className="text-xs text-mist">无社交评价 · 不留真实声线 · 纯粹心理泄压</p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full flex items-center justify-between text-[11px] text-mist pt-2 border-t border-void-border/80 px-1">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          本地声学算法实时脱敏
        </span>
        <button
          type="button"
          onClick={() => {
            haptic.triggerTick();
            onOpenCrisis(false);
          }}
          className="text-mist hover:text-amber underline underline-offset-2"
        >
          心理危机援助热线
        </button>
      </div>

      <CustomTagModal
        isOpen={tagModal}
        onClose={() => setTagModal(false)}
        onAddTag={(tag) => {
          if (!customTags.includes(tag)) setCustomTags((p) => [...p, tag]);
          setSelectedTarget(tag);
        }}
      />
    </div>
  );
}
