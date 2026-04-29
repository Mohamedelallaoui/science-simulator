import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import "./SimulationCard.css";

export default function SimulationCard({ sim }) {
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const title = lang === "fr" ? sim.titleFr : sim.titleAr;
  const desc  = lang === "fr" ? sim.descFr  : sim.descAr;

  return (
    <div
      className="sim-card"
      onClick={() => navigate(`/sim/${sim.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/sim/${sim.id}`)}
    >
      <div className="sim-card-icon">{sim.icon}</div>
      <h3 className="sim-card-title">{title}</h3>
      <p className="sim-card-desc">{desc}</p>
      <span className="sim-card-cta">{t.launch}</span>
    </div>
  );
}