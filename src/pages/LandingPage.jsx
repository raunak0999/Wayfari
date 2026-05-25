import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroSection from '../components/HeroSection';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';
import CountUp from '../components/CountUp';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: '🎯',
    title: 'Smart Matching',
    desc: 'Our algorithm finds travel buddies based on your hobbies, music taste, travel style, and schedule compatibility.',
    gradient: 'linear-gradient(135deg, rgba(255,107,44,0.12), rgba(168,85,247,0.08))',
    glow: 'rgba(255,107,44,0.15)',
  },
  {
    icon: '🛡️',
    title: 'Safety First',
    desc: 'Built-in Safety Hub with SOS alerts, live location sharing, check-in reminders, and trusted contacts for peace of mind.',
    gradient: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(52,211,153,0.08))',
    glow: 'rgba(0,240,255,0.12)',
  },
  {
    icon: '💬',
    title: 'Chat & Connect',
    desc: 'Real-time messaging with your matched buddies. Plan trips, share ideas, and build friendships before you travel.',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(244,114,182,0.08))',
    glow: 'rgba(168,85,247,0.12)',
  }
];

const STEPS = [
  { num: '01', icon: '✍️', title: 'Create Your Profile', desc: 'Sign up, set your travel preferences, hobbies, and lifestyle to help us find your perfect match.' },
  { num: '02', icon: '🔍', title: 'Discover Buddies', desc: 'Browse compatible travelers heading to your dream destination. Filter by style, dates, and group size.' },
  { num: '03', icon: '🤝', title: 'Connect & Travel', desc: 'Send connection requests, chat with matches, plan your trip together, and explore the world!' }
];

const TESTIMONIALS = [
  { name: 'Sarah K.', location: 'New York → Bali', text: 'Found my perfect travel buddy in minutes! We had an incredible trip through Bali together. 10/10 experience.', avatar: '🌺', rating: 5 },
  { name: 'Marcus T.', location: 'London → Tokyo', text: 'The smart matching really works. We shared the same interests, same pace, and created memories for life.', avatar: '🎌', rating: 5 },
  { name: 'Elena R.', location: 'Berlin → Peru', text: 'As a solo female traveler, the Safety Hub gave me confidence. The SOS and check-in features are game-changers.', avatar: '🏔️', rating: 5 },
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Active Travelers', icon: '🌍' },
  { value: 150, suffix: '+', label: 'Countries Covered', icon: '📍' },
  { value: 98, suffix: '%', label: 'Match Accuracy', icon: '🎯' },
  { value: 4.9, suffix: '★', label: 'User Rating', icon: '⭐', decimals: 1 },
];

const DESTINATIONS = [
  { name: 'Bali, Indonesia', emoji: '🌴', image: '/dest-bali.png' },
  { name: 'Tokyo, Japan', emoji: '🗼', image: '/dest-tokyo.png' },
  { name: 'Paris, France', emoji: '🗼', image: '/dest-paris.png' },
  { name: 'Machu Picchu, Peru', emoji: '🏔️', image: '/dest-machu-picchu.png' },
  { name: 'Santorini, Greece', emoji: '🏛️', image: '/dest-santorini.jpg' },
  { name: 'Cape Town, South Africa', emoji: '🦁', image: '/dest-cape-town.jpg' },
];

export default function LandingPage() {
  useEffect(() => {
    ScrollTrigger.create({
      trigger: '.landing__marquee',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        const el = document.querySelector('.landing__marquee-track');
        if (el) el.style.transform = `translateX(${-self.progress * 300}px)`;
      },
    });

    return () => ScrollTrigger.getAll().forEach(st => st.kill());
  }, []);

  return (
    <div className="landing" id="landing-page">
      <HeroSection />

      {/* Infinite Marquee */}
      <div className="landing__marquee">
        <div className="landing__marquee-track">
          {[...Array(2)].map((_, i) => (
            <div className="landing__marquee-content" key={i}>
              <span>🌍 Adventure Awaits</span>
              <span className="landing__marquee-dot">◆</span>
              <span>🏔️ Find Your Tribe</span>
              <span className="landing__marquee-dot">◆</span>
              <span>✈️ Travel Together</span>
              <span className="landing__marquee-dot">◆</span>
              <span>🤝 Build Connections</span>
              <span className="landing__marquee-dot">◆</span>
              <span>🛡️ Stay Safe</span>
              <span className="landing__marquee-dot">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="section landing__features-section" id="features">
        <div className="container">
          <ScrollReveal direction="up" duration={0.7}>
            <div className="section-header">
              <div className="landing__section-badge">✨ Core Features</div>
              <h2>Why Choose <span className="landing__gradient-text">Wayfari</span>?</h2>
              <p>Everything you need to find the perfect travel companion, all in one place.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" staggerChildren={0.15} duration={0.8}>
            <div className="grid grid--3" style={{ opacity: 1 }}>
              {FEATURES.map((f, i) => (
                <div className="card landing__feature-card" key={i} style={{ '--card-gradient': f.gradient, '--card-glow': f.glow }}>
                  <div className="landing__feature-icon-wrap">
                    <div className="landing__feature-icon">{f.icon}</div>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <div className="landing__feature-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="landing__stats-banner">
        <div className="container">
          <ScrollReveal direction="up" staggerChildren={0.1} duration={0.7}>
            <div className="landing__stats-grid">
              {STATS.map((s, i) => (
                <div className="landing__stat-card" key={i}>
                  <span className="landing__stat-icon">{s.icon}</span>
                  <strong className="landing__stat-value">
                    <CountUp end={s.value} suffix={s.suffix} decimals={s.decimals || 0} />
                  </strong>
                  <span className="landing__stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How It Works */}
      <section className="section landing__steps-section" id="how-it-works">
        <div className="container">
          <ScrollReveal direction="up" duration={0.7}>
            <div className="section-header">
              <div className="landing__section-badge">🚀 Get Started</div>
              <h2>How It Works</h2>
              <p>Finding your travel buddy is as easy as 1-2-3.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" staggerChildren={0.2} duration={0.8}>
            <div className="landing__steps">
              {STEPS.map((step, i) => (
                <div className="landing__step" key={i}>
                  <div className="landing__step-num-wrap"><div className="landing__step-num">{step.num}</div></div>
                  <div className="landing__step-icon">{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  {i < STEPS.length - 1 && <div className="landing__step-line" />}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Destinations */}
      <section className="section landing__destinations-section" id="destinations">
        <div className="container">
          <ScrollReveal direction="up" duration={0.7}>
            <div className="section-header">
              <div className="landing__section-badge">🌏 Explore</div>
              <h2>Trending <span className="landing__gradient-text">Destinations</span></h2>
              <p>Where will your next adventure take you?</p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" staggerChildren={0.12} duration={0.8}>
            <div className="landing__destinations-grid">
              {DESTINATIONS.map((d, i) => (
                <div className="landing__destination-card" key={i}>
                  <img src={d.image} alt={d.name} className="landing__destination-img" />
                  <div className="landing__destination-overlay" />
                  <span className="landing__destination-name">{d.name}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" id="testimonials">
        <div className="container">
          <ScrollReveal direction="up" duration={0.7}>
            <div className="section-header">
              <div className="landing__section-badge">💬 Testimonials</div>
              <h2>Loved by <span className="landing__gradient-text">Travelers</span></h2>
              <p>See what fellow adventurers are saying about Wayfari.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" staggerChildren={0.15} duration={0.8}>
            <div className="grid grid--3">
              {TESTIMONIALS.map((t, i) => (
                <div className="card landing__testimonial" key={i}>
                  <div className="landing__testimonial-stars">{'★'.repeat(t.rating)}</div>
                  <p className="landing__testimonial-text">"{t.text}"</p>
                  <div className="landing__testimonial-author">
                    <div className="landing__testimonial-avatar">{t.avatar}</div>
                    <div><strong>{t.name}</strong><small>{t.location}</small></div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="landing__cta-section">
        <div className="container">
          <ScrollReveal direction="scale" duration={1}>
            <div className="landing__cta-content">
              <div className="landing__cta-glow" />
              <h2>Ready to Find Your Travel Buddy?</h2>
              <p>Join thousands of travelers who found their perfect match on Wayfari.</p>
              <Link to="/auth" className="btn btn--white btn--lg landing__cta-btn">
                <span>Get Started Free</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
