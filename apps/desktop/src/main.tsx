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

const workspaceNames = ["Диез Имидж", "Ozon"] as const;

type WorkspaceName = (typeof workspaceNames)[number];

const roleLabels = {
  admin: "Админ",
  manager: "Менеджер",
  designer: "Дизайнер",
  production: "Производство",
  accountant: "Бухгалтерия",
  viewer: "Просмотр"
} as const;

// TODO: заменить mock-роль на реального пользователя после добавления авторизации.
const currentUserRole = "admin";

const materialsSettingsSection = "Материалы и закупочные цены";

const diezSections = [
  "Заказы",
  "Чат",
  "Клиенты",
  "Расчёты",
  "Производство",
  "Оплаты",
  "Доставка",
  "Товары"
];

const ozonSections = [
  "Главная",
  "Заказы",
  "Сообщения",
  "Товары",
  "Остатки",
  "Поставки",
  "Возвраты",
  "Финансы",
  "Настройки Ozon"
];

const dashboardMetrics = [
  {
    label: "Новые заказы",
    value: "0"
  },
  {
    label: "Сообщения сайта",
    value: "0"
  },
  {
    label: "Заказы в работе",
    value: "0"
  },
  {
    label: "Требуют внимания",
    value: "0"
  }
];

const orderChannels = [
  {
    title: "Сайт",
    text: "Ожидает подключения заказов"
  },
  {
    title: "Ozon",
    text: "Интеграция будет добавлена позже"
  },
  {
    title: "Ручные заказы",
    text: "Будет добавление из приложения"
  }
];

const operationCards = [
  {
    title: "Производство",
    text: "Нет активных задач"
  },
  {
    title: "Оплаты",
    text: "0 ₽ ожидают оплаты"
  },
  {
    title: "Доставка",
    text: "Нет активных отправлений"
  },
  {
    title: "Расчёты",
    text: "Модуль будет добавлен позже"
  }
];

const todayTasks = [
  "Проверить новые заявки с сайта",
  "Проверить сообщения клиентов",
  "Проверить заказы Ozon после подключения",
  "Проверить заказы в производстве"
];

const ozonCards = [
  {
    title: "Заказы Ozon",
    value: "0"
  },
  {
    title: "Сообщения покупателей",
    value: "0"
  },
  {
    title: "Товары Ozon",
    value: "Не подключено"
  },
  {
    title: "Остатки",
    value: "Не подключено"
  },
  {
    title: "Поставки",
    value: "Не подключено"
  },
  {
    title: "Возвраты",
    value: "0"
  },
  {
    title: "Финансы Ozon",
    value: "0 ₽"
  },
  {
    title: "Требуют внимания",
    value: "0"
  }
];

function formatMinorPrice(value: number, currencyCode: string) {
  return `${(value / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currencyCode}`;
}

function App() {
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceName>("Диез Имидж");
  const [activeSection, setActiveSection] = useState("Главная");
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

  const activeSections =
    activeWorkspace === "Диез Имидж" ? diezSections : ozonSections;
  const isHomeScreen = activeSection === "Главная";
  const isMaterialsScreen =
    activeWorkspace === "Диез Имидж" &&
    activeSection === "Настройки" &&
    activeSettingsSection === materialsSettingsSection;
  const isOzonWorkspaceSection =
    activeWorkspace === "Ozon" && activeSection !== "Главная";

  function handleWorkspaceChange(workspace: WorkspaceName) {
    setActiveWorkspace(workspace);
  }

  function handleSectionChange(section: string) {
    setActiveSection(section);
  }

  return (
    <main className="app-shell">
      <div className="workbar" aria-label="Быстрые рабочие фильтры">
        <div className="workbar-main">
          <div className="workspace-switcher" aria-label="Рабочая область">
            {workspaceNames.map((workspace) => (
              <button
                className={
                  workspace === activeWorkspace
                    ? "workspace-switcher-item workspace-switcher-item-active"
                    : "workspace-switcher-item"
                }
                key={workspace}
                onClick={() => handleWorkspaceChange(workspace)}
                type="button"
              >
                {workspace}
              </button>
            ))}
          </div>

          <div className="workbar-items">
            <button
              className={
                activeSection === "Главная"
                  ? "workbar-item workbar-item-active"
                  : "workbar-item"
              }
              onClick={() => setActiveSection("Главная")}
              type="button"
            >
              Главная
            </button>
          </div>
        </div>

        <div className="workbar-actions">
          <span
            className={health?.ok ? "api-dot api-dot-online" : "api-dot"}
            title={health?.ok ? "API online" : "API checking"}
          />
          <button
            className="icon-button"
            onClick={() => console.log("notifications")}
            title="Уведомления"
            type="button"
          >
            <img alt="" src="/svg/bell-ringing-2.svg" />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setActiveWorkspace("Диез Имидж");
              setActiveSection("Настройки");
            }}
            title="Настройки"
            type="button"
          >
            <img alt="" src="/svg/settings.svg" />
          </button>
        </div>
      </div>

      <div className="app-layout">
        <aside className="sidebar">
          <p className="eyebrow">{activeWorkspace}</p>
          <h1>Control Center</h1>

          <nav className="nav-list">
            {activeSections.map((section) => (
              <React.Fragment key={section}>
                <button
                  className={
                    section === activeSection ? "nav-item nav-item-active" : "nav-item"
                  }
                  type="button"
                  onClick={() => handleSectionChange(section)}
                >
                  {section}
                </button>

                {section === "Настройки" &&
                activeWorkspace === "Диез Имидж" &&
                activeSection === "Настройки" ? (
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
        </aside>

        <section className="content-panel">
          {isHomeScreen ? (
            <section className="dashboard-panel">
              <div className="content-header">
                <div>
                  <p className="eyebrow">Общий мониторинг</p>
                  <h2>Панель управления</h2>
                  <p>
                    Общий мониторинг: сайт, Ozon, заказы, сообщения, оплата,
                    доставка и производство.
                  </p>
                </div>
              </div>

              <div className="metric-grid">
                {dashboardMetrics.map((metric) => (
                  <article className="metric-card" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                ))}
              </div>

              <div className="dashboard-section">
                <div className="section-heading">
                  <h3>Каналы заказов</h3>
                  <span>Сайт и Ozon</span>
                </div>
                <div className="dashboard-grid">
                  {orderChannels.map((card) => (
                    <article className="dashboard-card" key={card.title}>
                      <h4>{card.title}</h4>
                      <p>{card.text}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="dashboard-section">
                <div className="section-heading">
                  <h3>Операции</h3>
                  <span>Рабочий обзор</span>
                </div>
                <div className="dashboard-grid">
                  {operationCards.map((card) => (
                    <article className="dashboard-card" key={card.title}>
                      <h4>{card.title}</h4>
                      <p>{card.text}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="dashboard-bottom-grid">
                <section className="task-panel">
                  <div className="section-heading">
                    <h3>Задачи на сегодня</h3>
                    <span>Черновик</span>
                  </div>
                  <ul className="task-list">
                    {todayTasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </section>

                <section className="important-panel">
                  <p className="eyebrow">Важно</p>
                  <p>
                    Главная — общая для `Диез Имидж` и `Ozon`. Переключатель
                    рабочей области влияет на остальные разделы.
                  </p>
                  <p>
                    Материалы и закупочные цены находятся в настройках и
                    используются для расчётов себестоимости.
                  </p>
                </section>
              </div>
            </section>
          ) : isOzonWorkspaceSection ? (
            <section className="dashboard-panel">
              <div className="content-header">
                <div>
                  <p className="eyebrow">Рабочая область Ozon</p>
                  <h2>{activeSection}</h2>
                  <p>
                    Рабочая область для заказов, товаров, остатков, поставок и
                    сообщений Ozon.
                  </p>
                </div>
              </div>

              <div className="ozon-status-panel">
                Интеграция Ozon будет подключена позже через API и общую базу.
              </div>

              <div className="metric-grid">
                {ozonCards.map((card) => (
                  <article className="metric-card" key={card.title}>
                    <span>{card.title}</span>
                    <strong>{card.value}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : isMaterialsScreen ? (
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
                    Главный будущий рабочий раздел программы —{" "}
                    <strong>Заказы</strong>.
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
                                    <strong>
                                      {input.supplier_name ?? "Не указан"}
                                    </strong>
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
              <p className="eyebrow">{activeWorkspace}</p>
              <h2>{activeSection}</h2>
              <p>Раздел будет добавлен позже</p>
              <p>
                Главная показывает общий мониторинг по всем каналам. Рабочая
                область `{activeWorkspace}` влияет на остальные разделы.
              </p>
              <p>
                Материалы доступны в разделе{" "}
                <strong>Настройки → Материалы и закупочные цены</strong>.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
