import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getApiHealth, type ApiHealth } from "./api";
import "./styles.css";

function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApiHealth()
      .then((result) => {
        setHealth(result);
        setError(null);
      })
      .catch((unknownError) => {
        setHealth(null);
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Unknown API error"
        );
      });
  }, []);

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

        <div className="api-panel">
          <h2>API status</h2>

          {health ? (
            <pre>{JSON.stringify(health, null, 2)}</pre>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : (
            <p>Проверяем API...</p>
          )}
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
