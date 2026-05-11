import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import SimulationCard from "../components/SimulationCard";
import simulations from "../data/simulations";
import "./Categories.css";

export default function Categories() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);

  const filtered = activeCategory
    ? simulations.filter((s) => s.category === activeCategory)
    : [];

  return (
    <main className="catpage">
      <Link to="/" className="catpage-back">{t.backHome}</Link>

      <header className="catpage-header">
        <h1 className="catpage-title">{t.categoriesTitle}</h1>
        <p className="catpage-sub">{t.categoriesSubtitle}</p>
      </header>

      {/* category selector */}
      <div className="cat-grid">
        <div
          className={`cat-card cat-card--physics ${activeCategory === "Physique" ? "cat-card--active" : ""}`}
          onClick={() => navigate("/niveau/Physique")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/niveau/Physique")}
        >
          <span className="cat-card-icon">🔭</span>
          <h2 className="cat-card-name">{t.physics}</h2>
          <p className="cat-card-desc">{t.physicsDesc}</p>
          <span className="cat-card-count">
            {simulations.filter((s) => s.category === "Physique").length} simulations
          </span>
        </div>

        <div
          className={`cat-card cat-card--chemistry ${activeCategory === "Chimie" ? "cat-card--active" : ""}`}
          onClick={() => navigate("/niveau/Chimie")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/niveau/Chimie")}
        >
          <span className="cat-card-icon">🧬</span>
          <h2 className="cat-card-name">{t.chemistry}</h2>
          <p className="cat-card-desc">{t.chemistryDesc}</p>
          <span className="cat-card-count">
            {simulations.filter((s) => s.category === "Chimie").length} simulations
          </span>
        </div>
      </div>

      {/* simulations grid */}
      {activeCategory && (
        <section className="sims-section" key={activeCategory}>
          <h2 className="sims-section-title">
            {activeCategory === "Physique" ? t.physics : t.chemistry}
            &nbsp;— {t.simulationsTitle}
          </h2>
          <div className="sims-grid">
            {filtered.map((sim) => (
              <SimulationCard key={sim.id} sim={sim} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}