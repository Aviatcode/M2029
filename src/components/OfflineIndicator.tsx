import React, { useEffect, useState } from 'react';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/90 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-xl border border-amber-400/30 animate-bounce">
      <WifiOff className="w-4 h-4 text-amber-200" />
      <div>
        <p className="font-semibold">Offline Study Mode Active</p>
        <p className="text-[11px] text-amber-100 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-amber-200 inline" /> All cached syllabus lessons & PYQs are available offline!
        </p>
      </div>
    </div>
  );
};
