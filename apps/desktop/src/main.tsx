import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  getApiHealth,
  getCalculationFixtureDebug,
  getMaterialPricingInputs,
  getMaterials,
  type ApiHealth,
  type CalculationFixtureDebugResult,
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

const diezDashboardCards = [
  {
    title: "Заказы с сайта",
    value: "0"
  },
  {
    title: "Сообщения сайта",
    value: "0"
  },
  {
    title: "Заказы в работе",
    value: "0"
  },
  {
    title: "Производство",
    value: "0"
  },
  {
    title: "Оплаты",
    value: "0 ₽"
  },
  {
    title: "Доставка",
    value: "0"
  }
];

const ozonDashboardCards = [
  {
    title: "Заказы Ozon",
    value: "0"
  },
  {
    title: "Сообщения Ozon",
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
    title: "Финансы Ozon",
    value: "0 ₽"
  }
];

const attentionItems = [
  "Новых проблем нет",
  "Интеграция сайта будет подключена позже",
  "Интеграция Ozon будет подключена позже"
];

const nextSteps = [
  "Подключить заказы сайта",
  "Спроектировать клиентов",
  "Спроектировать чат сайта",
  "Подготовить Ozon API-модуль"
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

const diezOrderStatuses = [
  "Новые",
  "В работе",
  "Ожидают клиента",
  "В производстве",
  "Готовы",
  "Завершены"
];

const diezOrderSources = ["Сайт", "Ручной заказ", "Ozon позже"];

const constructorFixturePresets = [
  {
    fixtureId: "simple-light-text-diez-300",
    title: "Световая ДИЕЗ 300",
    recommendedMode: "light"
  },
  {
    fixtureId: "simple-non-light-text-diez-300",
    title: "Несветовая ДИЕЗ 300",
    recommendedMode: "non-light"
  },
  {
    fixtureId: "face-film-red-text-diez-300",
    title: "Световая ДИЕЗ 300 + красная плёнка",
    recommendedMode: "light"
  }
];

type DraftOrderItem = {
  id: string;
  type: "Конструктор объёмных букв";
  title: string;
  priceMinor: number;
  ledCount: number;
  fixtureId: string;
  baselineStatus: string;
  checkMode: string;
  calculationSource: string;
};

type DraftOrderForm = {
  source: "site" | "manual" | "phone";
  customerName: string;
  phone: string;
  email: string;
  estimatedAmount: string;
  itemDescription: string;
  customerComment: string;
  internalComment: string;
  status: "new";
};

type OfficeConstructorForm = {
  text: string;
  heightMm: string;
  mode: "light" | "non-light";
  boardTape: "white-ral-9003-80";
  faceFilm: "none" | "red-6811";
};

type NewOrderStep = "calculation" | "details";

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
  const [isNewOrderFormOpen, setIsNewOrderFormOpen] = useState(false);
  const [newOrderStep, setNewOrderStep] = useState<NewOrderStep>("calculation");
  const [isConstructorPanelOpen, setIsConstructorPanelOpen] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [fixtureResult, setFixtureResult] =
    useState<CalculationFixtureDebugResult | null>(null);
  const [fixtureError, setFixtureError] = useState<string | null>(null);
  const [isFixtureLoading, setIsFixtureLoading] = useState(false);
  const [draftOrderItems, setDraftOrderItems] = useState<DraftOrderItem[]>([]);
  const [isDraftJsonVisible, setIsDraftJsonVisible] = useState(false);
  const [officeConstructorForm, setOfficeConstructorForm] =
    useState<OfficeConstructorForm>({
      text: "ДИЕЗ",
      heightMm: "300",
      mode: "light",
      boardTape: "white-ral-9003-80",
      faceFilm: "none"
    });
  const [draftOrderForm, setDraftOrderForm] = useState<DraftOrderForm>({
    source: "manual",
    customerName: "",
    phone: "",
    email: "",
    estimatedAmount: "",
    itemDescription: "",
    customerComment: "",
    internalComment: "",
    status: "new"
  });

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

  const draftOrderTotalMinor = useMemo(() => {
    return draftOrderItems.reduce((total, item) => total + item.priceMinor, 0);
  }, [draftOrderItems]);

  const draftOrderPayload = useMemo(() => {
    return {
      source: draftOrderForm.source,
      customer: {
        name: draftOrderForm.customerName || null
      },
      contacts: {
        phone: draftOrderForm.phone || null,
        email: draftOrderForm.email || null
      },
      comments: {
        customer: draftOrderForm.customerComment || null,
        internal: draftOrderForm.internalComment || null
      },
      status: draftOrderForm.status,
      estimatedAmountText: draftOrderForm.estimatedAmount || null,
      requestedWork: draftOrderForm.itemDescription || null,
      items: draftOrderItems.map((item) => ({
        type: item.type,
        title: item.title,
        priceMinor: item.priceMinor,
        calculationData: {
          source: item.calculationSource,
          fixtureId: item.fixtureId,
          ledCount: item.ledCount,
          baselineStatus: item.baselineStatus,
          checkMode: item.checkMode
        }
      })),
      totalAmountMinor: draftOrderTotalMinor
    };
  }, [draftOrderForm, draftOrderItems, draftOrderTotalMinor]);

  const recommendedConstructorFixtureId = useMemo(() => {
    const normalizedText = officeConstructorForm.text.trim().toUpperCase();
    const normalizedHeight = officeConstructorForm.heightMm.trim();

    if (normalizedText !== "ДИЕЗ" || normalizedHeight !== "300") {
      return null;
    }

    if (officeConstructorForm.mode === "non-light") {
      return "simple-non-light-text-diez-300";
    }

    return officeConstructorForm.faceFilm === "red-6811"
      ? "face-film-red-text-diez-300"
      : "simple-light-text-diez-300";
  }, [officeConstructorForm]);

  const activeSections =
    activeWorkspace === "Диез Имидж" ? diezSections : ozonSections;
  const isHomeScreen = activeSection === "Главная";
  const isDiezOrdersScreen =
    activeWorkspace === "Диез Имидж" && activeSection === "Заказы";
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

  function handleOpenNewOrder() {
    setIsNewOrderFormOpen(true);
    setNewOrderStep("calculation");
    setIsConstructorPanelOpen(false);
  }

  function updateDraftOrderForm<Field extends keyof DraftOrderForm>(
    field: Field,
    value: DraftOrderForm[Field]
  ) {
    setDraftOrderForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateOfficeConstructorForm<Field extends keyof OfficeConstructorForm>(
    field: Field,
    value: OfficeConstructorForm[Field]
  ) {
    setOfficeConstructorForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleConstructorPresetClick(fixtureId: string) {
    setSelectedFixtureId(fixtureId);
    setFixtureResult(null);
    setFixtureError(null);
    setIsFixtureLoading(true);

    getCalculationFixtureDebug(fixtureId)
      .then((result) => {
        setFixtureResult(result);
        setFixtureError(null);
      })
      .catch((unknownError) => {
        setFixtureResult(null);
        setFixtureError(
          unknownError instanceof Error
            ? unknownError.message
            : "Unknown calculation fixture error"
        );
      })
      .finally(() => {
        setIsFixtureLoading(false);
      });
  }

  function handleAddConstructorItem() {
    if (!fixtureResult) {
      return;
    }

    const preset = constructorFixturePresets.find(
      (item) => item.fixtureId === fixtureResult.fixtureId
    );

    setDraftOrderItems((items) => [
      ...items,
      {
        id: `${fixtureResult.fixtureId}-${Date.now()}-${items.length}`,
        type: "Конструктор объёмных букв",
        title: preset?.title ?? fixtureResult.fixtureId,
        priceMinor: fixtureResult.calculatedTotalPriceMinor,
        ledCount: fixtureResult.ledCount,
        fixtureId: fixtureResult.fixtureId,
        baselineStatus: fixtureResult.roundedTotalPriceMinorMatches
          ? "Baseline совпал"
          : "Есть расхождение",
        checkMode: fixtureResult.mode,
        calculationSource:
          "@diez/calculation-core через API debug endpoint"
      }
    ]);
    setIsConstructorPanelOpen(false);
  }

  function handleRemoveDraftOrderItem(itemId: string) {
    setDraftOrderItems((items) => items.filter((item) => item.id !== itemId));
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
                  <p>Общий мониторинг Диез Имидж и Ozon.</p>
                </div>
              </div>

              <div className="dashboard-zone-grid">
                <section className="dashboard-zone">
                  <div className="dashboard-zone-header">
                    <div>
                      <p className="eyebrow">Первый этап</p>
                      <h3>Диез Имидж</h3>
                    </div>
                    <span>Основная бизнес-система</span>
                  </div>

                  <div className="dashboard-card-grid">
                    {diezDashboardCards.map((card) => (
                      <article className="metric-card" key={card.title}>
                        <span>{card.title}</span>
                        <strong>{card.value}</strong>
                      </article>
                    ))}
                  </div>

                  <p className="dashboard-note">
                    Первый этап разработки: заказы, клиенты, чат сайта, расчёты и
                    производство Диез Имидж.
                  </p>
                </section>

                <section className="dashboard-zone">
                  <div className="dashboard-zone-header">
                    <div>
                      <p className="eyebrow">Будущий модуль</p>
                      <h3>Ozon</h3>
                    </div>
                    <span>Канал внутри общей системы</span>
                  </div>

                  <div className="dashboard-card-grid">
                    {ozonDashboardCards.map((card) => (
                      <article className="metric-card" key={card.title}>
                        <span>{card.title}</span>
                        <strong>{card.value}</strong>
                      </article>
                    ))}
                  </div>

                  <p className="dashboard-note">
                    Ozon будет подключён позже как крупный модуль для ежедневной
                    работы вместо seller.ozon.ru.
                  </p>
                </section>
              </div>

              <div className="dashboard-bottom-grid">
                <section className="task-panel">
                  <div className="section-heading">
                    <h3>Требуют внимания</h3>
                    <span>Mock</span>
                  </div>
                  <ul className="attention-list">
                    {attentionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="task-panel">
                  <div className="section-heading">
                    <h3>Следующие шаги</h3>
                    <span>План</span>
                  </div>
                  <ul className="next-steps">
                    {nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="important-panel">
                <p className="eyebrow">Важно</p>
                <p>
                  Главная всегда остаётся общей панелью мониторинга. Переключатель
                  `Диез Имидж / Ozon` влияет на остальные рабочие разделы.
                </p>
                <p>
                  Материалы и закупочные цены находятся в настройках и
                  используются для расчётов себестоимости.
                </p>
              </section>
            </section>
          ) : isDiezOrdersScreen ? (
            <section className="orders-panel">
              <div className="content-header">
                <div>
                  <p className="eyebrow">Диез Имидж / первый этап</p>
                  <h2>Заказы Диез Имидж</h2>
                  <p>
                    Главный рабочий раздел для заказов с сайта, ручных заказов,
                    клиентов, расчётов и производства.
                  </p>
                </div>

                <button
                  className="primary-action-button"
                  onClick={handleOpenNewOrder}
                  type="button"
                >
                  + Новый заказ
                </button>
              </div>

              <div className="order-status-grid">
                {diezOrderStatuses.map((status) => (
                  <article className="order-status-card" key={status}>
                    <span>{status}</span>
                    <strong>0</strong>
                  </article>
                ))}
              </div>

              {isNewOrderFormOpen ? (
                <section className="order-form-panel">
                  <div className="section-heading">
                    <div>
                      <h3>Новый заказ</h3>
                      <p>
                        Сначала рассчитайте изделие, затем примите заказ и
                        заполните данные клиента.
                      </p>
                    </div>
                    <button
                      className="secondary-action-button"
                      onClick={() => setIsNewOrderFormOpen(false)}
                      type="button"
                    >
                      Закрыть
                    </button>
                  </div>

                  <div className="order-step-tabs">
                    <span
                      className={
                        newOrderStep === "calculation"
                          ? "order-step-tab order-step-tab-active"
                          : "order-step-tab"
                      }
                    >
                      Шаг 1 — Расчёт
                    </span>
                    <span
                      className={
                        newOrderStep === "details"
                          ? "order-step-tab order-step-tab-active"
                          : "order-step-tab"
                      }
                    >
                      Шаг 2 — Оформление
                    </span>
                  </div>

                  {newOrderStep === "calculation" ? (
                    <section className="order-step-panel">
                      <p className="eyebrow">Шаг 1 — Расчёт</p>
                      <h3>Расчёт вывески</h3>
                      <p>
                        Сначала рассчитайте изделие и добавьте позицию в заказ.
                        Если цена устраивает, можно перейти к оформлению.
                      </p>

                      <section className="constructor-entry-card">
                        <div>
                          <h3>Конструктор объёмных букв</h3>
                          <p>Офисный конструктор для расчёта позиции заказа.</p>
                        </div>
                        <button
                          className="primary-action-button"
                          onClick={() => setIsConstructorPanelOpen(true)}
                          type="button"
                        >
                          Открыть конструктор
                        </button>
                      </section>

                      {isConstructorPanelOpen ? (
                        <section className="constructor-debug-panel">
                          <div className="section-heading">
                            <div>
                              <h3>Офисный конструктор</h3>
                              <p>
                                Временная панель расчёта через debug endpoints.
                                Полный визуальный конструктор будет подключён
                                позже.
                              </p>
                            </div>
                            <button
                              className="secondary-action-button"
                              onClick={() => setIsConstructorPanelOpen(false)}
                              type="button"
                            >
                              Вернуться к заказу
                            </button>
                          </div>

                          <div className="office-constructor-fields">
                            <label className="form-field">
                              <span>Текст</span>
                              <input
                                value={officeConstructorForm.text}
                                onChange={(event) =>
                                  updateOfficeConstructorForm(
                                    "text",
                                    event.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="form-field">
                              <span>Высота, мм</span>
                              <input
                                value={officeConstructorForm.heightMm}
                                onChange={(event) =>
                                  updateOfficeConstructorForm(
                                    "heightMm",
                                    event.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="form-field">
                              <span>Режим</span>
                              <select
                                value={officeConstructorForm.mode}
                                onChange={(event) =>
                                  updateOfficeConstructorForm(
                                    "mode",
                                    event.target
                                      .value as OfficeConstructorForm["mode"]
                                  )
                                }
                              >
                                <option value="light">Световая</option>
                                <option value="non-light">Несветовая</option>
                              </select>
                            </label>

                            <label className="form-field">
                              <span>Борт</span>
                              <select
                                value={officeConstructorForm.boardTape}
                                onChange={(event) =>
                                  updateOfficeConstructorForm(
                                    "boardTape",
                                    event.target
                                      .value as OfficeConstructorForm["boardTape"]
                                  )
                                }
                              >
                                <option value="white-ral-9003-80">
                                  Белый RAL 9003 / 80 мм
                                </option>
                              </select>
                            </label>

                            <label className="form-field">
                              <span>Плёнка</span>
                              <select
                                value={officeConstructorForm.faceFilm}
                                onChange={(event) =>
                                  updateOfficeConstructorForm(
                                    "faceFilm",
                                    event.target
                                      .value as OfficeConstructorForm["faceFilm"]
                                  )
                                }
                              >
                                <option value="none">Без плёнки</option>
                                <option value="red-6811">Красная 6811</option>
                              </select>
                            </label>
                          </div>

                          <p className="constructor-helper-text">
                            Пока доступны только контрольные варианты расчёта.
                            Произвольный расчёт будет подключён после завершения
                            общего layout/geometry core.
                          </p>

                          <div className="constructor-preset-grid">
                            {constructorFixturePresets.map((preset) => (
                              <button
                                className={
                                  selectedFixtureId === preset.fixtureId
                                    ? "constructor-preset-card constructor-preset-card-active"
                                    : preset.fixtureId ===
                                        recommendedConstructorFixtureId
                                      ? "constructor-preset-card constructor-preset-card-recommended"
                                      : "constructor-preset-card"
                                }
                                key={preset.fixtureId}
                                onClick={() =>
                                  handleConstructorPresetClick(preset.fixtureId)
                                }
                                type="button"
                              >
                                <strong>{preset.title}</strong>
                                <span>{preset.fixtureId}</span>
                                {preset.fixtureId ===
                                recommendedConstructorFixtureId ? (
                                  <em>Рекомендуемый пресет</em>
                                ) : null}
                              </button>
                            ))}
                          </div>

                          <p className="constructor-warning">
                            Это временная проверка shared-core, а не финальный
                            визуальный конструктор и не сохранение позиции
                            заказа.
                          </p>

                          {isFixtureLoading ? (
                            <div className="constructor-result-card">
                              Загружаем проверочный расчёт...
                            </div>
                          ) : fixtureError ? (
                            <div className="error-card">{fixtureError}</div>
                          ) : fixtureResult ? (
                            <div className="constructor-result-card">
                              <div className="constructor-result-header">
                                <div>
                                  <span>Итоговая цена</span>
                                  <strong>
                                    {fixtureResult.formattedTotalPrice}
                                  </strong>
                                </div>
                                <span
                                  className={
                                    fixtureResult.roundedTotalPriceMinorMatches
                                      ? "match-status match-status-ok"
                                      : "match-status"
                                  }
                                >
                                  {fixtureResult.roundedTotalPriceMinorMatches
                                    ? "baseline совпал"
                                    : "есть расхождение"}
                                </span>
                              </div>

                              <div className="constructor-result-grid">
                                <div>
                                  <span>LED count</span>
                                  <strong>{fixtureResult.ledCount}</strong>
                                </div>
                                <div>
                                  <span>LED baseline</span>
                                  <strong>
                                    {fixtureResult.ledCountMatches
                                      ? "совпал"
                                      : "не совпал"}
                                  </strong>
                                </div>
                                <div>
                                  <span>Плёнка</span>
                                  <strong>
                                    {fixtureResult.faceFilmCostMinor === null
                                      ? "нет данных"
                                      : formatMinorPrice(
                                          fixtureResult.faceFilmCostMinor,
                                          "RUB"
                                        )}
                                  </strong>
                                </div>
                                <div>
                                  <span>Плёнка baseline</span>
                                  <strong>
                                    {fixtureResult.faceFilmCostMatches === null
                                      ? "нет данных"
                                      : fixtureResult.faceFilmCostMatches
                                        ? "совпал"
                                        : "не совпал"}
                                  </strong>
                                </div>
                                <div>
                                  <span>Режим проверки</span>
                                  <strong>{fixtureResult.mode}</strong>
                                </div>
                                <div>
                                  <span>Fixture</span>
                                  <strong>{fixtureResult.fixtureId}</strong>
                                </div>
                              </div>

                              <p className="muted-text">
                                {fixtureResult.limitation}
                              </p>

                              <button
                                className="primary-action-button constructor-add-button"
                                onClick={handleAddConstructorItem}
                                type="button"
                              >
                                Добавить в заказ
                              </button>
                            </div>
                          ) : null}
                        </section>
                      ) : null}

                      <div className="accept-order-panel">
                        <button
                          className="primary-action-button"
                          disabled={draftOrderItems.length === 0}
                          onClick={() => setNewOrderStep("details")}
                          type="button"
                        >
                          Принять заказ
                        </button>
                        <p>
                          {draftOrderItems.length === 0
                            ? "Добавьте хотя бы одну позицию заказа."
                            : "Цена рассчитана. Можно перейти к оформлению заказа."}
                        </p>
                      </div>
                    </section>
                  ) : (
                    <section className="order-step-panel">
                      <p className="eyebrow">Шаг 2 — Оформление</p>
                      <h3>Оформление заказа</h3>
                      <p>
                        Заполните данные клиента и проверьте позиции заказа.
                        Сохранение в базу пока не подключено.
                      </p>

                      <form
                        className="order-form-grid"
                        onSubmit={(event) => event.preventDefault()}
                      >
                        <label className="form-field">
                          <span>Клиент</span>
                          <input
                            value={draftOrderForm.customerName}
                            onChange={(event) =>
                              updateDraftOrderForm(
                                "customerName",
                                event.target.value
                              )
                            }
                            placeholder="Имя клиента или компания"
                          />
                        </label>

                        <label className="form-field">
                          <span>Телефон</span>
                          <input
                            value={draftOrderForm.phone}
                            onChange={(event) =>
                              updateDraftOrderForm("phone", event.target.value)
                            }
                            placeholder="+7..."
                          />
                        </label>

                        <label className="form-field form-field-wide">
                          <span>Комментарий к заказу</span>
                          <textarea
                            value={draftOrderForm.customerComment}
                            onChange={(event) =>
                              updateDraftOrderForm(
                                "customerComment",
                                event.target.value
                              )
                            }
                            placeholder="Что важно учесть по заказу"
                          />
                        </label>
                      </form>
                    </section>
                  )}

                  <section className="draft-items-panel">
                    <div className="section-heading">
                      <h3>Позиции заказа</h3>
                      <span>Локальный черновик</span>
                    </div>

                    {draftOrderItems.length === 0 ? (
                      <p className="draft-empty-text">Позиции пока не добавлены</p>
                    ) : (
                      <div className="draft-items-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>№</th>
                              <th>Тип</th>
                              <th>Название</th>
                              <th>Цена</th>
                              <th>Статус</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {draftOrderItems.map((item, index) => (
                              <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.type}</td>
                                <td>
                                  <strong>{item.title}</strong>
                                  <small>
                                    {item.fixtureId}, LED: {item.ledCount}
                                  </small>
                                  <small>{item.calculationSource}</small>
                                </td>
                                <td>{formatMinorPrice(item.priceMinor, "RUB")}</td>
                                <td>{item.baselineStatus}</td>
                                <td>
                                  <button
                                    className="text-action-button"
                                    onClick={() =>
                                      handleRemoveDraftOrderItem(item.id)
                                    }
                                    type="button"
                                  >
                                    Удалить
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="draft-total-row">
                      <span>Итого:</span>
                      <strong>{formatMinorPrice(draftOrderTotalMinor, "RUB")}</strong>
                    </div>

                    <p className="constructor-warning">
                      Черновик не сохраняется в базу. Сохранение будет
                      подключено после создания таблиц заказов и API.
                    </p>

                    <div className="save-order-placeholder">
                      <button
                        className="primary-action-button"
                        disabled
                        title="Сохранение будет подключено после создания таблиц заказов и API"
                        type="button"
                      >
                        Сохранить заказ
                      </button>
                      <div>
                        <p>
                          Сохранение будет подключено после создания таблиц
                          заказов и API.
                        </p>
                        {draftOrderItems.length === 0 ? (
                          <p>Добавьте хотя бы одну позицию заказа.</p>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="technical-data-panel">
                    <div>
                      <p>
                        Технические данные нужны только для разработки будущего
                        API сохранения заказа.
                      </p>
                    </div>
                    <button
                      className="secondary-action-button"
                      onClick={() =>
                        setIsDraftJsonVisible((isVisible) => !isVisible)
                      }
                      type="button"
                    >
                      {isDraftJsonVisible
                        ? "Скрыть технические данные"
                        : "Показать технические данные"}
                    </button>

                    {isDraftJsonVisible ? (
                      <pre className="order-draft-json">
                        {JSON.stringify(draftOrderPayload, null, 2)}
                      </pre>
                    ) : null}
                  </section>
                </section>
              ) : null}

              <div className="orders-workspace-grid">
                <section className="orders-table-panel">
                  <div className="section-heading">
                    <h3>Список заказов</h3>
                    <span>Mock / read-only</span>
                  </div>

                  <div className="orders-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>№</th>
                          <th>Источник</th>
                          <th>Клиент</th>
                          <th>Заказ</th>
                          <th>Статус</th>
                          <th>Сумма</th>
                          <th>Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="empty-row">
                          <td colSpan={7}>
                            Заказов пока нет. Позже здесь появятся заказы с
                            сайта, ручные заказы и заказы из других каналов.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="order-sources-panel">
                  <p className="eyebrow">Источники заказов</p>
                  <div className="order-source-list">
                    {diezOrderSources.map((source) => (
                      <div className="order-source-item" key={source}>
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                  <p>
                    Ozon не смешивается с текущим экраном заказов Диез Имидж.
                    Ozon-заказы будут отдельным каналом/модулем позже.
                  </p>
                </aside>
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
