import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import "./Home.css";

const SIMULATIONS = [
  { icon: "🔭", label: "Chute Libre", color: "#3de8b0", desc: "Gravité & cinématique" },
  { icon: "⚡", label: "Circuits", color: "#f5c518", desc: "Loi d'Ohm interactive" },
  { icon: "🧪", label: "pH & Acides", color: "#ff6b6b", desc: "Chimie acide-base" },
  { icon: "🌊", label: "Interférences", color: "#7eb8ff", desc: "Optique ondulatoire" },
  { icon: "🎯", label: "Projectile", color: "#c084fc", desc: "Mécanique balistique" },
  { icon: "🔬", label: "Lentilles", color: "#34d399", desc: "Optique géométrique" },
];

const STATS = [
  { value: "10+", label: "Simulations" },
  { value: "3", label: "Matières" },
  { value: "100%", label: "Gratuit" },
];

export default function Home() {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <main className="home">
      {/* Background atmosphere */}
      <div className="bg-grid" />
      <div className="orb orb--1" />
      <div className="orb orb--2" />
      <div className="orb orb--3" />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-left">
          <span className="hero-eyebrow">⚗️ &nbsp; Science Interactive</span>

          <h1 className="hero-title">
            {t.heroTitle || (
              <>
                Explore la science
                <br />
                <em>par la simulation</em>
              </>
            )}
          </h1>

          <p className="hero-sub">
            {t.heroSubtitle ||
              "Des simulations interactives conçues pour les lycéens marocains. Visualise, expérimente et comprends la physique et la chimie comme jamais auparavant."}
          </p>

          {/* Curriculum badge */}
          <div className="curriculum-badge">
            <span className="curriculum-flag">🇲🇦</span>
            <div>
              <strong>Conforme au programme marocain</strong>
              <span>Tronc Commun · 1ère Bac · 2ème Bac</span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="hero-cta" onClick={() => navigate("/categories")}>
              {t.heroCta || "Commencer à explorer"} →
            </button>
            <a className="hero-link" onClick={() => navigate("/categories")}>
              Voir toutes les simulations
            </a>
          </div>

          {/* Stats row */}
          <div className="stats-row">
            {STATS.map((s) => (
              <div className="stat" key={s.label}>
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── VISUAL SIDE ── */}
        <div className="hero-right">
          <div className="sim-showcase">
            {/* Central "screen" mockup */}
            <div className="screen-mockup">
              <div className="screen-bar">
                <span /><span /><span />
              </div>
              <div className="screen-body">
                <div className="screen-animation">
                  {/* Animated pendulum / orbit illustration */}
                  <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" className="sci-svg">
                    {/* Grid lines */}
                    <line x1="0" y1="100" x2="260" y2="100" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
                    <line x1="130" y1="0" x2="130" y2="200" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

                    {/* Orbit ring */}
                    <ellipse cx="130" cy="100" rx="70" ry="40" fill="none" stroke="rgba(61,232,176,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>

                    {/* Electron orbit animation */}
                    <circle r="7" fill="#3de8b0" filter="url(#glow)">
                      <animateMotion dur="3s" repeatCount="indefinite">
                        <mpath href="#orbitPath"/>
                      </animateMotion>
                    </circle>

                    {/* Nucleus */}
                    <circle cx="130" cy="100" r="14" fill="rgba(245,197,24,0.15)" stroke="#f5c518" strokeWidth="1.5"/>
                    <circle cx="130" cy="100" r="7" fill="#f5c518" opacity="0.9"/>

                    {/* Projectile parabola */}
                    <path d="M 30 160 Q 100 60 200 140" fill="none" stroke="rgba(192,132,252,0.6)" strokeWidth="2" strokeDasharray="6 3"/>
                    <circle cx="30" cy="160" r="5" fill="#c084fc"/>
                    <circle cx="200" cy="140" r="5" fill="#c084fc" opacity="0.5"/>

                    {/* Wave */}
                    <path d="M 20 130 Q 40 110 60 130 Q 80 150 100 130 Q 120 110 140 130 Q 160 150 180 130 Q 200 110 220 130" fill="none" stroke="rgba(126,184,255,0.7)" strokeWidth="2"/>

                    {/* Hidden path for animateMotion */}
                    <path id="orbitPath" d="M 200 100 A 70 40 0 1 0 200 99.9" fill="none"/>

                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                  </svg>

                  <div className="screen-label">Simulation en cours…</div>
                </div>
              </div>
            </div>

            {/* Floating sim cards */}
            {SIMULATIONS.map((sim, i) => (
              <div
                className={`sim-chip sim-chip--${i}`}
                key={sim.label}
                style={{ "--chip-color": sim.color }}
              >
                <span className="sim-chip-icon">{sim.icon}</span>
                <div>
                  <strong>{sim.label}</strong>
                  <small>{sim.desc}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="features-section">
        <h2 className="section-title">Pourquoi V Science Simulator ?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card-icon">🎮</div>
            <h3>100% Interactif</h3>
            <p>Modifie les paramètres en temps réel et observe les résultats instantanément. L'apprentissage par l'expérience.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon">📚</div>
            <h3>Programme Marocain</h3>
            <p>Toutes les simulations sont alignées sur les curricula officiels du Ministère de l'Éducation Nationale.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon">🌐</div>
            <h3>Bilingue</h3>
            <p>Disponible en français et en arabe pour s'adapter à tous les profils d'élèves marocains.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon">📱</div>
            <h3>Responsive</h3>
            <p>Fonctionne parfaitement sur ordinateur, tablette et smartphone — apprends où tu veux.</p>
          </div>
        </div>
      </section>

      {/* ── SIMULATIONS PREVIEW ── */}
      <section className="sims-section">
        <h2 className="section-title">Nos Simulations</h2>
        <p className="section-sub">Clique sur une simulation pour l'explorer</p>
        <div className="sims-grid">
          {SIMULATIONS.map((sim) => (
            <div
              className="sim-card"
              key={sim.label}
              style={{ "--card-accent": sim.color }}
              onClick={() => navigate("/categories")}
            >
              <div className="sim-card-glow" />
              <span className="sim-card-icon">{sim.icon}</span>
              <h3>{sim.label}</h3>
              <p>{sim.desc}</p>
              <span className="sim-card-cta">Explorer →</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CREDIT ── */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-logo">⚗️ V Science Simulator</div>
          <p className="footer-copy">
            Conçu pour rendre la science accessible à tous les lycéens marocains.
          </p>
          <div className="footer-badges">
            <span className="footer-badge">🇲🇦 Programme Marocain</span>
            <span className="footer-badge">⚡ Physique</span>
            <span className="footer-badge">🧪 Chimie</span>
          </div>
          <div className="footer-dev">
            Développé avec ❤️ par <strong>Asmae Ait Malek</strong>
          </div>
        </div>
      </footer>
    </main>
  );
}