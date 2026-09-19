import React from 'react';
import { Phone, HeartHandshake, ShieldAlert, X } from 'lucide-react';
import { motion } from 'motion/react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const hotlines = [
    { name: '全国希望24小时生命危机干预热线', number: '400-161-9995', desc: '全天候专业心理危机援助' },
    { name: '北京心理危机研究与干预热线', number: '010-82951332', desc: '国家级心理防线与倾听' },
    { name: '全国妇联与家庭心理援助热线', number: '12338', desc: '家庭关爱与女性心理支持' },
    { name: '全国共青团与家庭危机热线', number: '12355', desc: '家庭抚育与青少年成长支持' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden"
      >
        {/* 背景微暖光 */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
          aria-label="关闭提示"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> 守护提示 · 停下来喘口气
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">
              生活很重，但你的存在更珍贵
            </h3>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-5">
          我们捕捉到了让你极度痛苦和透不过气的沉重感。人到中年，扛住全世界的同时，也请允许自己做回一个脆弱的人。请相信，这道坎并非无解，有人随时愿意倾听你：
        </p>

        <div className="space-y-2.5 mb-6">
          {hotlines.map((line) => (
            <div
              key={line.number}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-amber-500/40 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-slate-300">{line.name}</p>
                <p className="text-[11px] text-slate-400">{line.desc}</p>
              </div>
              <a
                href={`tel:${line.number}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                {line.number}
              </a>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            我已知晓，继续在树洞释放
          </button>
        </div>
      </motion.div>
    </div>
  );
};
