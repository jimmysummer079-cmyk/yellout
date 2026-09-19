import React, { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { haptic } from '../utils/haptics';

interface CustomTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTag: (tagName: string) => void;
}

export const CustomTagModal: React.FC<CustomTagModalProps> = ({ isOpen, onClose, onAddTag }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('请输入发泄目标');
      return;
    }
    if (trimmed.length > 4) {
      setError('发泄目标至多4个汉字');
      return;
    }
    haptic.triggerTick();
    onAddTag(trimmed);
    setValue('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-100">添加发泄目标</h4>
            <p className="text-xs text-slate-400">具象化你的负荷来源（限4个字）</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              maxLength={4}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError('');
              }}
              placeholder="如：房贷、体检、项目"
              autoFocus
              className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-center text-lg font-medium focus:outline-none focus:border-amber-500 transition-colors"
            />
            <div className="flex justify-between items-center mt-1.5 px-1">
              <span className="text-[11px] text-red-400">{error}</span>
              <span className="text-[11px] text-slate-500 ml-auto">{value.length}/4</span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              确定添加
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
