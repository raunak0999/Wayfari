import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollReveal — wraps children and animates them in on scroll.
 * Props: direction ('up'|'left'|'right'|'scale'), delay, duration, stagger (for children)
 */
export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.9,
  distance = 60,
  staggerChildren = 0,
  className = '',
  threshold = 'top 88%',
  once = true,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = staggerChildren ? el.children : [el];
    const from = {};
    const to = { opacity: 1, duration, ease: 'power3.out', delay };

    switch (direction) {
      case 'up':
        from.y = distance; from.opacity = 0;
        to.y = 0;
        break;
      case 'down':
        from.y = -distance; from.opacity = 0;
        to.y = 0;
        break;
      case 'left':
        from.x = distance; from.opacity = 0;
        to.x = 0;
        break;
      case 'right':
        from.x = -distance; from.opacity = 0;
        to.x = 0;
        break;
      case 'scale':
        from.scale = 0.85; from.opacity = 0;
        to.scale = 1;
        break;
      default:
        from.opacity = 0;
    }

    if (staggerChildren) {
      to.stagger = staggerChildren;
    }

    gsap.set(targets, from);

    ScrollTrigger.create({
      trigger: el,
      start: threshold,
      once,
      onEnter: () => gsap.to(targets, to),
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [direction, delay, duration, distance, staggerChildren, threshold, once]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform, opacity' }}>
      {children}
    </div>
  );
}
