import { Phone, HeartHandshake, ShieldAlert, X } from 'lucide-react';
import { motion } from 'motion/react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  forced?: boolean;
}

const HOTLINES = [
  { name: '全国希望24小时生命危机干预热线', number: '400-161-9995', desc: '全天候专业心理危机援助' },
  { name: '北京心理危机研究与干预热线', number: '010-82951332', desc: '国家级心理防线与倾听' },
  { name: '全国妇联与家庭心理援助热线', number: '12338', desc: '家庭关爱与女性心理支持' },
  { name: '全国共青团与家庭危机热线', number: '12355', desc: '家庭抚育与青少年成长支持' },
];

export function CrisisModal({ isOpen, onClose, forced }: CrisisModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-obsidian-raised border-2 border-amber/40 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-amber/10 rounded-full blur-3xl pointer-events-none" />

        {!forced && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-mist hover:text-snow hover:bg-void rounded-full transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-amber/15 border border-amber/30 flex items-center justify-center text-amber shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber/90 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> 守护提示 · 停下来喘口气
            </span>
            <h3 id="crisis-title" className="text-lg font-bold text-snow mt-0.5">
              生活很重，但你的存在更珍贵
            </h3>
          </div>
        </div>

        <p className="text-sm text-mist leading-relaxed mb-5">
          {forced
            ? '我们检测到这段倾诉可能触及极度痛苦。请先看看这些随时可接通的援助热线——你不是一个人在扛。'
            : '人到中年，扛住全世界的同时，也请允许自己做回一个脆弱的人。有人随时愿意倾听你：'}
        </p>

        <div className="space-y-2.5 mb-6">
          {HOTLINES.map((line) => (
            <div
              key={line.number}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-void/80 border border-void-border hover:border-amber/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-snow">{line.name}</p>
                <p className="text-[11px] text-mist">{line.desc}</p>
              </div>
              <a
                href={`tel:${line.number}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber/20 text-amber text-xs font-semibold hover:bg-amber/30 transition-colors whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                {line.number}
              </a>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-void hover:bg-void-border text-snow text-sm font-medium transition-colors"
        >
          {forced ? '我已知晓，继续留在树洞' : '我已知晓，继续在树洞释放'}
        </button>
      </motion.div>
    </div>
  );
}
