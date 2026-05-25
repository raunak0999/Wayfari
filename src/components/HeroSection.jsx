import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ParticleCanvas from './ParticleCanvas';
import './HeroSection.css';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef(null);
  const orb1 = useRef(null);
  const orb2 = useRef(null);
  const orb3 = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero__badge', { y: 30, opacity: 0, duration: 0.8 })
        .from('.hero__title > *', { y: 60, opacity: 0, stagger: 0.15, duration: 0.9 }, '-=0.4')
        .from('.hero__subtitle', { y: 40, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.hero__actions', { y: 30, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('.hero__stats', { y: 30, opacity: 0, duration: 0.7 }, '-=0.3')
        .from('.hero__visual', { x: 80, opacity: 0, scale: 0.9, duration: 1.1 }, '-=1.2');

      // Orb floating animations
      gsap.to(orb1.current, { y: -40, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(orb2.current, { y: 35, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(orb3.current, { y: -25, x: 20, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });

      // Parallax on scroll
      gsap.to('.hero__content', {
        y: -120,
        ease: 'none',
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero__visual', {
        scale: 0.85,
        ease: 'none',
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });

      // Fade out hero
      gsap.to(sectionRef.current, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: sectionRef.current, start: '60% top', end: 'bottom top', scrub: true },
      });
    }, sectionRef);

    // Mouse parallax
    const handleMouse = (e) => {
      const { clientX, clientY } = e;
      const cx = (clientX / window.innerWidth - 0.5) * 2;
      const cy = (clientY / window.innerHeight - 0.5) * 2;

      gsap.to('.hero__floating-card', { x: cx * 15, y: cy * 15, duration: 0.8, ease: 'power2.out' });
      gsap.to('.hero__image-card', { x: cx * -8, y: cy * -8, duration: 1, ease: 'power2.out' });
      gsap.to([orb1.current, orb2.current, orb3.current], { x: cx * 25, duration: 1.2, ease: 'power2.out' });
    };
    window.addEventListener('mousemove', handleMouse);

    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero" id="hero-section">
      <ParticleCanvas className="hero__particles" />

      <div className="hero__orb hero__orb--1" ref={orb1} />
      <div className="hero__orb hero__orb--2" ref={orb2} />
      <div className="hero__orb hero__orb--3" ref={orb3} />
      <div className="hero__grid-overlay" />

      <div className="hero__inner">
        {/* ── Left Content ── */}
        <div className="hero__content">
          <span className="hero__badge">
            <span className="hero__badge-dot" />
            <span>🌍 Your next adventure starts here</span>
          </span>

          <h1 className="hero__title">
            <span>Find Your Perfect</span>
            <span className="hero__highlight">
              Travel Buddy
              <svg className="hero__highlight-gradient" viewBox="0 0 300 12" preserveAspectRatio="none">
                <rect width="300" height="12" rx="6" fill="url(#heroGrad)" />
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6c63ff" />
                    <stop offset="100%" stopColor="#f857a6" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          <p className="hero__subtitle">
            Connect with like-minded travelers, share itineraries, and create unforgettable memories across the globe — your perfect companion is just a click away.
          </p>

          <div className="hero__actions">
            <Link to="/auth" className="hero__cta hero__cta--primary">
              Start Exploring
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              <span className="hero__cta-glow" />
            </Link>
            <a href="#how-it-works" className="hero__cta hero__cta--secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
              How It Works
            </a>
          </div>

          <div className="hero__stats">
            <div className="hero__stat"><strong>10K+</strong><span>Travelers</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><strong>150+</strong><span>Countries</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><strong>5K+</strong><span>Trips Made</span></div>
          </div>
        </div>

        {/* ── Right Visual ── */}
        <div className="hero__visual">
          <div className="hero__3d-wrapper">
            <div className="hero__image-card">
              <img src="/hero-travel.png" alt="Travelers exploring" />
            </div>

            <div className="hero__floating-card hero__floating-card--bottom">
              <span className="hero__floating-icon">🥾</span>
              <div>
                <strong>Hiking Trip</strong>
                <span>Manali, India · 3 days</span>
              </div>
            </div>

            <div className="hero__floating-card hero__floating-card--top">
              <span className="hero__match-badge">98%</span>
              <span>Match</span>
            </div>

            <div className="hero__orbit-ring">
              <span className="hero__orbit-dot hero__orbit-dot--1" />
              <span className="hero__orbit-dot hero__orbit-dot--2" />
              <span className="hero__orbit-dot hero__orbit-dot--3" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Elements ── */}
      <div className="hero__scroll-indicator">
        <span>SCROLL DOWN</span>
        <div className="hero__scroll-line" />
      </div>

      <div className="hero__social-links">
        {[
          <svg key="x" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.2L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41Z" /></svg>,
          <svg key="cam" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" /></svg>,
          <svg key="play" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>,
        ].map((icon, i) => (
          <a key={i} className="hero__social-link" href="#" aria-label="Social link">{icon}</a>
        ))}
      </div>

      <svg className="hero__wave" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0,64 C360,120 1080,0 1440,64 L1440,120 L0,120Z" fill="var(--color-bg, #0a0a1a)" />
      </svg>
    </section>
  );
}
