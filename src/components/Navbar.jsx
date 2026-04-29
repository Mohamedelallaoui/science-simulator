import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import "./Navbar.css";

export default function Navbar() {
  const { t, toggle, theme, toggleTheme } = useLang();
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-icon">⚛</span>
        <span className="navbar-title">{t.brand}</span>
      </Link>
      <div className="navbar-controls">
        <button
          className="theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? t.lightMode : t.darkMode}
        </button>
        <button className="lang-btn" onClick={toggle}>
          {t.langSwitch}
        </button>
      </div>
    </nav>
  );
}