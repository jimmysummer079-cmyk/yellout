import React from 'react';
import { Mic, Waves, ShieldCheck } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface NavBarProps {
  activeTab: 'vent' | 'plaza';
  onChangeTab: (tab: 'vent' | 'plaza') => void;
  plazaCount: number;
}

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onChangeTab, plazaCount }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4">
        {/* 发泄倾诉页 */}
        <button
          onClick={() => {
            haptic.triggerTick();
            onChangeTab('vent');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'vent'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-full mb-0.5 transition-colors ${
              activeTab === 'vent' ? 'bg-amber-500/15' : 'bg-transparent'
            }`}
          >
            <Mic className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">树洞倾诉</span>
        </button>

        {/* 同温广场页 */}
        <button
          onClick={() => {
            haptic.triggerTick();
            onChangeTab('plaza');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all relative ${
            activeTab === 'plaza'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-full mb-0.5 transition-colors ${
              activeTab === 'plaza' ? 'bg-amber-500/15' : 'bg-transparent'
            }`}
          >
            <Waves className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">同温层广场</span>
          {plazaCount > 0 && (
            <span className="absolute top-2 right-1/4 translate-x-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>
    </nav>
  );
};
