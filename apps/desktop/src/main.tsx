import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  getApiHealth,
  getMaterialPricingInputs,
  getMaterials,
  type ApiHealth,
  type Material,
  type MaterialPricingInput
} from "./api";
import "./styles.css";

const primarySections = [
  "Главная",
  "Заказы",
  "Чат",
  "Ozon",
  "Клиенты",
  "Расчёты",
  "Производство",
  "Оплаты",
  "Доставка",
  "Товары",
  "Настройки"
] as const;

type PrimarySection = (typeof primarySections)[number];

const materialsSettingsSection = "Материалы и закупочные цены";

function formatMinorPrice(value: number, currencyCode: string) {
  return `${(value / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currencyCode}`;
}

function App() {
  const [activeSection, setActiveSection] = useState<PrimarySection>("Настройки");
  const [activeSettingsSection, setActiveSettingsSection] = useState(
    materialsSettingsSection
  );
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [pricingInputs, setPricingInputs] = useState<MaterialPricingInput[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getApiHealth(), getMaterials()])
      .then(([healthResult, materialsResult]) => {
        setHealth(healthResult);
        setMaterials(materialsResult);
        setSelectedMaterialId(materialsResult[0]?.id ?? null);
        setError(null);
      })
      .catch((unknownError) => {
        setHealth(null);
        setMaterials([]);
        setSelectedMaterialId(null);
        setPricingInputs([]);
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Unknown API error"
        );
      });
  }, []);

  useEffect(() => {
    if (!selectedMaterialId) {
      setPricingInputs([]);
      setPricingError(null);
      return;
    }

    let isCurrent = true;

    getMaterialPricingInputs(selectedMaterialId)
      .then((result) => {
        if (isCurrent) {
          setPricingInputs(result);
          setPricingError(null);
        }
      })
      .catch((unknownError) => {
        if (isCurrent) {
          setPricingInputs([]);
          setPricingError(
            unknownError instanceof Error
              ? unknownError.message
              : "Unknown pricing inputs error"
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedMaterialId]);

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

  const selectedMaterial = useMemo(() => {
    return materials.find((material) => material.id === selectedMaterialId) ?? null;
  }, [materials, selectedMaterialId]);

  const isMaterialsScreen =
    activeSection === "Настройки" &&
    activeSettingsSection === materialsSettingsSection;

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <p className="eyebrow">Диез Имидж</p>
        <h1>Control Center</h1>

        <nav className="nav-list">
          {primarySections.map((section) => (
            <React.Fragment key={section}>
              <button
                className={
                  section === activeSection ? "nav-item nav-item-active" : "nav-item"
                }
                type="button"
                onClick={() => setActiveSection(section)}
              >
                {section}
              </button>

              {section === "Настройки" && activeSection === "Настройки" ? (
                <div className="subnav-list">
                  <button
                    className={
                      activeSettingsSection === materialsSettingsSection
                        ? "subnav-item subnav-item-active"
                        : "subnav-item"
                    }
                    type="button"
                    onClick={() => setActiveSettingsSection(materialsSettingsSection)}
                  >
                    {materialsSettingsSection}
                  </button>
                </div>
              ) : null}
            </React.Fragment>
          ))}
        </nav>

        <div className="api-status">
          <span>API</span>
          <strong>{health?.ok ? "online" : "checking"}</strong>
        </div>
      </aside>

      <section className="content-panel">
        {isMaterialsScreen ? (
          <>
            <div className="content-header">
              <div>
                <p className="eyebrow">Настройки / MVP-1 / read-only</p>
                <h2>{materialsSettingsSection}</h2>
                <p>
                  Материалы — служебный раздел настроек для расчётов,
                  себестоимости и закупочных цен.
                </p>
                <p>
                  Главный будущий рабочий раздел программы — <strong>Заказы</strong>.
                </p>
              </div>

              <div className="counter-card">
                <span>Материалов</span>
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
              <div className="workspace-grid">
                <section className="materials-section">
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
                          <tr
                            className={
                              material.id === selectedMaterialId
                                ? "selected-row"
                                : undefined
                            }
                            key={material.id}
                            onClick={() => setSelectedMaterialId(material.id)}
                          >
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
                </section>

                <aside className="details-panel">
                  {selectedMaterial ? (
                    <>
                      <p className="eyebrow">Выбранный материал</p>
                      <h3>{selectedMaterial.name}</h3>
                      <p className="muted-text">
                        ID {selectedMaterial.id} ·{" "}
                        {selectedMaterial.category_name ?? "без категории"} ·{" "}
                        {selectedMaterial.unit_code}
                      </p>

                      <div className="details-block">
                        <h4>Закупочные данные</h4>

                        {pricingError ? (
                          <div className="error-card">{pricingError}</div>
                        ) : pricingInputs.length > 0 ? (
                          <div className="price-list">
                            {pricingInputs.map((input) => (
                              <article className="price-card" key={input.id}>
                                <div>
                                  <span>Поставщик</span>
                                  <strong>{input.supplier_name ?? "Не указан"}</strong>
                                </div>
                                <div>
                                  <span>Цена закупки</span>
                                  <strong>
                                    {formatMinorPrice(
                                      input.purchase_price_minor,
                                      input.currency_code
                                    )}
                                  </strong>
                                </div>
                                <div>
                                  <span>Наценка</span>
                                  <strong>{input.markup_percent}%</strong>
                                </div>
                                <div>
                                  <span>Доставка</span>
                                  <strong>
                                    {formatMinorPrice(
                                      input.delivery_price_minor,
                                      input.currency_code
                                    )}
                                  </strong>
                                </div>
                                <div>
                                  <span>Единицы</span>
                                  <strong>
                                    {input.purchase_unit_code} →{" "}
                                    {input.calculation_unit_code}
                                  </strong>
                                </div>
                                <div>
                                  <span>Действует</span>
                                  <strong>
                                    {input.valid_from}
                                    {input.valid_to ? ` — ${input.valid_to}` : ""}
                                  </strong>
                                </div>
                                {input.source_note ? (
                                  <p className="muted-text">{input.source_note}</p>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="muted-text">Закупочные данные не найдены</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="muted-text">Материал не выбран</p>
                  )}
                </aside>
              </div>
            )}
          </>
        ) : (
          <div className="placeholder-panel">
            <p className="eyebrow">Будущий раздел</p>
            <h2>{activeSection}</h2>
            <p>Раздел будет добавлен позже</p>
            <p>
              Главный будущий рабочий раздел программы — <strong>Заказы</strong>.
            </p>
            <p>
              Материалы уже доступны в разделе{" "}
              <strong>Настройки → Материалы и закупочные цены</strong> как
              служебный экран для расчётов и закупочных цен.
            </p>
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
