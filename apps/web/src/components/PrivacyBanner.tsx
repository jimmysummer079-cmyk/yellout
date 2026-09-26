import { useState } from 'react';
import { ShieldCheck, Lock, EyeOff, Flame, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export function PrivacyBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full border-b border-void-border/70 bg-obsidian-raised/70 px-4 py-2 text-xs text-mist">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium text-snow/90 truncate">
            匿名保护中 · 变声脱敏 · 48H 自动焚毁
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] text-amber hover:text-amber-soft font-medium shrink-0 py-0.5 px-1.5 rounded hover:bg-void transition-colors"
          aria-expanded={isExpanded}
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
            className="max-w-3xl mx-auto pt-3 pb-2 text-[11px] space-y-2 border-t border-void-border mt-2 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 text-snow/90">
              {[
                { icon: Cpu, title: '本地 DSP 变声', desc: '浏览器内重塑声纹频段，掩盖真实声线' },
                { icon: Lock, title: '无社交绑定', desc: '仅设备会话令牌，不读通讯录、不登录' },
                { icon: EyeOff, title: '无痕动态代号', desc: '无头像无昵称，发泄后随机刷新代号' },
                { icon: Flame, title: '48H 绝对焚毁', desc: '到期自动删帖并删除音频文件' },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-1.5 p-2 rounded-lg bg-void/70 border border-void-border/60"
                >
                  <Icon className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-snow">{title}</div>
                    <div className="text-mist text-[10px] mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-500 text-[10px] pt-1">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                「焚入虚空」永不上传
              </span>
              <Link to="/privacy" className="underline hover:text-amber">
                隐私政策
              </Link>
              <Link to="/terms" className="underline hover:text-amber">
                使用条款
              </Link>
              <Link to="/about" className="underline hover:text-amber">
                关于 YellOut
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
