import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import "./Home.css";

export default function Home() {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <main className="home">
      {/* decorative orbs */}
      <div className="orb orb--1" />
      <div className="orb orb--2" />

      <section className="hero">
        <p className="hero-eyebrow">⚗️ &nbsp; Science Interactive</p>
        <h1 className="hero-title">{t.heroTitle}</h1>
        <p className="hero-sub">{t.heroSubtitle}</p>
        <button className="hero-cta" onClick={() => navigate("/categories")}>
          {t.heroCta}
        </button>

        <div className="hero-features">
          <div className="feature">
            <span className="feature-icon">🔭</span>
            <span>{t.physics}</span>
          </div>
          <div className="feature-divider" />
          <div className="feature">
            <span className="feature-icon">🧪</span>
            <span>{t.chemistry}</span>
          </div>
          <div className="feature-divider" />
          <div className="feature">
            <span className="feature-icon">🎛️</span>
            <span>Interactif</span>
          </div>
        </div>
      </section>
    </main>
  );
}