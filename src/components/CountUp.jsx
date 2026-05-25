import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — animates a number from 0 to `end` when scrolled into view.
 * Props: end (number), duration (ms), suffix, prefix, decimals
 */
export default function CountUp({
  end,
  duration = 2000,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();

          const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(eased * end);
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setValue(end);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  const display = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString();

  return (
    <span ref={ref} className={`count-up ${className}`}>
      {prefix}{display}{suffix}
    </span>
  );
}
