import { useRef, useState } from 'react';

/**
 * MagneticElement — wraps children and applies a magnetic hover effect.
 * The element subtly moves toward the cursor when hovered.
 * Props: strength (px pull), className, as (element type), children
 */
export default function MagneticElement({
  children,
  strength = 30,
  className = '',
  as: Tag = 'div',
  ...props
}) {
  const ref = useRef(null);
  const [transform, setTransform] = useState('translate3d(0,0,0)');

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    setTransform(`translate3d(${dx * (strength / 100)}px, ${dy * (strength / 100)}px, 0)`);
  };

  const handleMouseLeave = () => {
    setTransform('translate3d(0,0,0)');
  };

  return (
    <Tag
      ref={ref}
      className={`magnetic-element ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: transform === 'translate3d(0,0,0)'
          ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'transform 0.15s ease-out',
        willChange: 'transform',
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
