import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  getApiHealth,
  getMaterials,
  type ApiHealth,
  type Material
} from "./api";
import "./styles.css";

function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getApiHealth(), getMaterials()])
      .then(([healthResult, materialsResult]) => {
        setHealth(healthResult);
        setMaterials(materialsResult);
        setError(null);
      })
      .catch((unknownError) => {
        setHealth(null);
        setMaterials([]);
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Unknown API error"
        );
      });
  }, []);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return materials;
    }

    return materials.filter((material) => {
      return [
        material.name,
        material.category_name,
        material.unit_code,
        material.unit_name
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [materials, query]);

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <p className="eyebrow">Диез Имидж</p>
        <h1>Control Center</h1>

        <nav className="nav-list">
          <button className="nav-item nav-item-active" type="button">
            Материалы
          </button>
          <button className="nav-item" type="button" disabled>
            Заказы позже
          </button>
          <button className="nav-item" type="button" disabled>
            Клиенты позже
          </button>
        </nav>

        <div className="api-status">
          <span>API</span>
          <strong>{health?.ok ? "online" : "checking"}</strong>
        </div>
      </aside>

      <section className="content-panel">
        <div className="content-header">
          <div>
            <p className="eyebrow">MVP-1 / read-only</p>
            <h2>Материалы</h2>
            <p>
              Временный первый экран для проверки чтения материалов из общей
              базы `diez-data-core`.
            </p>
          </div>

          <div className="counter-card">
            <span>Всего</span>
            <strong>{materials.length}</strong>
          </div>
        </div>

        <div className="toolbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по материалам, категориям и единицам"
          />
          <span>{filteredMaterials.length} найдено</span>
        </div>

        {error ? (
          <div className="error-card">{error}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Материал</th>
                  <th>Категория</th>
                  <th>Ед.</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => (
                  <tr key={material.id}>
                    <td>{material.id}</td>
                    <td>
                      <strong>{material.name}</strong>
                      {material.description ? (
                        <small>{material.description}</small>
                      ) : null}
                    </td>
                    <td>{material.category_name ?? "—"}</td>
                    <td>{material.unit_code}</td>
                    <td>
                      <span
                        className={
                          material.is_active
                            ? "status-badge status-active"
                            : "status-badge"
                        }
                      >
                        {material.is_active ? "Активен" : "Отключён"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
