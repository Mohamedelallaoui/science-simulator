import { createContext, useContext, useState, useEffect } from "react";

const translations = {
  fr: {
    dir: "ltr",
    brand: "Simulateur Scientifique",
    tagline: "Physique & Chimie Interactives",
    heroTitle: "Explorez les Lois de la Nature",
    heroSubtitle:
      "Une plateforme interactive pour comprendre la physique et la chimie à travers des simulations visuelles et dynamiques. Apprenez en expérimentant — sans formules, juste l'intuition.",
    heroCta: "Plonger dans les Simulations →",
    categoriesTitle: "Choisissez une Catégorie",
    categoriesSubtitle: "Sélectionnez un domaine pour découvrir les simulations disponibles.",
    physics: "Physique",
    chemistry: "Chimie",
    physicsDesc: "Mécanique, ondes, électricité et plus encore.",
    chemistryDesc: "Réactions, molécules, états de la matière.",
    launch: "Lancer →",
    backHome: "← Accueil",
    backCategories: "← Catégories",
    notFound: "Simulation introuvable.",
    canvasPlaceholder: "La simulation sera ici",
    simulationsTitle: "Simulations",
    langSwitch: "العربية",
    niveauTitle: "Choisissez un Niveau",
    niveauSub: "Sélectionnez votre niveau scolaire pour voir les simulations correspondantes.",
    tronc: "Tronc Commun",
    bac1: "1ère Bac",
    bac2: "2ème Bac",
    troncDesc: "Notions fondamentales de physique et chimie",
    bac1Desc: "Approfondissement des concepts scientifiques",
    bac2Desc: "Préparation au baccalauréat",
    backCategory: "← Catégorie",
    lightMode: "☀ Clair",
    darkMode: "☾ Sombre",
  },
  ar: {
    dir: "rtl",
    brand: "المحاكي العلمي",
    tagline: "فيزياء وكيمياء تفاعلية",
    heroTitle: "استكشف قوانين الطبيعة",
    heroSubtitle:
      "منصة تفاعلية لفهم الفيزياء والكيمياء من خلال محاكاة مرئية وديناميكية. تعلّم عبر التجربة — بدون معادلات، فقط الحدس.",
    heroCta: "← انطلق إلى المحاكاة",
    categoriesTitle: "اختر فئة",
    categoriesSubtitle: "اختر مجالاً لاكتشاف المحاكاة المتاحة.",
    physics: "الفيزياء",
    chemistry: "الكيمياء",
    physicsDesc: "الميكانيكا والأمواج والكهرباء والمزيد.",
    chemistryDesc: "التفاعلات والجزيئات وحالات المادة.",
    launch: "→ تشغيل",
    backHome: "الرئيسية →",
    backCategories: "الفئات →",
    notFound: "المحاكاة غير موجودة.",
    canvasPlaceholder: "ستكون المحاكاة هنا",
    simulationsTitle: "المحاكاة",
    langSwitch: "Français",
    niveauTitle: "اختر المستوى",
    niveauSub: "اختر مستواك الدراسي لعرض المحاكاة المناسبة.",
    tronc: "الجذع المشترك",
    bac1: "الأولى باكالوريا",
    bac2: "الثانية باكالوريا",
    troncDesc: "المفاهيم الأساسية في الفيزياء والكيمياء",
    bac1Desc: "تعمق في المفاهيم العلمية",
    bac2Desc: "التحضير لامتحان الباكالوريا",
    backCategory: "الفئة →",
    lightMode: "☀ فاتح",
    darkMode: "☾ داكن",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("dark");

  const toggle = () => setLang((l) => (l === "fr" ? "ar" : "fr"));
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const t = translations[lang];

  // Apply theme and dir directly to <html> so body and everything inherits
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("dir", t.dir);
  }, [theme, t.dir]);

  return (
    <LanguageContext.Provider value={{ lang, toggle, t, theme, toggleTheme }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}