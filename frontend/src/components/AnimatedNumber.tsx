import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({ value, decimals = 1, duration = 1600, prefix = '', suffix = '' }: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(performance.now());
  const initialRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    initialRef.current = display;

    function tick(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = initialRef.current + (value - initialRef.current) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}
