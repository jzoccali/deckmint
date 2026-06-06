import { useEffect, useState } from 'react';

export type Platform = 'macos' | 'windows' | 'linux' | 'other';

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    // Pure web / browser detection — works on any desktop OS when running in a browser or as PWA.
    // This is the only path now that the app is a cross-platform web app.
    const getPlatform = (): Platform => {
      // Modern User-Agent Client Hints (preferred when available)
      const nav = navigator as any;
      const platformHint =
        nav.userAgentData?.platform ||
        nav.userAgentData?.getHighEntropyValues?.(['platform'])?.platform;

      const ua = navigator.userAgent.toLowerCase();
      const plat = (platformHint || '').toString().toLowerCase();

      if (plat.includes('mac') || ua.includes('mac')) return 'macos';
      if (plat.includes('win') || ua.includes('win')) return 'windows';
      if (plat.includes('linux') || ua.includes('linux') || ua.includes('x11')) return 'linux';

      // Fallback: macOS is the design target aesthetic
      return 'macos';
    };

    setPlatform(getPlatform());
  }, []);

  return platform;
}
