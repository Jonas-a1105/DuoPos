import { useState, useEffect } from 'react';

export function useInstall() {
  const [isInstalled, setIsInstalled] = useState(() => {
    try {
      return localStorage.getItem('duo_pos_sim_installed') === 'true';
    } catch {
      return false;
    }
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      try {
        localStorage.setItem('duo_pos_sim_installed', 'true');
      } catch {}
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem('duo_pos_sim_installed', 'true');
    } catch {}
    setIsInstalled(true);
  };

  return {
    isInstalled,
    showInstallBanner,
    deferredPrompt: !!deferredPrompt,
    triggerInstall,
    dismissBanner,
  };
}
