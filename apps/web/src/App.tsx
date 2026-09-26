import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { CrisisModal } from './components/CrisisModal';
import { LoadingScreen } from './components/LoadingScreen';
import { Onboarding } from './components/Onboarding';
import { AboutPage } from './pages/AboutPage';
import { LegalPage } from './pages/LegalPage';
import { PlazaPage } from './pages/PlazaPage';
import { VentPage } from './pages/VentPage';
import {
  ensureSession,
  isOnboardingDone,
  markOnboardingDone,
  refreshCodename,
} from './lib/api';

export default function App() {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [codename, setCodename] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingDone());
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [crisisForced, setCrisisForced] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await ensureSession();
        if (!cancelled) {
          setCodename(session.codename);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : '无法连接服务器');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefreshCodename = async () => {
    const next = await refreshCodename();
    setCodename(next);
    return next;
  };

  const openCrisis = (forced = false) => {
    setCrisisForced(forced);
    setCrisisOpen(true);
  };

  if (!ready) return <LoadingScreen label="正在建立匿名会话…" />;

  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-3xl text-amber">YellOut</h1>
          <p className="text-mist text-sm leading-relaxed">{bootError}</p>
          <p className="text-xs text-slate-500">
            请确认 API 已启动（默认端口 8787），然后刷新页面。
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-ember/20 text-ember border border-ember/40 text-sm"
            onClick={() => window.location.reload()}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            markOnboardingDone();
            setShowOnboarding(false);
          }}
          onOpenCrisis={() => openCrisis(false)}
        />
      )}

      <Routes>
        <Route
          element={
            <AppShell
              codename={codename}
              onOpenCrisis={() => openCrisis(false)}
              path={location.pathname}
            />
          }
        >
          <Route
            index
            element={
              <VentPage
                codename={codename}
                onRefreshCodename={handleRefreshCodename}
                onOpenCrisis={openCrisis}
                onCodenameChange={setCodename}
              />
            }
          />
          <Route
            path="plaza"
            element={<PlazaPage codename={codename} onOpenCrisis={openCrisis} />}
          />
          <Route path="about" element={<AboutPage />} />
          <Route path="privacy" element={<LegalPage kind="privacy" />} />
          <Route path="terms" element={<LegalPage kind="terms" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <CrisisModal
        isOpen={crisisOpen}
        forced={crisisForced}
        onClose={() => {
          setCrisisOpen(false);
          setCrisisForced(false);
        }}
      />
    </>
  );
}
