import { useState, useEffect } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export function useResponsive(): ScreenSize {
  const [size, setSize] = useState<ScreenSize>(getSize());

  useEffect(() => {
    const handler = () => setSize(getSize());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}

function getSize(): ScreenSize {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1200) return 'tablet';
  return 'desktop';
}
