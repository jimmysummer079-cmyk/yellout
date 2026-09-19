import React, { useState } from 'react';
import { ShieldCheck, Lock, EyeOff, Flame, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PrivacyBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 text-xs text-slate-400">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium text-slate-300 truncate">
            端到端匿名保护中 · 0社交痕迹 · 24H自动销毁
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] text-amber-400/90 hover:text-amber-300 font-medium shrink-0 ml-2 py-0.5 px-1.5 rounded hover:bg-slate-800 transition-colors"
        >
          <span>脱敏明细</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-md mx-auto pt-3 pb-2 text-[11px] space-y-2 border-t border-slate-800 mt-2"
          >
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">实时 DSP 变声</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">本地算法重塑声纹频段，掩盖真实声线特征</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">元数据物理剔除</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">剥除音频GPS、设备型号及时间指纹</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                <EyeOff className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">无痕动态代号</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">无头像无昵称，随发泄随机更新代号</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">24H 绝对焚毁</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">不建长期档案，24小时后随风自然消除</div>
                </div>
              </div>
            </div>
            <div className="text-center text-slate-500 text-[10px] pt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              零通讯录读取 · 零跨端追踪 · 绝不设文本争辩区
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
