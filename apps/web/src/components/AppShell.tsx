import { Outlet, NavLink, Link } from 'react-router-dom';
import { CloudRain, HeartHandshake, Mic, Waves } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AmbientRainSound } from '../utils/audioDsp';
import { haptic } from '../utils/haptics';
import { PrivacyBanner } from './PrivacyBanner';

interface AppShellProps {
  codename: string;
  onOpenCrisis: () => void;
  path: string;
}

export function AppShell({ codename, onOpenCrisis, path }: AppShellProps) {
  const [rainOn, setRainOn] = useState(false);
  const rainRef = useRef<AmbientRainSound | null>(null);
  const isAppTab = path === '/' || path === '/plaza';

  useEffect(() => {
    rainRef.current = new AmbientRainSound();
    return () => rainRef.current?.stop();
  }, []);

  const toggleRain = () => {
    haptic.triggerTick();
    if (!rainRef.current) return;
    if (rainOn) {
      rainRef.current.stop();
      setRainOn(false);
    } else {
      rainRef.current.start();
      setRainOn(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-void-border/70 bg-obsidian/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <img
              src="/yellout-logo.jpg"
              alt="YellOut"
              className="w-9 h-9 rounded-xl object-cover border border-ember/40 shadow-[0_0_20px_rgba(249,115,22,0.25)] group-hover:scale-[1.03] transition-transform"
            />
            <div className="min-w-0">
              <div className="font-display text-xl leading-none text-snow tracking-wide">
                YellOut
              </div>
              <div className="text-[11px] text-mist truncate mt-0.5">
                代号 {codename || '…'} · 匿名树洞
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleRain}
              aria-pressed={rainOn}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                rainOn
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-void/60 text-mist border-void-border hover:text-snow'
              }`}
              title="车窗夜雨沉浸底噪"
            >
              <CloudRain className={`w-3.5 h-3.5 ${rainOn ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">车窗夜雨</span>
            </button>
            <button
              type="button"
              onClick={() => {
                haptic.triggerTick();
                onOpenCrisis();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20 transition-colors"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">温暖守护</span>
            </button>
          </div>
        </div>
      </header>

      {isAppTab && <PrivacyBanner />}

      <main className="flex-1 w-full max-w-3xl mx-auto px-0 sm:px-4 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {isAppTab && (
        <nav
          className="fixed bottom-0 inset-x-0 z-40 border-t border-void-border/80 bg-obsidian/95 backdrop-blur-xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="主导航"
        >
          <div className="max-w-3xl mx-auto h-[var(--spacing-nav)] flex items-stretch">
            <NavLink
              to="/"
              end
              onClick={() => haptic.triggerTick()}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                  isActive ? 'text-amber' : 'text-mist hover:text-snow'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`p-1.5 rounded-full ${isActive ? 'bg-amber/15' : ''}`}
                  >
                    <Mic className="w-5 h-5" />
                  </span>
                  树洞倾诉
                </>
              )}
            </NavLink>
            <NavLink
              to="/plaza"
              onClick={() => haptic.triggerTick()}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                  isActive ? 'text-amber' : 'text-mist hover:text-snow'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`p-1.5 rounded-full ${isActive ? 'bg-amber/15' : ''}`}
                  >
                    <Waves className="w-5 h-5" />
                  </span>
                  同温层广场
                </>
              )}
            </NavLink>
          </div>
        </nav>
      )}

      {!isAppTab && (
        <footer className="border-t border-void-border/60 py-6 text-center text-xs text-mist space-x-4">
          <Link to="/" className="hover:text-amber">
            返回树洞
          </Link>
          <Link to="/about" className="hover:text-amber">
            关于
          </Link>
          <Link to="/privacy" className="hover:text-amber">
            隐私政策
          </Link>
          <Link to="/terms" className="hover:text-amber">
            使用条款
          </Link>
        </footer>
      )}
    </div>
  );
}
