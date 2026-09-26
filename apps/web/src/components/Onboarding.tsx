import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EyeOff, Flame, Mic, Shield, HeartHandshake } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface OnboardingProps {
  onComplete: () => void;
  onOpenCrisis: () => void;
}

const STEPS = [
  {
    icon: Shield,
    title: '这里没有观众',
    body: 'YellOut 是为 30–55 岁成年人准备的匿名情绪树洞。不读通讯录，不绑社交账号，只留下脱敏后的声音。',
  },
  {
    icon: Mic,
    title: '按住倾诉，声线会被改写',
    body: '长按录音后，本地 DSP 会实时变调（厚重 / 机械 / 空灵），掩盖生理声线。松开发送到同温层；上滑则「焚入虚空」，音频永不上传。',
  },
  {
    icon: EyeOff,
    title: '代号随机，痕迹会自己消失',
    body: '每次发泄后代号会刷新。广场帖子默认 48 小时后自动焚毁，连同音频文件一并删除。',
  },
  {
    icon: Flame,
    title: '需要时，请停下来求助',
    body: '若系统或你自己感觉到情绪过载，请立刻使用「温暖守护」查看心理援助热线。你的存在比任何压力都珍贵。',
  },
];

export function Onboarding({ onComplete, onOpenCrisis }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-obsidian/95 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl border border-void-border bg-obsidian-raised overflow-hidden shadow-2xl"
      >
        <div className="relative h-36 sm:h-44 overflow-hidden">
          <img
            src="/yellout-logo.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-raised via-obsidian/70 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="font-display text-3xl text-snow">YellOut</p>
            <p className="text-xs text-amber mt-1">声波破晓 · 咆哮释然</p>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5">
          <div className="flex gap-1.5 mb-4" aria-hidden>
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-ember' : 'bg-void'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              <div className="flex items-center gap-2 text-amber mb-2">
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wide">
                  {step + 1} / {STEPS.length}
                </span>
              </div>
              <h2 className="font-display text-2xl text-snow text-balance">{current.title}</h2>
              <p className="text-sm text-mist leading-relaxed mt-3">{current.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                haptic.triggerTick();
                onOpenCrisis();
              }}
              className="sm:mr-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-amber border border-amber/30 hover:bg-amber/10"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              心理援助热线
            </button>
            {!isLast ? (
              <button
                type="button"
                onClick={() => {
                  haptic.triggerTick();
                  setStep((s) => s + 1);
                }}
                className="flex-1 py-2.5 rounded-xl bg-ember text-obsidian font-semibold text-sm hover:bg-ember-soft transition-colors"
              >
                继续
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  haptic.triggerRelease();
                  onComplete();
                }}
                className="flex-1 py-2.5 rounded-xl bg-ember text-obsidian font-semibold text-sm hover:bg-ember-soft transition-colors"
              >
                我明白了，进入树洞
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
