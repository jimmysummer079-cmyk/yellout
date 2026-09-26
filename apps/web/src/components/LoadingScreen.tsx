import { motion } from 'motion/react';

export function LoadingScreen({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6">
      <motion.img
        src="/yellout-logo.jpg"
        alt="YellOut"
        className="w-20 h-20 rounded-2xl object-cover border border-ember/40 shadow-[0_0_40px_rgba(249,115,22,0.3)]"
        animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      />
      <div className="text-center">
        <h1 className="font-display text-3xl text-snow tracking-wide">YellOut</h1>
        <p className="text-sm text-mist mt-2">{label}</p>
      </div>
    </div>
  );
}
