import { useParams, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import simulations from "../data/simulations";
import ProjectileSimulation from "../simulations/ProjectileSimulation";
import CircuitSimulation from "../simulations/Circuitsimulation";
import PHSimulation from "../simulations/Phsimulation";
import ForcesSimulation from "../simulations/Forcessimulation";
import LensSimulation from "../simulations/LensSimulation";
import RCSimulation from "../simulations/RCSimulation";
import ResistancePuzzle from "../simulations/Resistancepuzzle";
import SmartInterference from "../simulations/SmartInterference";
import FreeFall from "../simulations/FreeFall";
import "./SimulationPage.css";

const SIM_COMPONENTS = {
  projectile: ProjectileSimulation,
  circuit: CircuitSimulation,
  ph: PHSimulation,
  forces: ForcesSimulation,
  lens: LensSimulation,
  rc: RCSimulation,
  "resistance-puzzle": ResistancePuzzle,
  "smart-interference": SmartInterference,
  "free-fall": FreeFall,
};

export default function SimulationPage() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const sim = simulations.find((s) => s.id === id);
  const SimComponent = SIM_COMPONENTS[id] || null;

  if (!sim) {
    return (
      <div className="simpage simpage--notfound">
        <p>{t.notFound}</p>
        <Link to="/categories" className="simpage-back">{t.backCategories}</Link>
      </div>
    );
  }

  if (SimComponent) {
    return (
      <div className="simpage-fullscreen">
        <Link to="/categories" className="simpage-back-float">{t.backCategories}</Link>
        <SimComponent />
      </div>
    );
  }

  return (
    <main className="simpage">
      <Link to="/categories" className="simpage-back">{t.backCategories}</Link>
      <div className="simpage-header">
        <span className={`simpage-cat simpage-cat--${sim.category === "Physique" ? "physics" : "chemistry"}`}>
          {sim.icon} {sim.category === "Physique" ? t.physics : t.chemistry}
        </span>
        <h1 className="simpage-title">{lang === "fr" ? sim.titleFr : sim.titleAr}</h1>
        <p className="simpage-desc">{lang === "fr" ? sim.descFr : sim.descAr}</p>
      </div>
      <div className="simpage-canvas">
        <p className="simpage-placeholder">{t.canvasPlaceholder}</p>
      </div>
    </main>
  );
}