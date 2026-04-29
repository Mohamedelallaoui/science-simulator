import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import SimulationPage from "./pages/SimulationPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/sim/:id" element={<SimulationPage />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}