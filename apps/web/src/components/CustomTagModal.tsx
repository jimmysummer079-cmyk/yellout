import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { MAX_TARGET_TAG_LEN } from '@yellout/shared';
import { haptic } from '../utils/haptics';

interface CustomTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTag: (tag: string) => void;
}

export function CustomTagModal({ isOpen, onClose, onAddTag }: CustomTagModalProps) {
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const submit = () => {
    const tag = value.trim();
    if (!tag || tag.length > MAX_TARGET_TAG_LEN) return;
    haptic.triggerTick();
    onAddTag(tag);
    setValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-void-border bg-obsidian-raised p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-snow">自定义倾诉对象</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-void text-mist" aria-label="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-mist mb-3">最多 {MAX_TARGET_TAG_LEN} 个字，仅保存在本机。</p>
        <input
          value={value}
          maxLength={MAX_TARGET_TAG_LEN}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="例如：房贷"
          className="w-full px-3 py-2.5 rounded-xl bg-void border border-void-border text-sm text-snow placeholder:text-slate-500 focus:border-amber/50 outline-none"
          autoFocus
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="mt-4 w-full py-2.5 rounded-xl bg-ember text-obsidian text-sm font-semibold disabled:opacity-40"
        >
          添加
        </button>
      </motion.div>
    </div>
  );
}
