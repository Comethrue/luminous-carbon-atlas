import { useEffect, useRef, useState } from 'react';

export function useInView(options?: { threshold?: number; rootMargin?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          observer.unobserve(el);
          const ms = options?.delay || 0;
          if (ms > 0) {
            setTimeout(() => setRevealed(true), ms);
          } else {
            setRevealed(true);
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.05,
        rootMargin: options?.rootMargin ?? '0px 0px 40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}
