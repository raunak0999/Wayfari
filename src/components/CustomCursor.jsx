import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = cursorDotRef.current;
    if (!cursor || !dot) return;

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    const move = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Dot follows instantly
      dot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
    };

    // Smooth trailing ring
    const animate = () => {
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;
      cursorX += dx * 0.12;
      cursorY += dy * 0.12;
      cursor.style.transform = `translate(${cursorX - 20}px, ${cursorY - 20}px)`;
      requestAnimationFrame(animate);
    };

    const handleEnter = () => setHidden(false);
    const handleLeave = () => setHidden(true);
    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);

    // Detect hoverable elements
    const addHoverListeners = () => {
      const hoverTargets = document.querySelectorAll('a, button, .card, .chip, .btn, .navbar__link, [role="button"]');
      hoverTargets.forEach((el) => {
        el.addEventListener('mouseenter', () => setHovering(true));
        el.addEventListener('mouseleave', () => setHovering(false));
      });
    };

    window.addEventListener('mousemove', move);
    document.addEventListener('mouseenter', handleEnter);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('mouseup', handleUp);
    animate();

    // Observe DOM changes for new hover targets
    addHoverListeners();
    const observer = new MutationObserver(() => addHoverListeners());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseenter', handleEnter);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('mouseup', handleUp);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        className={`cursor-ring ${hovering ? 'hover' : ''} ${clicking ? 'click' : ''} ${hidden ? 'hidden' : ''}`}
      />
      <div
        ref={cursorDotRef}
        className={`cursor-dot ${hovering ? 'hover' : ''} ${clicking ? 'click' : ''} ${hidden ? 'hidden' : ''}`}
      />
    </>
  );
}
