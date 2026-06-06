import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import chevronLeftIconUrl from "./assets/svg/chevron-left.svg";
import fileDownloadIconUrl from "./assets/svg/file-download.svg";
import fileUploadIconUrl from "./assets/svg/file-upload.svg";
import {
  getApiHealth,
  getMaterialPricingInputs,
  getMaterials,
  type ApiHealth,
  type Material,
  type MaterialPricingInput
} from "./api";
import {
  analyzeKonstruktorGeometry,
  calculateKonstruktorLedModulesByGeometry,
  calculateKonstruktorLightingCost,
  calculateKonstruktorMaterialCosts,
  calculateLightLetterProductionCostsByElements,
  formatKonstruktorPriceMinor,
  getKonstruktorBackPvcByHeight,
  getKonstruktorFaceAcrylicByHeight,
  getKonstruktorFacePvcByHeight,
  shouldUseKonstruktorFaceFilm
} from "@diez/calculation-core";
import {
  calculateDtfA3PrintCostBreakdown,
  formatPrintPriceMinor
} from "@diez/calculation-core/print";
import {
  DEFAULT_BOARD_TAPE_OPTION,
  getBoardTapeColorHex,
  getBoardTapeColorLabel,
  getBoardTapeColorOptions,
  getBoardTapeColorTooltipLabel,
  getBoardTapeOption,
  getBoardTapeWidthOptions,
  getBoardTapeThicknessOptions,
  type BoardTapeOption
} from "./konstruktor/board-tape-options";
import {
  DEFAULT_FACE_FILM_OPTION,
  getFaceFilmColorHex,
  getFaceFilmColorLabel,
  getFaceFilmOption,
  getFaceFilmOptions,
  NO_FACE_FILM_COLOR_CODE,
  type FaceFilmOption
} from "./konstruktor/face-film-options";
import {
  KONSTRUKTOR_SCENE_HEIGHT,
  KONSTRUKTOR_SCENE_WIDTH,
  createKonstruktorPreviewSvg,
  createKonstruktorTextLayout,
  formatKonstruktorNumber,
  type KonstruktorTextLayout
} from "./konstruktor/text-layout";
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

type DraftOrderItem = {
  id: string;
  serviceType: "light-letter" | "dtf-print";
  type: "Конструктор объёмных букв" | "DTF-печать";
  title: string;
  text?: string;
  heightMm?: string;
  lightingMode?: OfficeConstructorForm["mode"];
  boardTapeColorName?: string;
  boardWidthMm?: number;
  boardThicknessMm?: number;
  resolvedBoardTapeMaterialName?: string;
  resolvedBoardTapeThicknessMm?: number;
  faceFilmColorCode?: string;
  faceFilmLabel?: string;
  widthCm?: number;
  heightCm?: number;
  quantity?: number;
  areaM2?: number;
  totalPriceMinor?: number;
  priceMinor: number;
  formattedPrice: string;
  ledCount?: number;
  calculationId: string;
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
  boardTapeColorName: string;
  boardWidthMm: number;
  boardThicknessMm: number;
  faceFilmColorCode: string;
};

type DtfPrintForm = {
  widthCm: string;
  heightCm: string;
  quantity: string;
};

type NewOrderStep = "start" | "calculation" | "dtf-print" | "details";

type OfficeConstructorCalculationResult = {
  calculationId: string;
  formattedPrice: string;
  ledCount: number;
  priceMinor: number;
  boardTape: BoardTapeOption;
  faceFilm: FaceFilmOption;
  source: "office-real-calculation";
};

type DtfPrintCalculationResult = {
  areaM2: number;
  calculationId: string;
  formattedPrice: string;
  formattedUnitPrice: string;
  heightCm: number;
  priceMinor: number;
  quantity: number;
  unitPriceMinor: number;
  widthCm: number;
};

function formatMinorPrice(value: number, currencyCode: string) {
  return `${(value / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currencyCode}`;
}

const DTF_A3_WIDTH_CM = 30;
const DTF_A3_HEIGHT_CM = 40;
const DTF_A3_AREA_M2 = 0.3 * 0.4;

function parsePositiveNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatCompactNumber(value: number) {
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1
  });
}

function formatAreaM2(value: number) {
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3
  });
}

function fitKonstruktorPreviewMarkupToLayout(
  markup: string,
  layout: KonstruktorTextLayout
) {
  const svgBounds = {
    maxX: KONSTRUKTOR_SCENE_WIDTH / 2 + layout.bounds.maxX,
    maxY: KONSTRUKTOR_SCENE_HEIGHT / 2 - layout.bounds.minY,
    minX: KONSTRUKTOR_SCENE_WIDTH / 2 + layout.bounds.minX,
    minY: KONSTRUKTOR_SCENE_HEIGHT / 2 - layout.bounds.maxY
  };
  const contentWidth = Math.max(1, svgBounds.maxX - svgBounds.minX);
  const contentHeight = Math.max(1, svgBounds.maxY - svgBounds.minY);
  const padding = Math.max(32, Math.max(contentWidth, contentHeight) * 0.12);
  const viewBoxWidth = Math.max(
    contentWidth + padding * 2,
    KONSTRUKTOR_SCENE_WIDTH * 0.52
  );
  const viewBoxHeight = Math.max(
    contentHeight + padding * 2,
    KONSTRUKTOR_SCENE_HEIGHT * 0.42
  );
  const centerX = (svgBounds.minX + svgBounds.maxX) / 2;
  const centerY = (svgBounds.minY + svgBounds.maxY) / 2;
  const viewBox = `${formatKonstruktorNumber(
    centerX - viewBoxWidth / 2
  )} ${formatKonstruktorNumber(centerY - viewBoxHeight / 2)} ${formatKonstruktorNumber(
    viewBoxWidth
  )} ${formatKonstruktorNumber(viewBoxHeight)}`;

  return markup
    .replace(/viewBox="[^"]+"/, `viewBox="${viewBox}"`)
    .replace("<svg ", '<svg width="100%" height="100%" ');
}

function App() {
  const constructorLayoutFileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [isDraftOrderDetailsOpen, setIsDraftOrderDetailsOpen] = useState(false);
  const [newOrderStep, setNewOrderStep] = useState<NewOrderStep>("calculation");
  const [isConstructorPanelOpen, setIsConstructorPanelOpen] = useState(false);
  const [openColorPalette, setOpenColorPalette] = useState<
    "board" | "face" | null
  >(null);
  const [constructorPreviewMarkup, setConstructorPreviewMarkup] =
    useState<string | null>(null);
  const [constructorPreviewError, setConstructorPreviewError] =
    useState<string | null>(null);
  const [constructorLayout, setConstructorLayout] =
    useState<KonstruktorTextLayout | null>(null);
  const [constructorFileActionStatus, setConstructorFileActionStatus] =
    useState<string | null>(null);
  const [draftOrderItems, setDraftOrderItems] = useState<DraftOrderItem[]>([]);
  const [editingDraftOrderItemId, setEditingDraftOrderItemId] = useState<
    string | null
  >(null);
  const [isDraftJsonVisible, setIsDraftJsonVisible] = useState(false);
  const [officeConstructorForm, setOfficeConstructorForm] =
    useState<OfficeConstructorForm>({
      text: "ДИЕЗ",
      heightMm: "300",
      mode: "light",
      boardTapeColorName: DEFAULT_BOARD_TAPE_OPTION.colorName,
      boardWidthMm: DEFAULT_BOARD_TAPE_OPTION.widthMm,
      boardThicknessMm: DEFAULT_BOARD_TAPE_OPTION.thicknessMm,
      faceFilmColorCode: DEFAULT_FACE_FILM_OPTION.colorCode
    });
  const [dtfPrintForm, setDtfPrintForm] = useState<DtfPrintForm>({
    heightCm: String(DTF_A3_HEIGHT_CM),
    quantity: "1",
    widthCm: String(DTF_A3_WIDTH_CM)
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
  const acceptedCalculationItem = draftOrderItems[0] ?? null;

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
        serviceType: item.serviceType,
        title: item.title,
        priceMinor: item.priceMinor,
        formattedPrice: item.formattedPrice,
        text: item.text,
        heightMm: item.heightMm,
        lightingMode: item.lightingMode,
        boardTapeColorName: item.boardTapeColorName,
        boardWidthMm: item.boardWidthMm,
        boardThicknessMm: item.boardThicknessMm,
        resolvedBoardTape: item.resolvedBoardTapeMaterialName
          ? {
              materialName: item.resolvedBoardTapeMaterialName,
              thicknessMm: item.resolvedBoardTapeThicknessMm
            }
          : null,
        faceFilmColorCode: item.faceFilmColorCode,
        faceFilmLabel: item.faceFilmLabel,
        dtfPrint: item.serviceType === "dtf-print"
          ? {
              areaM2: item.areaM2,
              heightCm: item.heightCm,
              quantity: item.quantity,
              totalPriceMinor: item.totalPriceMinor,
              widthCm: item.widthCm
            }
          : null,
        calculationData: {
          source: item.calculationSource,
          calculationId: item.calculationId,
          ledCount: item.ledCount,
          baselineStatus: item.baselineStatus,
          checkMode: item.checkMode
        }
      })),
      totalAmountMinor: draftOrderTotalMinor
    };
  }, [draftOrderForm, draftOrderItems, draftOrderTotalMinor]);

  const boardTapeColorOptions = useMemo(() => getBoardTapeColorOptions(), []);
  const boardTapeWidthOptions = useMemo(
    () => getBoardTapeWidthOptions(officeConstructorForm.boardTapeColorName),
    [officeConstructorForm.boardTapeColorName]
  );
  const safeBoardWidthMm = boardTapeWidthOptions.includes(
    officeConstructorForm.boardWidthMm
  )
    ? officeConstructorForm.boardWidthMm
    : boardTapeWidthOptions[0] ?? DEFAULT_BOARD_TAPE_OPTION.widthMm;
  const boardTapeThicknessOptions = useMemo(
    () =>
      getBoardTapeThicknessOptions(
        officeConstructorForm.boardTapeColorName,
        safeBoardWidthMm
      ),
    [officeConstructorForm.boardTapeColorName, safeBoardWidthMm]
  );
  const faceFilmOptions = useMemo(() => getFaceFilmOptions(), []);
  const selectedBoardTapeOption = useMemo(() => {
    const safeThicknessMm = boardTapeThicknessOptions.includes(
      officeConstructorForm.boardThicknessMm
    )
      ? officeConstructorForm.boardThicknessMm
      : boardTapeThicknessOptions[0] ?? DEFAULT_BOARD_TAPE_OPTION.thicknessMm;

    return getBoardTapeOption({
      colorName: officeConstructorForm.boardTapeColorName,
      thicknessMm: safeThicknessMm,
      widthMm: safeBoardWidthMm
    });
  }, [
    boardTapeThicknessOptions,
    officeConstructorForm.boardTapeColorName,
    officeConstructorForm.boardThicknessMm,
    safeBoardWidthMm
  ]);
  const selectedFaceFilmOption = useMemo(() => {
    return (
      getFaceFilmOption(officeConstructorForm.faceFilmColorCode) ??
      DEFAULT_FACE_FILM_OPTION
    );
  }, [officeConstructorForm.faceFilmColorCode]);

  useEffect(() => {
    if (
      boardTapeWidthOptions.length > 0 &&
      !boardTapeWidthOptions.includes(officeConstructorForm.boardWidthMm)
    ) {
      updateOfficeConstructorForm("boardWidthMm", boardTapeWidthOptions[0]);
    }
  }, [boardTapeWidthOptions, officeConstructorForm.boardWidthMm]);

  useEffect(() => {
    if (
      boardTapeThicknessOptions.length > 0 &&
      !boardTapeThicknessOptions.includes(officeConstructorForm.boardThicknessMm)
    ) {
      updateOfficeConstructorForm(
        "boardThicknessMm",
        boardTapeThicknessOptions[0]
      );
    }
  }, [boardTapeThicknessOptions, officeConstructorForm.boardThicknessMm]);

  const officeCalculation = useMemo<{
    error: string | null;
    result: OfficeConstructorCalculationResult | null;
  }>(() => {
    if (!constructorLayout) {
      return { error: null, result: null };
    }

    try {
      const geometrySummary = analyzeKonstruktorGeometry(
        constructorLayout as Parameters<typeof analyzeKonstruktorGeometry>[0]
      );
      const isIlluminated = officeConstructorForm.mode === "light";
      const objects = geometrySummary.objects.map((object) => {
        const faceFilm = selectedFaceFilmOption;
        const isFaceFilmUsed =
          isIlluminated && shouldUseKonstruktorFaceFilm(faceFilm.colorCode);
        const faceAcrylic = isIlluminated
          ? getKonstruktorFaceAcrylicByHeight(object.heightMm)
          : getKonstruktorFacePvcByHeight(object.heightMm);
        const backPvc = getKonstruktorBackPvcByHeight(object.heightMm);
        const costs = calculateKonstruktorMaterialCosts({
          areaM2: object.materialAreaM2,
          backPvc,
          boardTape: selectedBoardTapeOption,
          faceAcrylic,
          faceFilm,
          isFaceFilmUsed,
          perimeterM: object.perimeterM
        });
        const ledModules = isIlluminated
          ? calculateKonstruktorLedModulesByGeometry({
              areaM2: object.areaM2,
              perimeterM: object.perimeterM
            })
          : {
              ledCount: 0
            };
        const lightingCost = isIlluminated
          ? calculateKonstruktorLightingCost({
              bodyMaterialsCostMinor: costs.totalMaterialsCostMinor,
              ledByInnerAreaCount: ledModules.ledCount
            })
          : {
              finalLightingCostMinor: 0,
              ledByInnerAreaCount: 0
            };
        const productionCost = calculateLightLetterProductionCostsByElements({
          baseMaterialsCostMinor:
            costs.totalMaterialsCostMinor + lightingCost.finalLightingCostMinor,
          elementHeightsMm: object.elements.map((element) => element.heightMm)
        });

        return {
          ledCount: lightingCost.ledByInnerAreaCount,
          totalProductionCostMinor: productionCost.totalProductionCostMinor
        };
      });
      const priceMinor = objects.reduce(
        (total, object) => total + object.totalProductionCostMinor,
        0
      );
      const ledCount = objects.reduce(
        (total, object) => total + object.ledCount,
        0
      );

      return {
        error: null,
        result: {
          boardTape: selectedBoardTapeOption,
          calculationId: `office-${Date.now()}`,
          faceFilm: selectedFaceFilmOption,
          formattedPrice: formatKonstruktorPriceMinor(priceMinor),
          ledCount,
          priceMinor,
          source: "office-real-calculation"
        }
      };
    } catch (unknownError) {
      return {
        error:
          unknownError instanceof Error
            ? unknownError.message
            : "Unknown office calculation error",
        result: null
      };
    }
  }, [
    constructorLayout,
    officeConstructorForm.mode,
    selectedBoardTapeOption,
    selectedFaceFilmOption
  ]);
  const currentCalculationResult = officeCalculation.result;
  const currentCalculationError = officeCalculation.error;

  const dtfPrintCalculation = useMemo<DtfPrintCalculationResult>(() => {
    const widthCm = parsePositiveNumber(dtfPrintForm.widthCm, DTF_A3_WIDTH_CM);
    const heightCm = parsePositiveNumber(dtfPrintForm.heightCm, DTF_A3_HEIGHT_CM);
    const quantity = Math.max(
      1,
      Math.ceil(parsePositiveNumber(dtfPrintForm.quantity, 1))
    );
    const areaM2 = (widthCm / 100) * (heightCm / 100);
    const baseBreakdown = calculateDtfA3PrintCostBreakdown({
      commercialMarginPercent: 10,
      printCount: 1
    });
    const unitPriceMinor = Math.round(
      baseBreakdown.totalPricePerPrintMinor * (areaM2 / DTF_A3_AREA_M2)
    );
    const priceMinor = unitPriceMinor * quantity;

    return {
      areaM2,
      calculationId: `dtf-${Date.now()}`,
      formattedPrice: formatPrintPriceMinor(priceMinor),
      formattedUnitPrice: formatPrintPriceMinor(unitPriceMinor),
      heightCm,
      priceMinor,
      quantity,
      unitPriceMinor,
      widthCm
    };
  }, [dtfPrintForm.heightCm, dtfPrintForm.quantity, dtfPrintForm.widthCm]);

  useEffect(() => {
    if (!isConstructorPanelOpen) {
      setConstructorPreviewMarkup(null);
      setConstructorPreviewError(null);
      setConstructorLayout(null);
      return;
    }

    let isCurrent = true;
    const faceFilmColorCode = selectedFaceFilmOption.colorCode;
    const faceColorHex = getFaceFilmColorHex(faceFilmColorCode);

    createKonstruktorTextLayout({
      referenceLetter: "А",
      targetHeightMm: officeConstructorForm.heightMm,
      textObjects: [
        {
          boardTapeColorName: selectedBoardTapeOption.colorName,
          boardWidthMm: selectedBoardTapeOption.widthMm,
          faceFilmColorCode,
          heightMm: officeConstructorForm.heightMm,
          id: "office-text-1",
          kind: "text",
          text: officeConstructorForm.text,
          x: 0,
          y: 0
        }
      ]
    })
      .then((layout) => {
        const model = createKonstruktorPreviewSvg({
          layout,
          objectColors: {
            "office-text-1": {
              boardColorName: selectedBoardTapeOption.colorName,
              faceColorCode: faceFilmColorCode,
              faceColorHex
            }
          },
          scenePan: { x: 0, y: 0 },
          sceneZoom: 1
        });

        return {
          layout,
          ...model,
          markup: fitKonstruktorPreviewMarkupToLayout(model.markup, layout)
        };
      })
      .then((model) => {
        if (isCurrent) {
          setConstructorPreviewMarkup(model.markup);
          setConstructorPreviewError(null);
          setConstructorLayout(model.layout);
        }
      })
      .catch((unknownError) => {
        if (isCurrent) {
          setConstructorPreviewMarkup(null);
          setConstructorLayout(null);
          setConstructorPreviewError(
            unknownError instanceof Error
              ? unknownError.message
              : "Unknown constructor preview error"
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    isConstructorPanelOpen,
    officeConstructorForm.heightMm,
    officeConstructorForm.text,
    selectedBoardTapeOption,
    selectedFaceFilmOption
  ]);

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
    setActiveWorkspace("Диез Имидж");
    setActiveSection("Заказы");
    setIsNewOrderFormOpen(true);
    setIsDraftOrderDetailsOpen(false);
    setNewOrderStep("start");
    setIsConstructorPanelOpen(false);
    setEditingDraftOrderItemId(null);
    setDraftOrderItems([]);
    setDtfPrintForm({
      heightCm: String(DTF_A3_HEIGHT_CM),
      quantity: "1",
      widthCm: String(DTF_A3_WIDTH_CM)
    });
  }

  function handleStartVolumeLettersCalculation() {
    setNewOrderStep("calculation");
    setIsConstructorPanelOpen(true);
    setEditingDraftOrderItemId(null);
    setConstructorFileActionStatus(null);
  }

  function handleStartDtfPrintCalculation() {
    setNewOrderStep("dtf-print");
    setIsConstructorPanelOpen(false);
    setEditingDraftOrderItemId(null);
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

  function updateDtfPrintForm<Field extends keyof DtfPrintForm>(
    field: Field,
    value: DtfPrintForm[Field]
  ) {
    setDtfPrintForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSetDtfA3Preset() {
    setDtfPrintForm((current) => ({
      ...current,
      heightCm: String(DTF_A3_HEIGHT_CM),
      widthCm: String(DTF_A3_WIDTH_CM)
    }));
  }

  function handleBoardTapeColorSelect(colorName: string) {
    const widthOptions = getBoardTapeWidthOptions(colorName);
    const nextWidthMm = widthOptions.includes(officeConstructorForm.boardWidthMm)
      ? officeConstructorForm.boardWidthMm
      : widthOptions[0] ?? DEFAULT_BOARD_TAPE_OPTION.widthMm;
    const thicknessOptions = getBoardTapeThicknessOptions(colorName, nextWidthMm);
    const nextThicknessMm = thicknessOptions.includes(
      officeConstructorForm.boardThicknessMm
    )
      ? officeConstructorForm.boardThicknessMm
      : thicknessOptions[0] ?? DEFAULT_BOARD_TAPE_OPTION.thicknessMm;

    setOfficeConstructorForm((current) => ({
      ...current,
      boardTapeColorName: colorName,
      boardWidthMm: nextWidthMm,
      boardThicknessMm: nextThicknessMm
    }));
    setOpenColorPalette(null);
  }

  function handleBoardTapeWidthSelect(widthMm: number) {
    const thicknessOptions = getBoardTapeThicknessOptions(
      officeConstructorForm.boardTapeColorName,
      widthMm
    );
    const nextThicknessMm = thicknessOptions.includes(
      officeConstructorForm.boardThicknessMm
    )
      ? officeConstructorForm.boardThicknessMm
      : thicknessOptions[0] ?? DEFAULT_BOARD_TAPE_OPTION.thicknessMm;

    setOfficeConstructorForm((current) => ({
      ...current,
      boardWidthMm: widthMm,
      boardThicknessMm: nextThicknessMm
    }));
  }

  function handleFaceFilmColorSelect(colorCode: string) {
    updateOfficeConstructorForm("faceFilmColorCode", colorCode);
    setOpenColorPalette(null);
  }

  function handleConstructorLayoutUploadClick() {
    constructorLayoutFileInputRef.current?.click();
  }

  function handleConstructorLayoutFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      setConstructorFileActionStatus(
        "Загрузка макета будет подключена следующим шагом"
      );
    }

    event.target.value = "";
  }

  function handleConstructorLayoutDownloadClick() {
    setConstructorFileActionStatus(
      "Скачивание макета будет подключено следующим шагом"
    );
  }

  function createConstructorDraftOrderItem(
    id: string,
    result: OfficeConstructorCalculationResult
  ): DraftOrderItem {
    const text = officeConstructorForm.text.trim() || "Без текста";
    const modeLabel =
      officeConstructorForm.mode === "light" ? "Световая" : "Несветовая";

    return {
      id,
      serviceType: "light-letter",
      type: "Конструктор объёмных букв",
      title: `${modeLabel} ${text} ${officeConstructorForm.heightMm} мм`,
      text: officeConstructorForm.text,
      heightMm: officeConstructorForm.heightMm,
      lightingMode: officeConstructorForm.mode,
      boardTapeColorName: result.boardTape.colorName,
      boardWidthMm: result.boardTape.widthMm,
      boardThicknessMm: result.boardTape.thicknessMm,
      resolvedBoardTapeMaterialName: result.boardTape.materialName,
      resolvedBoardTapeThicknessMm: result.boardTape.thicknessMm,
      faceFilmColorCode: result.faceFilm.colorCode,
      faceFilmLabel: getFaceFilmColorLabel(result.faceFilm),
      priceMinor: result.priceMinor,
      formattedPrice: result.formattedPrice,
      ledCount: result.ledCount,
      calculationId: result.calculationId,
      baselineStatus: "real calculation",
      checkMode: "real",
      calculationSource: result.source
    };
  }

  function createDtfDraftOrderItem(
    id: string,
    result: DtfPrintCalculationResult
  ): DraftOrderItem {
    const widthLabel = formatCompactNumber(result.widthCm);
    const heightLabel = formatCompactNumber(result.heightCm);

    return {
      id,
      serviceType: "dtf-print",
      type: "DTF-печать",
      title: `DTF-печать ${widthLabel}×${heightLabel} см, ${result.quantity} шт.`,
      widthCm: result.widthCm,
      heightCm: result.heightCm,
      quantity: result.quantity,
      areaM2: result.areaM2,
      priceMinor: result.priceMinor,
      totalPriceMinor: result.priceMinor,
      formattedPrice: result.formattedPrice,
      calculationId: result.calculationId,
      baselineStatus: "shared calculation",
      checkMode: "dtf-print",
      calculationSource: "@diez/calculation-core/print"
    };
  }

  function handleSaveConstructorItem() {
    if (!currentCalculationResult) {
      return;
    }

    if (editingDraftOrderItemId) {
      const updatedItem = createConstructorDraftOrderItem(
        editingDraftOrderItemId,
        currentCalculationResult
      );

      setDraftOrderItems((items) =>
        items.map((item) =>
          item.id === editingDraftOrderItemId ? updatedItem : item
        )
      );
      setEditingDraftOrderItemId(null);
      return;
    }

    setDraftOrderItems((items) => [
      ...items,
      createConstructorDraftOrderItem(
        `office-calculation-${Date.now()}-${items.length}`,
        currentCalculationResult
      )
    ]);
  }

  function handleSaveDtfPrintItem() {
    setDraftOrderItems((items) => [
      ...items,
      createDtfDraftOrderItem(
        `dtf-print-${Date.now()}-${items.length}`,
        dtfPrintCalculation
      )
    ]);
  }

  function handleAcceptCalculation() {
    if (!currentCalculationResult) {
      return;
    }

    const acceptedItem = createConstructorDraftOrderItem(
      `office-calculation-${Date.now()}`,
      currentCalculationResult
    );

    setDraftOrderItems([acceptedItem]);
    setEditingDraftOrderItemId(null);
    setNewOrderStep("details");
  }

  function handleRemoveDraftOrderItem(itemId: string) {
    setDraftOrderItems((items) => {
      const nextItems = items.filter((item) => item.id !== itemId);

      if (nextItems.length === 0) {
        setIsDraftOrderDetailsOpen(false);
      }

      return nextItems;
    });
    setEditingDraftOrderItemId((current) =>
      current === itemId ? null : current
    );
  }

  function handleEditDraftOrderItem(item: DraftOrderItem) {
    if (item.serviceType !== "light-letter") {
      return;
    }

    setOfficeConstructorForm({
      boardTapeColorName:
        item.boardTapeColorName ?? DEFAULT_BOARD_TAPE_OPTION.colorName,
      boardWidthMm: item.boardWidthMm ?? DEFAULT_BOARD_TAPE_OPTION.widthMm,
      boardThicknessMm:
        item.boardThicknessMm ?? DEFAULT_BOARD_TAPE_OPTION.thicknessMm,
      faceFilmColorCode:
        item.faceFilmColorCode ?? DEFAULT_FACE_FILM_OPTION.colorCode,
      heightMm: item.heightMm ?? "300",
      mode: item.lightingMode ?? "light",
      text: item.text ?? "ДИЕЗ"
    });
    setEditingDraftOrderItemId(item.id);
    setIsNewOrderFormOpen(true);
    setIsDraftOrderDetailsOpen(false);
    setNewOrderStep("calculation");
    setIsConstructorPanelOpen(true);
  }

  function handleDuplicateDraftOrderItem(item: DraftOrderItem) {
    setDraftOrderItems((items) => [
      ...items,
      {
        ...item,
        id: `${item.calculationId}-${Date.now()}-${items.length}`
      }
    ]);
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
          {activeWorkspace === "Диез Имидж" ? (
            <button
              className="workbar-new-order-button"
              onClick={handleOpenNewOrder}
              type="button"
            >
              + Новый заказ
            </button>
          ) : null}
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

          <section className="activity-feed-panel">
            <div>
              <h2>Лента</h2>
              <p>Здесь будут новые заказы, сообщения, задачи и события.</p>
            </div>

            {draftOrderItems.length > 0 ? (
              <button
                className="draft-feed-card"
                onClick={() => {
                  setActiveWorkspace("Диез Имидж");
                  setActiveSection("Заказы");
                  setIsNewOrderFormOpen(false);
                  setIsDraftOrderDetailsOpen(true);
                }}
                type="button"
              >
                <strong>Черновик заказа</strong>
                <span>Позиций: {draftOrderItems.length}</span>
                <span>Итого: {formatMinorPrice(draftOrderTotalMinor, "RUB")}</span>
                <em>Статус: формируется</em>
              </button>
            ) : (
              <div className="activity-feed-empty">Событий пока нет</div>
            )}
          </section>
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
            <section
              className={
                isNewOrderFormOpen
                  ? "orders-panel orders-panel-new-order"
                  : "orders-panel"
              }
            >
              {!isNewOrderFormOpen && !isDraftOrderDetailsOpen ? (
                <>
                  <div className="content-header">
                    <div>
                      <p className="eyebrow">Диез Имидж / первый этап</p>
                      <h2>Заказы Диез Имидж</h2>
                      <p>
                        Главный рабочий раздел для заказов с сайта, ручных
                        заказов, клиентов, расчётов и производства.
                      </p>
                    </div>
                  </div>

                  <div className="order-status-grid">
                    {diezOrderStatuses.map((status) => (
                      <article className="order-status-card" key={status}>
                        <span>{status}</span>
                        <strong>0</strong>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {isDraftOrderDetailsOpen ? (
                <section className="order-form-panel draft-order-detail-panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Черновик</p>
                      <h3>Детализация черновика заказа</h3>
                    </div>
                    <button
                      className="secondary-action-button"
                      onClick={() => setIsDraftOrderDetailsOpen(false)}
                      type="button"
                    >
                      Закрыть
                    </button>
                  </div>

                  <section className="draft-items-panel draft-items-panel-detail">
                    <div className="section-heading">
                      <h3>Позиции</h3>
                    </div>

                    <ol className="draft-items-list">
                      {draftOrderItems.map((item, index) => (
                        <li className="draft-item-row" key={item.id}>
                          <span>
                            {index + 1}. {item.title}
                          </span>
                          <strong>{item.formattedPrice}</strong>
                          {item.serviceType === "light-letter" ? (
                            <button
                              className="text-action-button"
                              onClick={() => handleEditDraftOrderItem(item)}
                              type="button"
                            >
                              Редактировать
                            </button>
                          ) : null}
                          <button
                            className="text-action-button text-action-danger"
                            onClick={() => handleRemoveDraftOrderItem(item.id)}
                            type="button"
                          >
                            Удалить
                          </button>
                        </li>
                      ))}
                    </ol>

                    <div className="draft-order-footer">
                      <div className="draft-total-row">
                        <span>Итого:</span>
                        <strong>
                          {formatMinorPrice(draftOrderTotalMinor, "RUB")}
                        </strong>
                      </div>

                      <button className="primary-action-button" disabled type="button">
                        Оформление заказа позже
                      </button>
                    </div>

                    <p className="draft-items-note">
                      Оформление, клиент и доставка будут подключены следующим
                      шагом.
                    </p>
                  </section>
                </section>
              ) : null}

              {isNewOrderFormOpen ? (
                <section className="order-form-panel">
                  <div className="section-heading">
                    {newOrderStep === "start" ? (
                      <div>
                        <h3>Новый заказ</h3>
                        <p>
                          Выберите услугу, которую нужно рассчитать или принять
                          в заказ.
                        </p>
                      </div>
                    ) : (
                      <div className="service-heading">
                        <button
                          aria-label="Назад"
                          className="icon-back-button"
                          onClick={() => {
                            setNewOrderStep("start");
                            setIsConstructorPanelOpen(false);
                            setEditingDraftOrderItemId(null);
                          }}
                          type="button"
                        >
                          <img
                            alt=""
                            className="icon-back-image"
                            src={chevronLeftIconUrl}
                          />
                        </button>
                        <span>|</span>
                        <h3>
                          {newOrderStep === "dtf-print"
                            ? "DTF-ПЕЧАТЬ"
                            : "ОБЪЁМНЫЕ БУКВЫ"}
                        </h3>
                      </div>
                    )}
                    {newOrderStep === "start" ? (
                      <button
                        className="secondary-action-button"
                        onClick={() => setIsNewOrderFormOpen(false)}
                        type="button"
                      >
                        Закрыть
                      </button>
                    ) : null}
                  </div>

                  {newOrderStep === "start" ? (
                    <section className="order-start-panel">
                      <div>
                        <h3>Новый заказ</h3>
                        <p>
                          Выберите услугу, которую нужно рассчитать или принять
                          в заказ.
                        </p>
                      </div>

                      <div className="order-type-grid">
                        <article className="order-type-card order-type-card-active">
                          <div>
                            <h4>ОБЪЁМНЫЕ БУКВЫ</h4>
                            <p>
                              Расчёт световых и несветовых объёмных букв.
                            </p>
                          </div>
                          <button
                            className="primary-action-button"
                            onClick={handleStartVolumeLettersCalculation}
                            type="button"
                          >
                            Выбрать
                          </button>
                        </article>

                        <article className="order-type-card order-type-card-active">
                          <div>
                            <h4>DTF-ПЕЧАТЬ</h4>
                            <p>
                              Расчёт DTF-печати по размеру и количеству.
                            </p>
                          </div>
                          <button
                            className="primary-action-button"
                            onClick={handleStartDtfPrintCalculation}
                            type="button"
                          >
                            Выбрать
                          </button>
                        </article>

                        <article className="order-type-card order-type-card-disabled">
                          <h4>ШИРОКОФОРМАТНАЯ ПЕЧАТЬ</h4>
                          <p>Будет добавлено позже</p>
                        </article>

                        <article className="order-type-card order-type-card-disabled">
                          <h4>ДРУГАЯ УСЛУГА</h4>
                          <p>Будет добавлено позже</p>
                        </article>
                      </div>
                    </section>
                  ) : newOrderStep === "calculation" ? (
                    <section className="service-workspace">
                      {isConstructorPanelOpen ? (
                        <>
                          <div className="constructor-file-actions">
                            <input
                              ref={constructorLayoutFileInputRef}
                              accept=".svg,image/svg+xml"
                              className="constructor-file-input"
                              onChange={handleConstructorLayoutFileChange}
                              type="file"
                            />
                            <button
                              className="constructor-file-action-button"
                              onClick={handleConstructorLayoutUploadClick}
                              type="button"
                            >
                              <img
                                alt=""
                                className="constructor-file-action-icon"
                                src={fileUploadIconUrl}
                              />
                              Загрузить макет
                            </button>
                            <button
                              className="constructor-file-action-button"
                              onClick={handleConstructorLayoutDownloadClick}
                              type="button"
                            >
                              <img
                                alt=""
                                className="constructor-file-action-icon"
                                src={fileDownloadIconUrl}
                              />
                              Скачать макет
                            </button>
                            {constructorFileActionStatus ? (
                              <span className="constructor-file-action-status">
                                {constructorFileActionStatus}
                              </span>
                            ) : null}
                          </div>

                          <div className="office-constructor-fields">
                            <div className="office-constructor-row office-constructor-main-row">
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
                            </div>

                            <div className="office-constructor-row office-constructor-material-row">
                              <div className="form-field color-picker-field color-picker-field-board">
                              <span>Цвет борта</span>
                              <button
                                aria-expanded={openColorPalette === "board"}
                                className="color-picker-trigger"
                                onClick={() =>
                                  setOpenColorPalette((current) =>
                                    current === "board" ? null : "board"
                                  )
                                }
                                title={getBoardTapeColorTooltipLabel(
                                  officeConstructorForm.boardTapeColorName
                                )}
                                type="button"
                              >
                                <span
                                  className="color-swatch"
                                  style={{
                                    backgroundColor: getBoardTapeColorHex(
                                      officeConstructorForm.boardTapeColorName
                                    )
                                  }}
                                />
                                <span>
                                  {getBoardTapeColorLabel(
                                    officeConstructorForm.boardTapeColorName
                                  )}
                                </span>
                              </button>

                              {openColorPalette === "board" ? (
                                <div
                                  aria-label="Цвет борта"
                                  className="color-palette-popover"
                                  role="listbox"
                                >
                                  {boardTapeColorOptions.map((colorName) => (
                                    <button
                                      aria-selected={
                                        colorName ===
                                        officeConstructorForm.boardTapeColorName
                                      }
                                    className={
                                      colorName ===
                                      officeConstructorForm.boardTapeColorName
                                        ? "palette-color-card palette-color-card-active"
                                        : "palette-color-card"
                                    }
                                      key={colorName}
                                      onClick={() =>
                                        handleBoardTapeColorSelect(colorName)
                                      }
                                      type="button"
                                    >
                                      <span
                                        className="palette-color-sample"
                                        style={{
                                          backgroundColor:
                                            getBoardTapeColorHex(colorName)
                                        }}
                                      />
                                      <span className="palette-color-label">
                                        {getBoardTapeColorLabel(colorName)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                              <label className="form-field">
                              <span>Ширина борта</span>
                              <select
                                value={officeConstructorForm.boardWidthMm}
                                onChange={(event) =>
                                  handleBoardTapeWidthSelect(
                                    Number(event.target.value)
                                  )
                                }
                              >
                                {boardTapeWidthOptions.map((widthMm) => (
                                  <option key={widthMm} value={widthMm}>
                                    {widthMm} мм
                                  </option>
                                ))}
                              </select>
                            </label>

                              <label className="form-field">
                              <span>Толщина борта</span>
                              <select
                                value={officeConstructorForm.boardThicknessMm}
                                onChange={(event) =>
                                  updateOfficeConstructorForm(
                                    "boardThicknessMm",
                                    Number(event.target.value)
                                  )
                                }
                              >
                                {boardTapeThicknessOptions.map((thicknessMm) => (
                                  <option key={thicknessMm} value={thicknessMm}>
                                    {thicknessMm} мм
                                  </option>
                                ))}
                              </select>
                            </label>

                              <div className="form-field color-picker-field color-picker-field-face">
                              <span>Цвет лица</span>
                              <button
                                aria-expanded={openColorPalette === "face"}
                                className="color-picker-trigger"
                                onClick={() =>
                                  setOpenColorPalette((current) =>
                                    current === "face" ? null : "face"
                                  )
                                }
                                title={selectedFaceFilmOption.materialName}
                                type="button"
                              >
                                <span
                                  className={
                                    selectedFaceFilmOption.colorCode ===
                                    NO_FACE_FILM_COLOR_CODE
                                      ? "color-swatch color-swatch-no-film"
                                      : "color-swatch"
                                  }
                                  style={{
                                    backgroundColor: getFaceFilmColorHex(
                                      selectedFaceFilmOption.colorCode
                                    )
                                  }}
                                />
                                <span>
                                  {getFaceFilmColorLabel(selectedFaceFilmOption)}
                                </span>
                              </button>

                              {openColorPalette === "face" ? (
                                <div
                                  aria-label="Цвет лица"
                                  className="color-palette-popover"
                                  role="listbox"
                                >
                                  {faceFilmOptions.map((option) => (
                                    <button
                                      aria-selected={
                                        option.colorCode ===
                                        officeConstructorForm.faceFilmColorCode
                                      }
                                    className={
                                      option.colorCode ===
                                      officeConstructorForm.faceFilmColorCode
                                        ? "palette-color-card palette-color-card-active"
                                        : "palette-color-card"
                                    }
                                      key={option.colorCode}
                                      onClick={() =>
                                        handleFaceFilmColorSelect(
                                          option.colorCode
                                        )
                                      }
                                      type="button"
                                    >
                                      <span
                                        className={
                                          option.colorCode ===
                                          NO_FACE_FILM_COLOR_CODE
                                            ? "palette-color-sample palette-color-sample-no-film"
                                            : "palette-color-sample"
                                        }
                                        style={{
                                          backgroundColor: getFaceFilmColorHex(
                                            option.colorCode
                                          )
                                        }}
                                      />
                                      <span className="palette-color-label">
                                        {option.colorCode ===
                                        NO_FACE_FILM_COLOR_CODE
                                          ? "БЕЗ ПЛЁНКИ"
                                          : getFaceFilmColorLabel(option)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            {currentCalculationError ? (
                              <div className="constructor-result-card constructor-result-card-compact error-card">
                                {currentCalculationError}
                              </div>
                            ) : currentCalculationResult ? (
                              <div className="constructor-result-card constructor-result-card-compact">
                                <div className="constructor-result-header">
                                  <div>
                                    <span>Цена</span>
                                    <strong>
                                      {currentCalculationResult.formattedPrice}
                                    </strong>
                                  </div>
                                </div>

                                <button
                                  className="primary-action-button constructor-add-button"
                                  onClick={handleSaveConstructorItem}
                                  type="button"
                                >
                                  {editingDraftOrderItemId
                                    ? "Обновить позицию"
                                    : "Добавить позицию"}
                                </button>
                              </div>
                            ) : (
                              <div className="constructor-result-card constructor-result-card-compact">
                                <p className="constructor-result-muted">
                                  Расчёт недоступен
                                </p>
                              </div>
                            )}
                            </div>
                          </div>

                          <section className="constructor-svg-preview-panel">
                            <div className="section-heading">
                              <h3>2D-preview</h3>
                              <span>
                                {officeConstructorForm.heightMm.trim() || "0"} мм
                              </span>
                            </div>

                            <div className="constructor-svg-preview-canvas">
                              {constructorPreviewMarkup ? (
                                <div
                                  className="constructor-svg-preview-markup"
                                  dangerouslySetInnerHTML={{
                                    __html: constructorPreviewMarkup
                                  }}
                                />
                              ) : constructorPreviewError ? (
                                <p className="constructor-warning">
                                  {constructorPreviewError}
                                </p>
                              ) : (
                                <p className="muted-text">Готовим SVG preview...</p>
                              )}
                            </div>

                            <span className="constructor-preview-mode">
                              {officeConstructorForm.mode === "light"
                                ? "Световая"
                                : "Несветовая"}
                            </span>
                          </section>

                        </>
                      ) : null}

                    </section>
                  ) : newOrderStep === "dtf-print" ? (
                    <section className="service-workspace dtf-service-workspace">
                      <div className="dtf-calculation-panel">
                        <section className="dtf-fields-card">
                          <div className="section-heading">
                            <h3>Параметры DTF</h3>
                          </div>

                          <div className="dtf-form-grid">
                            <label className="form-field">
                              <span>Ширина, см</span>
                              <input
                                inputMode="decimal"
                                min="1"
                                type="number"
                                value={dtfPrintForm.widthCm}
                                onChange={(event) =>
                                  updateDtfPrintForm(
                                    "widthCm",
                                    event.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="form-field">
                              <span>Высота, см</span>
                              <input
                                inputMode="decimal"
                                min="1"
                                type="number"
                                value={dtfPrintForm.heightCm}
                                onChange={(event) =>
                                  updateDtfPrintForm(
                                    "heightCm",
                                    event.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="form-field">
                              <span>Количество</span>
                              <input
                                inputMode="numeric"
                                min="1"
                                type="number"
                                value={dtfPrintForm.quantity}
                                onChange={(event) =>
                                  updateDtfPrintForm(
                                    "quantity",
                                    event.target.value
                                  )
                                }
                              />
                            </label>

                            <button
                              className="secondary-action-button dtf-preset-button"
                              onClick={handleSetDtfA3Preset}
                              type="button"
                            >
                              A3 300×400 мм
                            </button>
                          </div>
                        </section>

                        <section className="dtf-result-card">
                          <div>
                            <span>Итого</span>
                            <strong>{dtfPrintCalculation.formattedPrice}</strong>
                          </div>

                          <dl className="dtf-result-list">
                            <div>
                              <dt>Площадь одного отпечатка</dt>
                              <dd>
                                {formatAreaM2(dtfPrintCalculation.areaM2)} м²
                              </dd>
                            </div>
                            <div>
                              <dt>Количество</dt>
                              <dd>{dtfPrintCalculation.quantity}</dd>
                            </div>
                            <div>
                              <dt>Цена за единицу</dt>
                              <dd>{dtfPrintCalculation.formattedUnitPrice}</dd>
                            </div>
                          </dl>

                          <button
                            className="primary-action-button constructor-add-button"
                            onClick={handleSaveDtfPrintItem}
                            type="button"
                          >
                            Добавить позицию
                          </button>
                        </section>
                      </div>
                    </section>
                  ) : null}

                </section>
              ) : null}

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
