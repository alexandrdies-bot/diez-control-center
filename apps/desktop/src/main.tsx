import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Диез Имидж</p>
        <h1>Control Center</h1>
        <p>
          Главная ПК-программа для управления материалами, ценами, товарами,
          заказами и будущими интеграциями.
        </p>
        <div className="status-row">
          <span>MVP-1</span>
          <strong>Read-only API готов</strong>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
