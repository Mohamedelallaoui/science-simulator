import { useParams, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import SimulationCard from "../components/SimulationCard";
import simulations from "../data/simulations";
import "./Niveau.css";

const NIVEAUX = ["Tronc Commun", "1ère Bac", "2ème Bac"];

export default function Niveau() {
  const { category } = useParams(); // "Physique" or "Chimie"
  const { t } = useLang();

  const niveauLabels = {
    "Tronc Commun": t.tronc,
    "1ère Bac":     t.bac1,
    "2ème Bac":     t.bac2,
  };
  const niveauDescs = {
    "Tronc Commun": t.troncDesc,
    "1ère Bac":     t.bac1Desc,
    "2ème Bac":     t.bac2Desc,
  };
  const niveauIcons = {
    "Tronc Commun": "🌱",
    "1ère Bac":     "📘",
    "2ème Bac":     "🎓",
  };

  return (
    <main className="niveau-page">
      <Link to="/categories" className="niveau-back">{t.backCategory}</Link>

      <header className="niveau-header">
        <h1 className="niveau-title">{t.niveauTitle}</h1>
        <p className="niveau-sub">{t.niveauSub}</p>
      </header>

      {NIVEAUX.map((niv) => {
        const sims = simulations.filter(
          (s) => s.category === category && s.niveau === niv
        );

        return (
          <section className="niveau-section" key={niv}>
            <div className="niveau-section-header">
              <span className="niveau-icon">{niveauIcons[niv]}</span>
              <div>
                <h2 className="niveau-section-title">{niveauLabels[niv]}</h2>
                <p className="niveau-section-desc">{niveauDescs[niv]}</p>
              </div>
              <span className="niveau-count">
                {sims.length} simulation{sims.length !== 1 ? "s" : ""}
              </span>
            </div>

            {sims.length > 0 ? (
              <div className="niveau-grid">
                {sims.map((sim) => (
                  <SimulationCard key={sim.id} sim={sim} />
                ))}
              </div>
            ) : (
              <div className="niveau-empty">
                <span>Bientôt disponible</span>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}