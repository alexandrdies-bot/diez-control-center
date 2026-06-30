import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import chevronLeftIconUrl from "./assets/svg/chevron-left.svg";
import cloudNetworkIconUrl from "./assets/svg/cloud-network.svg";
import downloadIconUrl from "./assets/svg/download.svg";
import fileDownloadIconUrl from "./assets/svg/file-download.svg";
import fileUploadIconUrl from "./assets/svg/file-upload.svg";
import folderSymlinkIconUrl from "./assets/svg/folder-symlink.svg";
import messageIconUrl from "./assets/svg/message-2.svg";
import paperclipIconUrl from "./assets/svg/paperclip.svg";
import pencilIconUrl from "./assets/svg/pencil.svg";
import trashIconUrl from "./assets/svg/trash.svg";
import truckIconUrl from "./assets/svg/truck.svg";
import truckOffIconUrl from "./assets/svg/truck-off.svg";
import userIconUrl from "./assets/svg/user.svg";
import {
  cancelOrderPayment,
  calculateCdekDelivery,
  createOzonOrderPayment,
  createOrderFromDraft,
  deleteOrder,
  downloadOrderAttachment,
  fetchOrderAttachmentBlob,
  getCdekDeliveryPoints,
  getCdekStatus,
  getCdekTariffs,
  getApiHealth,
  getCurrentUser,
  getMaterialPricingInputs,
  getMaterials,
  getOrder,
  getOrderAttachments,
  getOrderPayments,
  getOrders,
  login as loginToApi,
  openDownloadedFileLocation,
  saveCdekDelivery,
  searchCdekCities,
  syncOrderPayment,
  updateMaterialPurchasePrice,
  uploadOrderAttachment,
  updateOrderFromDraft,
  ApiResponseError,
  type ApiHealth,
  type AuthUser,
  type CdekCity,
  type CdekDeliveryCalculationResult,
  type CdekDeliveryPoint,
  type CdekSaveDeliveryResult,
  type CdekSaveDeliveryRequest,
  type CdekStatus,
  type CdekTariff,
  type Material,
  type MaterialPricingInput,
  type OrderAttachment,
  type OrderDetail,
  type OrderEvent,
  type OrderPayment,
  type OrderWorkflowStatus,
  type OrderSummary
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

// TODO: заменить mock-роль на реального пользователя после добавления авторизации.
const currentUserRole = "admin";

const settingsHomeSection = "Настройки";
const materialsSettingsSection = "Материалы и цены";

type SettingsCard = {
  description: string;
  isActive: boolean;
  section?: string;
  title: string;
};

type InnerPageHeaderProps = {
  ariaLabel?: string;
  onBack: () => void;
  title: string;
};

function InnerPageHeader({
  ariaLabel = "Назад",
  onBack,
  title
}: InnerPageHeaderProps) {
  return (
    <div className="inner-page-header">
      <button
        aria-label={ariaLabel}
        className="icon-back-button"
        onClick={onBack}
        type="button"
      >
        <img alt="" className="icon-back-image" src={chevronLeftIconUrl} />
      </button>
      <span aria-hidden="true" className="inner-page-separator">
        |
      </span>
      <h2 className="inner-page-title">{title}</h2>
    </div>
  );
}

const settingsCards: SettingsCard[] = [
  {
    title: "Материалы и цены",
    description: "Справочник материалов, закупочные цены и параметры расчётов.",
    isActive: true,
    section: materialsSettingsSection
  },
  {
    title: "Расчёты",
    description: "Настройки формул, коэффициентов и правил расчёта.",
    isActive: false
  },
  {
    title: "Заказы",
    description: "Настройки статусов, источников заказов и сценариев оформления.",
    isActive: false
  },
  {
    title: "Интеграции",
    description: "Сайт, MAX, платежи и внешние сервисы.",
    isActive: false
  },
  {
    title: "Пользователи и доступ",
    description: "Роли, права и доступ к себестоимости.",
    isActive: false
  }
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
  "Подготовить Ozon-модуль"
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
  serviceType: "light-letter" | "dtf-print" | "manual";
  type: "Конструктор объёмных букв" | "DTF-печать" | "Позиция заказа";
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
  widthMm?: number;
  svgMarkup?: string;
  svgShapeIndexes?: number[];
  widthCm?: number;
  heightCm?: number;
  quantity?: number;
  areaM2?: number;
  totalPriceMinor?: number;
  unitPriceMinor?: number;
  currencyCode?: string;
  calculationSnapshot?: unknown;
  params?: unknown;
  priceMinor: number;
  formattedPrice: string;
  ledCount?: number;
  managerComment?: string;
  calculationId: string;
  baselineStatus: string;
  checkMode: string;
  calculationSource: string;
};

type DraftOrderStatus = "receiving" | "awaiting-details";

type DraftOrderCustomer = {
  comment?: string;
  email?: string;
  name?: string;
  phone?: string;
};

type DeliveryMode = "manual" | "not-required" | "cdek";

type DraftOrderDelivery = {
  mode: DeliveryMode;
  address?: string;
  comment?: string;
  contactName?: string;
  currencyCode?: string;
  periodMax?: number;
  periodMin?: number;
  phone?: string;
  priceMinor?: number;
  providerPayload?: unknown;
  tariffCode?: number;
  tariffName?: string;
};

type DraftOrder = {
  id: string;
  status: DraftOrderStatus;
  customer?: DraftOrderCustomer;
  databaseStatus?: OrderWorkflowStatus;
  delivery: DraftOrderDelivery;
  events?: OrderEvent[];
  items: DraftOrderItem[];
  requestComment?: string;
  serverOrderId?: number;
  serverOrderNumber?: string;
  serverOrderSavedAt?: string;
  totalPriceMinor: number;
  createdAt: string;
  updatedAt: string;
};

type AddedDraftItemFeedback = {
  draftOrderId: string;
  itemPriceLabel: string;
  itemServiceType: DraftOrderItem["serviceType"];
  itemTitle: string;
};

type DraftOrdersStorage = {
  activeDraftOrderId: string | null;
  draftOrders: DraftOrder[];
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

const DEFAULT_OFFICE_CONSTRUCTOR_BOARD_WIDTH_MM = 60;

function createDefaultOfficeConstructorForm(): OfficeConstructorForm {
  return {
    boardTapeColorName: DEFAULT_BOARD_TAPE_OPTION.colorName,
    boardThicknessMm: DEFAULT_BOARD_TAPE_OPTION.thicknessMm,
    boardWidthMm: DEFAULT_OFFICE_CONSTRUCTOR_BOARD_WIDTH_MM,
    faceFilmColorCode: DEFAULT_FACE_FILM_OPTION.colorCode,
    heightMm: "300",
    mode: "light",
    text: ""
  };
}

type DtfPrintForm = {
  widthCm: string;
  heightCm: string;
  quantity: string;
};

type DraftOrderPanelMode = "details" | "customer" | "delivery";

type DraftOrderCustomerForm = {
  comment: string;
  email: string;
  name: string;
  phone: string;
};

type DraftOrderDeliveryForm = {
  address: string;
  comment: string;
  contactName: string;
  mode: DeliveryMode;
  phone: string;
};

type CdekActivePicker =
  | "recipientCity"
  | "recipientPoint"
  | "senderCity"
  | "senderPoint"
  | "tariff"
  | null;

type CdekTariffFromMode = "door" | "warehouse";
type CdekTariffToMode = "door" | "postamat" | "warehouse";

type CdekPackageState = {
  cargoDescription: string;
  heightCm: string;
  id: string;
  isDangerousCargo: boolean;
  lengthCm: string;
  weightKg: string;
  widthCm: string;
};

type CdekPanelState = {
  activePicker: CdekActivePicker;
  calculationResult: CdekDeliveryCalculationResult | null;
  cargoDescription: string;
  cityQuery: string;
  cityResults: CdekCity[];
  deliveryPointFilter: string;
  deliveryPointResults: CdekDeliveryPoint[];
  heightCm: string;
  hasSearchedCities: boolean;
  hasSearchedSenderCities: boolean;
  isCalculating: boolean;
  isEditingSavedDelivery: boolean;
  isLoadingCities: boolean;
  isLoadingDeliveryPoints: boolean;
  isLoadingSenderCities: boolean;
  isLoadingSenderDeliveryPoints: boolean;
  isLoadingStatus: boolean;
  isLoadingTariffs: boolean;
  isSaving: boolean;
  isDangerousCargo: boolean;
  lengthCm: string;
  message: string | null;
  packages: CdekPackageState[];
  saveResult: CdekSaveDeliveryResult | null;
  selectedCity: CdekCity | null;
  selectedDeliveryPoint: CdekDeliveryPoint | null;
  selectedSenderCity: CdekCity | null;
  selectedSenderDeliveryPoint: CdekDeliveryPoint | null;
  selectedTariff: CdekTariff | null;
  senderCityQuery: string;
  senderCityResults: CdekCity[];
  senderDeliveryPointFilter: string;
  senderDeliveryPointResults: CdekDeliveryPoint[];
  senderDeliveryPointResultsCityCode: number | null;
  shipmentPointCode: string;
  status: CdekStatus | null;
  tariffCode: string;
  tariffFromMode: CdekTariffFromMode;
  tariffRequestFingerprint: string | null;
  tariffResultsFingerprint: string | null;
  tariffResults: CdekTariff[];
  tariffToMode: CdekTariffToMode;
  weightKg: string;
  widthCm: string;
};

type NewOrderStep = "start" | "calculation" | "dtf-print" | "details";

const DEFAULT_CDEK_SENDER_CITY: CdekCity = {
  city: "Ливны",
  cityUuid: null,
  code: 44,
  countryCode: "RU",
  fiasGuid: null,
  fullName: "Ливны, Орловская область",
  latitude: null,
  longitude: null,
  region: "Орловская область",
  regionCode: null
};

const DEFAULT_CDEK_SENDER_POINT: CdekDeliveryPoint = {
  address: "ул. Максима Горького, 44, 1",
  addressFull: "ул. Максима Горького, 44, 1",
  allowedCod: null,
  city: "Ливны",
  cityCode: 44,
  code: "LIV1",
  countryCode: "RU",
  dimensions: null,
  haveCash: null,
  haveCashless: null,
  heightMax: null,
  isDressingRoom: null,
  latitude: null,
  lengthMax: null,
  longitude: null,
  name: "Ливны · ул. Максима Горького, 44, 1",
  nearestStation: null,
  phones: [],
  type: "PVZ",
  uuid: null,
  weightMax: null,
  weightMin: null,
  widthMax: null,
  workTime: null
};

const DEFAULT_CDEK_CARGO_DESCRIPTION = "Рекламная продукция";

function getCdekCityCode(city: CdekCity | null) {
  return city?.code ?? getOptionalNumber(getRecordValue(city, "cityCode")) ?? null;
}

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

function getDefaultCdekCargoDescription(draftOrder?: Pick<DraftOrder, "items">) {
  const title = draftOrder?.items
    .map((item) => item.title.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");

  return title || DEFAULT_CDEK_CARGO_DESCRIPTION;
}

function createCdekPackageState(
  cargoDescription = DEFAULT_CDEK_CARGO_DESCRIPTION,
  index = 0
): CdekPackageState {
  return {
    cargoDescription,
    heightCm: "10",
    id: `cdek-package-${Date.now()}-${index}`,
    isDangerousCargo: false,
    lengthCm: "30",
    weightKg: "1",
    widthCm: "20"
  };
}

function createDefaultCdekPanelState(
  cargoDescription = DEFAULT_CDEK_CARGO_DESCRIPTION
): CdekPanelState {
  const defaultPackage = createCdekPackageState(cargoDescription);

  return {
    activePicker: null,
    calculationResult: null,
    cargoDescription,
    cityQuery: "",
    cityResults: [],
    deliveryPointFilter: "",
    deliveryPointResults: [],
    heightCm: "10",
    hasSearchedCities: false,
    hasSearchedSenderCities: false,
    isCalculating: false,
    isEditingSavedDelivery: true,
    isLoadingCities: false,
    isLoadingDeliveryPoints: false,
    isLoadingSenderCities: false,
    isLoadingSenderDeliveryPoints: false,
    isLoadingStatus: false,
    isLoadingTariffs: false,
    isSaving: false,
    isDangerousCargo: false,
    lengthCm: "30",
    message: null,
    packages: [defaultPackage],
    saveResult: null,
    selectedCity: null,
    selectedDeliveryPoint: null,
    selectedSenderCity: DEFAULT_CDEK_SENDER_CITY,
    selectedSenderDeliveryPoint: DEFAULT_CDEK_SENDER_POINT,
    selectedTariff: null,
    senderCityQuery: "Ливны",
    senderCityResults: [],
    senderDeliveryPointFilter: "",
    senderDeliveryPointResults: [DEFAULT_CDEK_SENDER_POINT],
    senderDeliveryPointResultsCityCode: DEFAULT_CDEK_SENDER_CITY.code,
    shipmentPointCode: DEFAULT_CDEK_SENDER_POINT.code ?? "",
    status: null,
    tariffCode: "",
    tariffFromMode: "warehouse",
    tariffRequestFingerprint: null,
    tariffResultsFingerprint: null,
    tariffResults: [],
    tariffToMode: "warehouse",
    weightKg: defaultPackage.weightKg,
    widthCm: defaultPackage.widthCm
  };
}

function getFirstRecordItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function getProviderArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function createCdekCityFromProviderPayload(
  cityPayload: unknown,
  fallbackAddress?: string
): CdekCity | null {
  const code =
    getOptionalNumber(getRecordValue(cityPayload, "code")) ??
    getOptionalNumber(getRecordValue(cityPayload, "cityCode"));
  const city = getOptionalString(getRecordValue(cityPayload, "city"));
  const fullName =
    getOptionalString(getRecordValue(cityPayload, "fullName")) ??
    [city, getOptionalString(getRecordValue(cityPayload, "region"))]
      .filter(Boolean)
      .join(", ");

  if (!code && !city && !fullName && !fallbackAddress) {
    return null;
  }

  return {
    city: city ?? fullName ?? fallbackAddress ?? null,
    cityUuid:
      getOptionalString(getRecordValue(cityPayload, "uuid")) ??
      getOptionalString(getRecordValue(cityPayload, "cityUuid")) ??
      null,
    code: code ?? null,
    countryCode:
      getOptionalString(getRecordValue(cityPayload, "countryCode")) ?? "RU",
    fiasGuid:
      getOptionalString(getRecordValue(cityPayload, "fiasGuid")) ?? null,
    fullName: fullName || city || fallbackAddress || null,
    latitude: getOptionalNumber(getRecordValue(cityPayload, "latitude")) ?? null,
    longitude: getOptionalNumber(getRecordValue(cityPayload, "longitude")) ?? null,
    region: getOptionalString(getRecordValue(cityPayload, "region")) ?? null,
    regionCode:
      getOptionalNumber(getRecordValue(cityPayload, "regionCode")) ?? null
  };
}

function createCdekDeliveryPointFromProviderPayload(
  pointPayload: unknown,
  city: CdekCity | null
): CdekDeliveryPoint | null {
  const code = getOptionalString(getRecordValue(pointPayload, "code"));
  const address =
    getOptionalString(getRecordValue(pointPayload, "address")) ??
    getOptionalString(getRecordValue(pointPayload, "addressFull"));
  const name = getOptionalString(getRecordValue(pointPayload, "name"));
  const type = getOptionalString(getRecordValue(pointPayload, "type"));

  if (!code && !address && !name) {
    return null;
  }

  return {
    address: address ?? name ?? code ?? null,
    addressFull:
      getOptionalString(getRecordValue(pointPayload, "addressFull")) ??
      address ??
      name ??
      null,
    allowedCod: null,
    city: city?.city ?? null,
    cityCode: city?.code ?? null,
    code: code ?? null,
    countryCode: city?.countryCode ?? null,
    dimensions: null,
    haveCash: null,
    haveCashless: null,
    heightMax: null,
    isDressingRoom: null,
    latitude: getOptionalNumber(getRecordValue(pointPayload, "latitude")) ?? null,
    lengthMax: null,
    longitude: getOptionalNumber(getRecordValue(pointPayload, "longitude")) ?? null,
    name: name ?? address ?? code ?? null,
    nearestStation: null,
    phones: [],
    type: type ?? null,
    uuid:
      getOptionalString(getRecordValue(pointPayload, "uuid")) ??
      getOptionalString(getRecordValue(pointPayload, "deliveryPointUuid")) ??
      null,
    weightMax: null,
    weightMin: null,
    widthMax: null,
    workTime: null
  };
}

function createCdekSenderPointFromCode(
  shipmentPointCode: string | undefined
): CdekDeliveryPoint | null {
  if (!shipmentPointCode) {
    return null;
  }

  if (shipmentPointCode === DEFAULT_CDEK_SENDER_POINT.code) {
    return DEFAULT_CDEK_SENDER_POINT;
  }

  return {
    address: `пункт ${shipmentPointCode}`,
    addressFull: `пункт ${shipmentPointCode}`,
    allowedCod: null,
    code: shipmentPointCode,
    dimensions: null,
    haveCash: null,
    haveCashless: null,
    heightMax: null,
    isDressingRoom: null,
    latitude: null,
    lengthMax: null,
    longitude: null,
    name: `пункт ${shipmentPointCode}`,
    nearestStation: null,
    phones: [],
    type: "PVZ",
    weightMax: null,
    weightMin: null,
    widthMax: null,
    workTime: null
  };
}

function createCdekCityFallbackFromLabel(
  label: string | undefined,
  countryCode = "RU"
): CdekCity | null {
  const city = label?.trim();

  if (!city) {
    return null;
  }

  return {
    city,
    cityUuid: null,
    code: null,
    countryCode,
    fiasGuid: null,
    fullName: city,
    latitude: null,
    longitude: null,
    region: null,
    regionCode: null
  };
}

function createCdekPanelStateFromSavedDelivery(
  draftOrder: DraftOrder,
  currentStatus: CdekStatus | null
): CdekPanelState {
  const defaultState = createDefaultCdekPanelState(
    getDefaultCdekCargoDescription(draftOrder)
  );
  const providerPayload = draftOrder.delivery.providerPayload;

  if (draftOrder.delivery.mode !== "cdek" || !providerPayload) {
    return {
      ...defaultState,
      status: currentStatus
    };
  }

  const cityPayload = getRecordValue(providerPayload, "city");
  const deliveryPointPayload = getRecordValue(providerPayload, "deliveryPoint");
  const pricingPayload = getRecordValue(providerPayload, "pricing");
  const packagePayload = getRecordValue(providerPayload, "package");
  const packageItems = getProviderArray(getRecordValue(packagePayload, "items"));
  const firstPackage =
    getFirstRecordItem(packageItems) ??
    getFirstRecordItem(getRecordValue(providerPayload, "packages"));
  const senderCityPayload =
    getRecordValue(providerPayload, "senderCity") ??
    getRecordValue(providerPayload, "fromCity") ??
    getRecordValue(providerPayload, "fromLocation");
  const shipmentPointPayload =
    getRecordValue(providerPayload, "shipmentPoint") ??
    getRecordValue(providerPayload, "senderDeliveryPoint");
  const tariffPayload = getRecordValue(providerPayload, "tariff");
  const timingPayload = getRecordValue(providerPayload, "timing");
  const calculationPayload = getRecordValue(providerPayload, "calculation");
  const cargoPayload = getRecordValue(providerPayload, "cargo");
  const selectedCity = createCdekCityFromProviderPayload(
    cityPayload,
    draftOrder.delivery.address
  ) ?? createCdekCityFallbackFromLabel(draftOrder.delivery.address);
  const selectedDeliveryPoint = createCdekDeliveryPointFromProviderPayload(
    deliveryPointPayload,
    selectedCity
  );
  const savedCargoDescription =
    getOptionalString(getRecordValue(providerPayload, "cargoDescription")) ??
    getOptionalString(getRecordValue(cargoPayload, "description")) ??
    defaultState.cargoDescription;
  const savedIsDangerousCargo =
    getOptionalBoolean(getRecordValue(providerPayload, "isDangerousCargo")) ??
    getOptionalBoolean(getRecordValue(cargoPayload, "isDangerousCargo")) ??
    defaultState.isDangerousCargo;
  const savedPackagePayloads = packageItems.length
    ? packageItems
    : firstPackage
      ? [firstPackage]
      : [];
  const savedPackages = savedPackagePayloads
    .map((packagePayload, index) => {
      const weightGrams = getOptionalNumber(
        getRecordValue(packagePayload, "weightGrams")
      );
      const lengthCm = getOptionalNumber(getRecordValue(packagePayload, "lengthCm"));
      const widthCm = getOptionalNumber(getRecordValue(packagePayload, "widthCm"));
      const heightCm = getOptionalNumber(getRecordValue(packagePayload, "heightCm"));

      if (!weightGrams || !lengthCm || !widthCm || !heightCm) {
        return null;
      }

      return {
        cargoDescription:
          getOptionalString(getRecordValue(packagePayload, "description")) ??
          savedCargoDescription,
        heightCm: String(heightCm),
        id: `saved-cdek-package-${index}`,
        isDangerousCargo:
          getOptionalBoolean(getRecordValue(packagePayload, "isDangerousCargo")) ??
          savedIsDangerousCargo,
        lengthCm: String(lengthCm),
        weightKg: formatCdekWeightKgInput(weightGrams) ?? defaultState.weightKg,
        widthCm: String(widthCm)
      };
    })
    .filter(Boolean) as CdekPackageState[];
  const packageStates =
    savedPackages.length > 0
      ? savedPackages
      : [createCdekPackageState(savedCargoDescription)];
  const firstPackageState = packageStates[0];
  const shipmentPointCode = getOptionalString(
    getRecordValue(providerPayload, "shipmentPointCode")
  );
  const senderCityFallbackLabel =
    getOptionalString(getRecordValue(providerPayload, "senderCity")) ??
    getOptionalString(getRecordValue(providerPayload, "fromCity")) ??
    (shipmentPointCode ? defaultState.senderCityQuery : undefined);
  const selectedSenderCity =
    createCdekCityFromProviderPayload(senderCityPayload) ??
    (shipmentPointCode === DEFAULT_CDEK_SENDER_POINT.code
      ? DEFAULT_CDEK_SENDER_CITY
      : createCdekCityFallbackFromLabel(senderCityFallbackLabel));
  const selectedSenderDeliveryPoint =
    createCdekDeliveryPointFromProviderPayload(
      shipmentPointPayload,
      selectedSenderCity
    ) ?? createCdekSenderPointFromCode(shipmentPointCode);
  const tariffCode =
    getOptionalNumber(getRecordValue(tariffPayload, "code")) ??
    draftOrder.delivery.tariffCode ??
    getOptionalNumber(getRecordValue(calculationPayload, "tariffCode"));
  const tariffName =
    getOptionalString(getRecordValue(tariffPayload, "name")) ??
    draftOrder.delivery.tariffName;
  const priceMinor =
    getOptionalNumber(getRecordValue(pricingPayload, "priceMinor")) ??
    draftOrder.delivery.priceMinor ??
    getOptionalNumber(getRecordValue(calculationPayload, "priceMinor"));
  const deliverySumMinor =
    getOptionalNumber(getRecordValue(pricingPayload, "deliverySumMinor")) ??
    getOptionalNumber(getRecordValue(calculationPayload, "deliverySumMinor")) ??
    priceMinor ??
    null;
  const totalSumMinor =
    getOptionalNumber(getRecordValue(pricingPayload, "totalSumMinor")) ??
    getOptionalNumber(getRecordValue(calculationPayload, "totalSumMinor")) ??
    priceMinor ??
    null;
  const periodMin =
    getOptionalNumber(getRecordValue(timingPayload, "periodMin")) ??
    draftOrder.delivery.periodMin ??
    getOptionalNumber(getRecordValue(calculationPayload, "periodMin")) ??
    null;
  const periodMax =
    getOptionalNumber(getRecordValue(timingPayload, "periodMax")) ??
    draftOrder.delivery.periodMax ??
    getOptionalNumber(getRecordValue(calculationPayload, "periodMax")) ??
    null;
  const selectedTariff: CdekTariff | null =
    tariffCode || tariffName || priceMinor
      ? {
          deliveryMode:
            getOptionalString(getRecordValue(tariffPayload, "deliveryMode")) ??
            getOptionalString(getRecordValue(providerPayload, "deliveryMode")) ??
            null,
          deliverySumMinor,
          errors: getProviderArray(getRecordValue(calculationPayload, "errors")),
          periodMax,
          periodMin,
          tariffCode: tariffCode ?? null,
          tariffName: tariffName ?? null,
          totalSumMinor,
          warnings: getProviderArray(
            getRecordValue(calculationPayload, "warnings")
          )
        }
      : null;
  const calculationResult: CdekDeliveryCalculationResult | null =
    tariffCode && priceMinor !== undefined
      ? {
          calculation: {
            calendarMax:
              getOptionalNumber(getRecordValue(calculationPayload, "calendarMax")) ??
              null,
            calendarMin:
              getOptionalNumber(getRecordValue(calculationPayload, "calendarMin")) ??
              null,
            currencyCode:
              getOptionalString(getRecordValue(pricingPayload, "currencyCode")) ??
              draftOrder.delivery.currencyCode ??
              "RUB",
            deliverySumMinor,
            errors: getProviderArray(getRecordValue(calculationPayload, "errors")),
            notSaved: true,
            periodMax,
            periodMin,
            priceMinor,
            provider: "cdek",
            services: getProviderArray(
              getRecordValue(calculationPayload, "services")
            ),
            tariffCode,
            totalSumMinor,
            warnings: getProviderArray(
              getRecordValue(calculationPayload, "warnings")
            ),
            weightCalc:
              getOptionalNumber(getRecordValue(calculationPayload, "weightCalc")) ??
              null
          },
          order: {
            id: draftOrder.serverOrderId ?? 0,
            orderNumber: draftOrder.serverOrderNumber ?? ""
          }
        }
      : null;
  const saveResult: CdekSaveDeliveryResult | null =
    priceMinor !== undefined
      ? {
          delivery: {
            addressText: draftOrder.delivery.address ?? null,
            currencyCode: draftOrder.delivery.currencyCode ?? "RUB",
            deliveryMode: "cdek",
            deliveryStatus: "selected",
            priceMinor,
            providerPayload,
            recipientName: draftOrder.delivery.contactName ?? null,
            recipientPhone: draftOrder.delivery.phone ?? null
          },
          order: {
            id: draftOrder.serverOrderId ?? 0,
            orderNumber: draftOrder.serverOrderNumber ?? ""
          },
          payment: {
            activePaymentsCanceled: false,
            canceledPaymentIds: [],
            deliveryNeedsReview: false,
            financialChanged: false
          },
          saved: true,
          totals: {
            deliveryTotalMinor: priceMinor,
            totalPriceMinor: draftOrder.totalPriceMinor
          }
        }
      : null;
  const message = null;

  return {
    ...defaultState,
    activePicker: null,
    calculationResult,
    cargoDescription: firstPackageState.cargoDescription,
    cityQuery: formatCdekCityLabel(selectedCity),
    heightCm: firstPackageState.heightCm,
    lengthCm: firstPackageState.lengthCm,
    message,
    saveResult,
    isDangerousCargo: firstPackageState.isDangerousCargo,
    isEditingSavedDelivery: false,
    packages: packageStates,
    selectedCity,
    selectedDeliveryPoint,
    selectedSenderCity,
    selectedSenderDeliveryPoint,
    selectedTariff,
    senderDeliveryPointResults: selectedSenderDeliveryPoint
      ? [selectedSenderDeliveryPoint]
      : [],
    senderDeliveryPointResultsCityCode: getCdekCityCode(selectedSenderCity),
    senderCityQuery: selectedSenderCity
      ? formatCdekCityLabel(selectedSenderCity)
      : defaultState.senderCityQuery,
    shipmentPointCode: shipmentPointCode ?? "",
    status: currentStatus,
    tariffCode: tariffCode ? String(tariffCode) : "",
    tariffResults: selectedTariff ? [selectedTariff] : [],
    weightKg: firstPackageState.weightKg,
    widthCm: firstPackageState.widthCm
  };
}

function getCdekIntegrationLabel(status: CdekStatus | null) {
  if (!status) {
    return "Интеграция СДЭК: не проверена";
  }

  if (!status.enabled || !status.configured) {
    return "Интеграция СДЭК: ошибка";
  }

  return `Интеграция СДЭК: работает · ${status.env === "prod" ? "prod" : "test"}`;
}

function getCdekUiErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Не удалось проверить СДЭК. Повторите проверку.";
  }

  if (
    error.message.includes("/cdek/status 401") ||
    error.message.includes("/cdek/status 403")
  ) {
    return "Нет доступа к проверке СДЭК. Войдите как менеджер/администратор.";
  }

  if (error.name === "AbortError") {
    return "Не удалось проверить СДЭК. Повторите проверку.";
  }

  const jsonStart = error.message.indexOf("{");

  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(error.message.slice(jsonStart)) as {
        error?: unknown;
      };

      if (parsed.error === "CDEK_DISABLED") {
        return "СДЭК выключен на сервере.";
      }

      if (parsed.error === "CDEK_NOT_CONFIGURED") {
        return "СДЭК не настроен на сервере.";
      }

      if (parsed.error === "UNAUTHORIZED" || parsed.error === "FORBIDDEN") {
        return "Нет доступа к проверке СДЭК. Войдите как менеджер/администратор.";
      }

      if (parsed.error === "ORDER_NOT_FOUND") {
        return "Заказ не найден на сервере.";
      }

      if (parsed.error === "ORDER_HAS_FINAL_OZON_PAYMENT") {
        return "Заказ уже оплачен. Изменение стоимости доставки заблокировано.";
      }

      if (parsed.error === "OZON_CANCEL_ORDER_FAILED") {
        return "Не удалось отменить активную Ozon-оплату. Доставка не сохранена.";
      }

      if (parsed.error === "OZON_PAYMENT_PROVIDER_ORDER_ID_REQUIRED") {
        return "Не удалось подготовить отмену активной Ozon-оплаты. Доставка не сохранена.";
      }

      if (typeof parsed.error === "string" && parsed.error.startsWith("INVALID_")) {
        return "Проверьте город, ПВЗ, тариф и габариты.";
      }
    } catch {
      return "Не удалось проверить СДЭК. Повторите проверку.";
    }
  }

  return "Не удалось проверить СДЭК. Повторите проверку.";
}

function getShortCdekErrorDetail(error: unknown) {
  if (!(error instanceof ApiResponseError)) {
    return null;
  }

  const { details } = error;
  const code = details.error ?? details.code ?? details.cdekCode;
  const providerStatus =
    details.cdekStatus === undefined ? null : String(details.cdekStatus);
  const providerMessage = details.cdekMessage ?? details.message;
  let detail = "";

  if (code && providerStatus) {
    detail = `${code} / ${providerStatus}`;
  } else if (code) {
    detail = code;
  } else if (providerStatus) {
    detail = providerStatus;
  }

  if (providerMessage && providerMessage !== code) {
    detail = detail ? `${detail}: ${providerMessage}` : providerMessage;
  }

  if (!detail.trim()) {
    return null;
  }

  return detail.length > 140 ? `${detail.slice(0, 137)}...` : detail;
}

function getCdekCitySearchErrorMessage(error: unknown) {
  if (
    error instanceof ApiResponseError &&
    (error.status === 401 || error.status === 403)
  ) {
    return "Нет доступа к поиску города СДЭК. Войдите как менеджер/администратор.";
  }

  const detail = getShortCdekErrorDetail(error);

  if (detail) {
    return `Не удалось найти город СДЭК: ${detail}`;
  }

  return "Не удалось найти город СДЭК. Повторите поиск.";
}

function getCdekTariffSelectionErrorMessage(error: unknown) {
  if (
    error instanceof ApiResponseError &&
    (error.status === 401 || error.status === 403)
  ) {
    return "Нет доступа к подбору тарифов СДЭК. Войдите как менеджер/администратор.";
  }

  const detail = getShortCdekErrorDetail(error);

  if (detail) {
    return `Не удалось подобрать тарифы СДЭК: ${detail}`;
  }

  return "Не удалось подобрать тарифы СДЭК. Повторите подбор.";
}

function getCdekCalculationErrorMessage(error: unknown) {
  if (
    error instanceof ApiResponseError &&
    (error.status === 401 || error.status === 403)
  ) {
    return "Нет доступа к расчёту СДЭК. Войдите как менеджер/администратор.";
  }

  if (
    error instanceof ApiResponseError &&
    (error.details.cdekCode === "v2_calc_contract_type" ||
      error.details.cdekMessage?.includes("v2_calc_contract_type"))
  ) {
    return "Выбранный тариф недоступен по договору или для выбранного направления. Подберите другой тариф СДЭК.";
  }

  const detail = getShortCdekErrorDetail(error);

  if (detail) {
    return `Не удалось рассчитать доставку СДЭК: ${detail}`;
  }

  return "Не удалось рассчитать доставку СДЭК. Повторите расчёт.";
}

function getCdekStatusMessage(status: CdekStatus) {
  if (status.enabled && status.configured) {
    return null;
  }

  if (!status.enabled) {
    return "СДЭК выключен на сервере.";
  }

  if (!status.configured) {
    return status.missing.length > 0
      ? `СДЭК не настроен на сервере. Не хватает: ${status.missing.join(", ")}.`
      : "СДЭК не настроен на сервере.";
  }

  return "СДЭК пока недоступен для расчёта.";
}

function getPositiveIntegerInput(value: string) {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function getCdekWeightGramsInput(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  const weightGrams = Math.round(numberValue * 1000);

  return weightGrams > 0 ? weightGrams : null;
}

function formatCdekWeightKgInput(weightGrams: number | null | undefined) {
  if (!weightGrams || weightGrams <= 0) {
    return null;
  }

  return Number((weightGrams / 1000).toFixed(3)).toString();
}

function getCdekPackagePayloads(state: CdekPanelState) {
  const packages = state.packages.length
    ? state.packages
    : [
        {
          cargoDescription: state.cargoDescription,
          heightCm: state.heightCm,
          id: "legacy-cdek-package",
          isDangerousCargo: state.isDangerousCargo,
          lengthCm: state.lengthCm,
          weightKg: state.weightKg,
          widthCm: state.widthCm
        }
      ];

  const normalizedPackages = packages.map((packageState) => {
    const weightGrams = getCdekWeightGramsInput(packageState.weightKg);
    const lengthCm = getPositiveIntegerInput(packageState.lengthCm);
    const widthCm = getPositiveIntegerInput(packageState.widthCm);
    const heightCm = getPositiveIntegerInput(packageState.heightCm);

    if (!weightGrams || !lengthCm || !widthCm || !heightCm) {
      return null;
    }

    return {
      description:
        packageState.cargoDescription.trim() || DEFAULT_CDEK_CARGO_DESCRIPTION,
      heightCm,
      isDangerousCargo: packageState.isDangerousCargo,
      lengthCm,
      weightGrams,
      widthCm
    };
  });

  return normalizedPackages.some((packagePayload) => packagePayload === null)
    ? null
    : (normalizedPackages as Array<{
        description: string;
        heightCm: number;
        isDangerousCargo: boolean;
        lengthCm: number;
        weightGrams: number;
        widthCm: number;
      }>);
}

function getCdekTotalPackageWeightKg(state: CdekPanelState) {
  const packages = getCdekPackagePayloads(state);

  if (!packages) {
    return null;
  }

  return packages.reduce((sum, packagePayload) => sum + packagePayload.weightGrams, 0) / 1000;
}

function resetCdekPackageDependentState(state: CdekPanelState): CdekPanelState {
  return {
    ...state,
    calculationResult: null,
    message: null,
    saveResult: null,
    selectedTariff: null,
    tariffCode: "",
    tariffRequestFingerprint: null,
    tariffResults: [],
    tariffResultsFingerprint: null
  };
}

function syncCdekLegacyCargoFields(
  state: CdekPanelState,
  packages: CdekPackageState[]
): CdekPanelState {
  const firstPackage = packages[0];

  return {
    ...state,
    cargoDescription: firstPackage?.cargoDescription ?? state.cargoDescription,
    heightCm: firstPackage?.heightCm ?? state.heightCm,
    isDangerousCargo:
      firstPackage?.isDangerousCargo ?? state.isDangerousCargo,
    lengthCm: firstPackage?.lengthCm ?? state.lengthCm,
    packages,
    weightKg: firstPackage?.weightKg ?? state.weightKg,
    widthCm: firstPackage?.widthCm ?? state.widthCm
  };
}

function getCdekCalculationPriceMinor(
  calculationResult: CdekDeliveryCalculationResult | null
) {
  if (!calculationResult) {
    return null;
  }

  const { calculation } = calculationResult;

  return (
    calculation.priceMinor ??
    calculation.totalSumMinor ??
    calculation.deliverySumMinor ??
    null
  );
}

function formatCdekDeliveryPointLabel(point: CdekDeliveryPoint) {
  return point.name || point.address || point.code || "ПВЗ СДЭК";
}

function formatCdekTariffWorkLabel(tariff: CdekTariff | null) {
  if (!tariff) {
    return "Тариф не выбран";
  }

  return tariff.tariffName ?? "Тариф СДЭК";
}

function formatCdekTariffCode(tariff: CdekTariff | null) {
  return tariff?.tariffCode ? `#${tariff.tariffCode}` : null;
}

function formatCdekRubMinor(valueMinor: number) {
  return `${(valueMinor / 100).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: valueMinor % 100 === 0 ? 0 : 2
  })} ₽`;
}

function getCdekTariffBasePriceMinor(tariff: CdekTariff) {
  return tariff.deliverySumMinor ?? tariff.totalSumMinor ?? null;
}

function getCdekTariffPayableMinor(tariff: CdekTariff) {
  return tariff.totalSumMinor ?? tariff.deliverySumMinor ?? null;
}

function getCdekTariffPriceLabel(tariff: CdekTariff) {
  const priceMinor = getCdekTariffBasePriceMinor(tariff);

  return priceMinor === null
    ? "цена не получена"
    : formatCdekRubMinor(priceMinor);
}

function getCdekTariffPaymentHint(tariff: CdekTariff) {
  const basePriceMinor = getCdekTariffBasePriceMinor(tariff);
  const payableMinor = getCdekTariffPayableMinor(tariff);

  if (
    basePriceMinor === null ||
    payableMinor === null ||
    basePriceMinor === payableMinor
  ) {
    return null;
  }

  return `к оплате ${formatCdekRubMinor(payableMinor)} с НДС`;
}

function getCdekCalculationTariffPriceMinor(
  calculationResult: CdekDeliveryCalculationResult | null
) {
  return calculationResult?.calculation.deliverySumMinor ?? null;
}

function getCdekCalculationVatMinor(
  calculationResult: CdekDeliveryCalculationResult | null
) {
  const tariffPriceMinor = getCdekCalculationTariffPriceMinor(calculationResult);
  const payableMinor = getCdekCalculationPriceMinor(calculationResult);

  if (tariffPriceMinor === null || payableMinor === null) {
    return null;
  }

  const vatMinor = payableMinor - tariffPriceMinor;

  return vatMinor > 0 ? vatMinor : null;
}

function getCdekCalculationPayableLabel(
  calculationResult: CdekDeliveryCalculationResult | null
) {
  const payableMinor = getCdekCalculationPriceMinor(calculationResult);

  return payableMinor === null
    ? "стоимость не рассчитана"
    : formatCdekRubMinor(payableMinor);
}

function getCdekTariffPeriodLabel(tariff: CdekTariff) {
  if (tariff.periodMin === null && tariff.periodMax === null) {
    return "срок не указан";
  }

  return `${tariff.periodMin ?? "?"}–${tariff.periodMax ?? "?"} календарных дней`;
}

function getCdekTariffDeliverySummaryLabel(tariff: CdekTariff) {
  const code = formatCdekTariffCode(tariff);

  return [getCdekTariffPeriodLabel(tariff), code].filter(Boolean).join(" · ");
}

function normalizeCdekTariffName(value: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getCdekTariffModeRule(
  fromMode: CdekTariffFromMode,
  toMode: CdekTariffToMode
) {
  if (fromMode === "warehouse" && toMode === "warehouse") {
    return { deliveryMode: "4", nameFragment: "склад-склад" };
  }

  if (fromMode === "door" && toMode === "warehouse") {
    return { deliveryMode: "2", nameFragment: "дверь-склад" };
  }

  if (fromMode === "warehouse" && toMode === "door") {
    return { deliveryMode: "3", nameFragment: "склад-дверь" };
  }

  if (fromMode === "door" && toMode === "door") {
    return { deliveryMode: "1", nameFragment: "дверь-дверь" };
  }

  if (fromMode === "door" && toMode === "postamat") {
    return { deliveryMode: "6", nameFragment: "дверь-постамат" };
  }

  return { deliveryMode: "7", nameFragment: "склад-постамат" };
}

function isCdekTariffMatchingMode(
  tariff: CdekTariff,
  fromMode: CdekTariffFromMode,
  toMode: CdekTariffToMode
) {
  const rule = getCdekTariffModeRule(fromMode, toMode);
  const mode =
    tariff.deliveryMode === null || tariff.deliveryMode === undefined
      ? ""
      : String(tariff.deliveryMode).trim();
  const name = normalizeCdekTariffName(tariff.tariffName);

  return mode === rule.deliveryMode || name.includes(rule.nameFragment);
}

function getCdekTariffNamePriority(tariff: CdekTariff) {
  const name = tariff.tariffName?.toLocaleLowerCase("ru-RU") ?? "";

  if (name.includes("посылка")) {
    return 1;
  }

  if (name.includes("магистральный экспресс")) {
    return 3;
  }

  if (name.includes("супер-экспресс") || name.includes("супер экспресс")) {
    return 4;
  }

  if (name.includes("экспресс")) {
    return 2;
  }

  return 5;
}

function compareCdekTariffsForPvz(first: CdekTariff, second: CdekTariff) {
  const firstName = normalizeCdekTariffName(first.tariffName);
  const secondName = normalizeCdekTariffName(second.tariffName);
  const firstWarehouse = firstName.includes("склад-склад") ? 0 : 1;
  const secondWarehouse = secondName.includes("склад-склад") ? 0 : 1;

  if (firstWarehouse !== secondWarehouse) {
    return firstWarehouse - secondWarehouse;
  }

  const firstPriority = getCdekTariffNamePriority(first);
  const secondPriority = getCdekTariffNamePriority(second);

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }

  const firstPrice = first.totalSumMinor ?? first.deliverySumMinor ?? Number.MAX_SAFE_INTEGER;
  const secondPrice =
    second.totalSumMinor ?? second.deliverySumMinor ?? Number.MAX_SAFE_INTEGER;

  return firstPrice - secondPrice;
}

function getCdekVisibleTariffs(
  tariffs: CdekTariff[],
  fromMode: CdekTariffFromMode,
  toMode: CdekTariffToMode
) {
  return tariffs
    .filter((tariff) => isCdekTariffMatchingMode(tariff, fromMode, toMode))
    .sort(compareCdekTariffsForPvz);
}

function canSaveCdekDeliveryMode(state: CdekPanelState) {
  return canSaveCdekTariffMode(state.tariffFromMode, state.tariffToMode);
}

function canSaveCdekTariffMode(
  fromMode: CdekTariffFromMode,
  toMode: CdekTariffToMode
) {
  return (
    fromMode === "warehouse" && toMode === "warehouse"
  );
}

function updateCdekTariffMode(
  state: CdekPanelState,
  nextMode: Partial<{
    fromMode: CdekTariffFromMode;
    toMode: CdekTariffToMode;
  }>
): CdekPanelState {
  const tariffFromMode = nextMode.fromMode ?? state.tariffFromMode;
  const tariffToMode = nextMode.toMode ?? state.tariffToMode;
  const selectedTariffMatches =
    state.selectedTariff === null ||
    isCdekTariffMatchingMode(state.selectedTariff, tariffFromMode, tariffToMode);

  if (
    tariffFromMode === state.tariffFromMode &&
    tariffToMode === state.tariffToMode
  ) {
    return state;
  }

  return {
    ...state,
    calculationResult: selectedTariffMatches ? state.calculationResult : null,
    message: null,
    saveResult:
      selectedTariffMatches && canSaveCdekTariffMode(tariffFromMode, tariffToMode)
        ? state.saveResult
        : null,
    selectedTariff: selectedTariffMatches ? state.selectedTariff : null,
    tariffCode: selectedTariffMatches ? state.tariffCode : "",
    tariffFromMode,
    tariffToMode
  };
}

function formatCdekCityLabel(city: CdekCity | null) {
  if (!city) {
    return "";
  }

  return city.city ?? city.fullName ?? `город ${city.code ?? ""}`.trim();
}

function normalizeCdekCityDetailPart(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ")
    .replace(/[.]/g, "")
    .trim();
}

function formatCdekCitySubtitle(city: CdekCity) {
  const countryLabel = city.countryCode === "RU" ? "Россия" : city.countryCode;
  const cityLabel = formatCdekCityLabel(city);
  const cityKey = normalizeCdekCityDetailPart(cityLabel);
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const part of city.fullName?.split(",") ?? []) {
    const trimmed = part.trim();
    const key = normalizeCdekCityDetailPart(trimmed);

    if (!trimmed || key === cityKey || seen.has(key)) {
      continue;
    }

    parts.push(trimmed);
    seen.add(key);
  }

  for (const part of [city.region, countryLabel]) {
    const trimmed = part?.trim();
    const key = trimmed ? normalizeCdekCityDetailPart(trimmed) : "";

    if (!trimmed || key === cityKey || seen.has(key)) {
      continue;
    }

    parts.push(trimmed);
    seen.add(key);
  }

  return parts.join(", ") || city.fullName || "";
}

function getCdekSenderSummary(state: CdekPanelState) {
  if (!state.selectedSenderDeliveryPoint?.code) {
    return "Выберите пункт отправки";
  }

  const cityLabel =
    formatCdekCityLabel(state.selectedSenderCity) ||
    state.senderCityQuery.trim() ||
    "город отправителя";
  const pointLabel =
    state.selectedSenderDeliveryPoint.address ??
    state.selectedSenderDeliveryPoint.addressFull ??
    formatCdekDeliveryPointLabel(state.selectedSenderDeliveryPoint);

  return `Отправление: ${cityLabel}, ${pointLabel}`;
}

function getCdekPointWorkLabel(point: CdekDeliveryPoint | null) {
  if (!point) {
    return "";
  }

  const address = point.address ?? point.addressFull ?? point.name;

  if (address && address !== point.code) {
    return address;
  }

  return point.code ? `пункт ${point.code}` : formatCdekDeliveryPointLabel(point);
}

function getCdekPointSelectLabel(
  city: CdekCity | null,
  point: CdekDeliveryPoint | null,
  cityQuery = ""
) {
  if (!point) {
    return null;
  }

  const cityLabel = formatCdekCityLabel(city) || cityQuery.trim();
  const pointLabel = getCdekPointWorkLabel(point);

  return [cityLabel, pointLabel].filter(Boolean).join(" · ");
}

function filterCdekDeliveryPoints(points: CdekDeliveryPoint[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  if (!normalizedQuery) {
    return points;
  }

  return points.filter((point) =>
    [
      point.code,
      point.name,
      point.address,
      point.addressFull,
      point.nearestStation,
      point.workTime
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery)
  );
}

function getCdekRouteSummary(
  city: CdekCity | null,
  point: CdekDeliveryPoint | null,
  fallbackCityQuery = ""
) {
  const cityLabel = formatCdekCityLabel(city) || fallbackCityQuery.trim();
  const pointLabel = getCdekPointWorkLabel(point);

  if (cityLabel && pointLabel) {
    return `${cityLabel} · ${pointLabel}`;
  }

  return cityLabel || pointLabel || "Не выбрано";
}

function getCdekSenderSectionSummary(state: CdekPanelState) {
  if (!state.selectedSenderCity) {
    return "Выберите город отправителя";
  }

  if (!state.selectedSenderDeliveryPoint?.code) {
    return "Выберите пункт отправки";
  }

  return getCdekRouteSummary(
    state.selectedSenderCity,
    state.selectedSenderDeliveryPoint,
    state.senderCityQuery
  );
}

function getCdekRecipientSectionSummary(state: CdekPanelState) {
  if (!state.selectedCity) {
    return "Выберите город получателя";
  }

  if (!state.selectedDeliveryPoint?.code) {
    return "Выберите ПВЗ";
  }

  return getCdekRouteSummary(
    state.selectedCity,
    state.selectedDeliveryPoint,
    state.cityQuery
  );
}

function getCdekCargoSummary(state: CdekPanelState) {
  const packages = getCdekPackagePayloads(state);

  if (!packages || packages.length === 0) {
    return "Проверьте грузовые места";
  }

  if (packages.length === 1) {
    const [packagePayload] = packages;
    const weightKg = Number((packagePayload.weightGrams / 1000).toFixed(3));

    return `${weightKg} кг, ${packagePayload.lengthCm}×${packagePayload.widthCm}×${packagePayload.heightCm} см`;
  }

  const totalWeightKg =
    packages.reduce((sum, packagePayload) => sum + packagePayload.weightGrams, 0) /
    1000;

  return `${packages.length} места · ${Number(totalWeightKg.toFixed(3))} кг суммарно`;
}

function getCdekCalculationPeriodLabel(
  calculationResult: CdekDeliveryCalculationResult | null
) {
  if (!calculationResult) {
    return "срок не рассчитан";
  }

  const { periodMax, periodMin } = calculationResult.calculation;

  return `${periodMin ?? "?"}–${periodMax ?? "?"} дн.`;
}

function getCdekCalculationPriceLabel(
  calculationResult: CdekDeliveryCalculationResult | null
) {
  const priceMinor = getCdekCalculationPriceMinor(calculationResult);

  return priceMinor === null
    ? "стоимость не рассчитана"
    : formatMinorPrice(priceMinor, calculationResult?.calculation.currencyCode ?? "RUB");
}

function getCdekTariffSectionSummary(state: CdekPanelState) {
  if (!state.selectedTariff) {
    return "Подберите тариф";
  }

  return [
    formatCdekTariffWorkLabel(state.selectedTariff),
    formatCdekTariffCode(state.selectedTariff),
    getCdekCalculationPriceLabel(state.calculationResult),
    getCdekCalculationPeriodLabel(state.calculationResult)
  ]
    .filter(Boolean)
    .join(" · ");
}

function getCdekSaveButtonLabel(
  state: CdekPanelState,
  deliveryNeedsReview = false
) {
  if (state.isSaving) {
    return "Сохраняем...";
  }

  if (deliveryNeedsReview && state.saveResult) {
    return "Подтвердить доставку";
  }

  if (state.saveResult) {
    return "Доставка сохранена";
  }

  if (!canSubmitCdekDelivery(state)) {
    return "Заполните доставку";
  }

  return "Сохранить доставку в заказ";
}

function getCdekSaveActionNote(
  state: CdekPanelState,
  deliveryNeedsReview = false
) {
  if (deliveryNeedsReview && state.saveResult) {
    return "Проверьте вес/габариты. Если всё верно — подтвердите доставку.";
  }

  if (state.saveResult) {
    return "Отправление СДЭК ещё не создано.";
  }

  if (!canSubmitCdekDelivery(state)) {
    return "Выберите маршрут, груз и тариф.";
  }

  return "Стоимость доставки будет добавлена в итог заказа.";
}

function canRequestCdekTariffs(state: CdekPanelState) {
  return Boolean(
    getCdekCityCode(state.selectedSenderCity) &&
      state.selectedSenderDeliveryPoint?.code &&
      state.selectedCity?.code &&
      state.selectedDeliveryPoint?.code &&
      getCdekPackagePayloads(state)
  );
}

function canCalculateCdekDelivery(state: CdekPanelState) {
  return Boolean(canRequestCdekTariffs(state) && state.selectedTariff?.tariffCode);
}

function canSubmitCdekDelivery(state: CdekPanelState) {
  return Boolean(
    canCalculateCdekDelivery(state) &&
      state.calculationResult &&
      getCdekCalculationPriceMinor(state.calculationResult) !== null
  );
}

function getCdekTariffRequestFingerprint(state: CdekPanelState) {
  const fromCityCode = getCdekCityCode(state.selectedSenderCity);
  const shipmentPointCode = state.selectedSenderDeliveryPoint?.code ?? null;
  const toCityCode = state.selectedCity?.code ?? null;
  const deliveryPointCode = state.selectedDeliveryPoint?.code ?? null;
  const packages = getCdekPackagePayloads(state);

  if (
    !fromCityCode ||
    !shipmentPointCode ||
    !toCityCode ||
    !deliveryPointCode ||
    !packages
  ) {
    return null;
  }

  return [
    fromCityCode,
    state.selectedSenderCity?.city ?? state.senderCityQuery.trim(),
    shipmentPointCode,
    toCityCode,
    state.selectedCity?.city ?? state.cityQuery.trim(),
    deliveryPointCode,
    state.selectedDeliveryPoint?.address ?? state.selectedDeliveryPoint?.addressFull ?? "",
    ...packages.flatMap((packagePayload) => [
      packagePayload.weightGrams,
      packagePayload.lengthCm,
      packagePayload.widthCm,
      packagePayload.heightCm
    ])
  ].join("|");
}

function createCdekCalculationResultFromTariff(
  draftOrder: DraftOrder,
  tariff: CdekTariff
): CdekDeliveryCalculationResult | null {
  const tariffCode = tariff.tariffCode;
  const priceMinor = tariff.totalSumMinor ?? tariff.deliverySumMinor ?? null;

  if (!tariffCode || priceMinor === null) {
    return null;
  }

  return {
    calculation: {
      calendarMax: null,
      calendarMin: null,
      currencyCode: "RUB",
      deliverySum: tariff.deliverySum ?? null,
      deliverySumMinor: tariff.deliverySumMinor,
      errors: tariff.errors,
      notSaved: true,
      periodMax: tariff.periodMax,
      periodMin: tariff.periodMin,
      priceMinor,
      provider: "cdek",
      services: [],
      tariffCode,
      totalSum: tariff.totalSum ?? null,
      totalSumMinor: tariff.totalSumMinor,
      warnings: tariff.warnings,
      weightCalc: null
    },
    order: {
      id: draftOrder.serverOrderId ?? 0,
      orderNumber: draftOrder.serverOrderNumber ?? ""
    }
  };
}

function buildLocalCdekDeliveryProviderPayload(payload: CdekSaveDeliveryRequest) {
  const deliverySumMinor = payload.deliverySumMinor ?? payload.priceMinor;
  const totalSumMinor = payload.totalSumMinor ?? payload.priceMinor;
  const vatMinor =
    payload.vatMinor ??
    (totalSumMinor > deliverySumMinor ? totalSumMinor - deliverySumMinor : null);
  const cargoDescription = payload.cargoDescription ?? DEFAULT_CDEK_CARGO_DESCRIPTION;
  const country = payload.countryCode === "RU" ? "Россия" : payload.countryCode;
  const senderCountry =
    payload.senderCountryCode === "RU"
      ? "Россия"
      : payload.senderCountryCode;

  return {
    calculation: payload.calculation,
    cargo: {
      declaredValueMinor: payload.declaredValueMinor,
      description: cargoDescription,
      isDangerousCargo: payload.isDangerousCargo,
      placesCount: payload.placesCount
    },
    cargoDescription,
    city: {
      city: payload.city,
      code: payload.cityCode,
      country,
      countryCode: payload.countryCode,
      name: payload.city,
      region: payload.region,
      uuid: payload.cityUuid
    },
    declaredValueMinor: payload.declaredValueMinor,
    deliveryPoint: {
      address: payload.deliveryPointAddress,
      code: payload.deliveryPointCode,
      name: payload.deliveryPointName,
      type: payload.deliveryPointType,
      uuid: payload.deliveryPointUuid
    },
    deliveryMode: payload.deliveryMode,
    isDangerousCargo: payload.isDangerousCargo,
    package: {
      items: payload.packages
    },
    packages: payload.packages,
    placesCount: payload.placesCount,
    pricing: {
      currencyCode: payload.currencyCode ?? "RUB",
      deliverySumMinor,
      priceMinor: payload.priceMinor,
      totalSumMinor,
      vatMinor
    },
    provider: "cdek",
    recipient: {
      email: payload.recipientEmail,
      name: payload.recipientName,
      phone: payload.recipientPhone
    },
    recipientCity: {
      code: payload.cityCode,
      country,
      countryCode: payload.countryCode,
      name: payload.city,
      region: payload.region,
      uuid: payload.cityUuid
    },
    recipientEmail: payload.recipientEmail,
    recipientName: payload.recipientName,
    recipientPhone: payload.recipientPhone,
    saveRequest: payload,
    senderCity: {
      city: payload.senderCity,
      code: payload.senderCityCode,
      country: senderCountry,
      countryCode: payload.senderCountryCode,
      name: payload.senderCity,
      region: payload.senderRegion
    },
    shipmentPoint: {
      address: payload.shipmentPointAddress,
      code: payload.shipmentPointCode,
      name: payload.shipmentPointName,
      type: payload.shipmentPointType,
      uuid: payload.shipmentPointUuid
    },
    shipmentPointCode: payload.shipmentPointCode,
    tariff: {
      code: payload.tariffCode,
      deliveryMode: payload.deliveryMode,
      name: payload.tariffName
    },
    timing: {
      calendarMax: payload.calendarMax,
      calendarMin: payload.calendarMin,
      periodMax: payload.periodMax,
      periodMin: payload.periodMin
    }
  };
}

function getCdekSaveRequestFromDraftDelivery(
  delivery: DraftOrderDelivery
): CdekSaveDeliveryRequest | null {
  const providerPayload = getRecordValue(delivery.providerPayload, "saveRequest");
  const cityCode = getOptionalNumber(getRecordValue(providerPayload, "cityCode"));
  const deliveryPointAddress = getOptionalString(
    getRecordValue(providerPayload, "deliveryPointAddress")
  );
  const deliveryPointCode = getOptionalString(
    getRecordValue(providerPayload, "deliveryPointCode")
  );
  const priceMinor = getOptionalNumber(getRecordValue(providerPayload, "priceMinor"));
  const tariffCode = getOptionalNumber(getRecordValue(providerPayload, "tariffCode"));
  const packagesValue = getRecordValue(providerPayload, "packages");

  if (
    !cityCode ||
    !deliveryPointAddress ||
    !deliveryPointCode ||
    !priceMinor ||
    !tariffCode ||
    !Array.isArray(packagesValue)
  ) {
    return null;
  }

  return providerPayload as CdekSaveDeliveryRequest;
}

function getCdekCalculationSectionSummary(
  state: CdekPanelState,
  draftOrder: DraftOrder,
  deliveryNeedsReview = false
) {
  if (deliveryNeedsReview && state.saveResult) {
    return "Доставка требует проверки после изменения заказа.";
  }

  if (state.saveResult) {
    if (!draftOrder.serverOrderId) {
      return "СДЭК-доставка сохранена в черновик заказа";
    }

    return "СДЭК-доставка сохранена в заказ";
  }

  if (state.calculationResult) {
    return "Расчёт не сохранён в заказ";
  }

  if (draftOrder.delivery.mode === "cdek" && draftOrder.delivery.priceMinor) {
    return "Данные доставки изменены. Нужно пересчитать и сохранить изменения.";
  }

  return "Заполните маршрут, груз и тариф.";
}

const DRAFT_ORDERS_STORAGE_KEY = "diez-control-center:draft-orders";
const REMEMBERED_AUTH_STORAGE_KEY = "diez-control-center:auth-session";
const REMEMBERED_PHONE_STORAGE_KEY = "diez-control-center:auth-phone";

function formatMinorPrice(value: number, currencyCode: string) {
  return `${(value / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currencyCode}`;
}

function getDraftOrderTotalMinor(items: DraftOrderItem[]) {
  return items.reduce((total, item) => total + item.priceMinor, 0);
}

function getDraftOrderDeliveryPriceMinor(delivery: DraftOrderDelivery) {
  if (getDraftOrderDeliveryState(delivery) !== "filled") {
    return 0;
  }

  const priceMinor = Number(delivery.priceMinor ?? 0);

  return Number.isFinite(priceMinor) && priceMinor > 0 ? priceMinor : 0;
}

function getDraftOrderGrandTotalMinor(
  items: DraftOrderItem[],
  delivery: DraftOrderDelivery
) {
  return getDraftOrderTotalMinor(items) + getDraftOrderDeliveryPriceMinor(delivery);
}

function getDraftOrderDeliveryTotalLabel(draftOrder: DraftOrder) {
  if (draftOrder.delivery.mode === "not-required") {
    return "Не требуется";
  }

  if (getDraftOrderDeliveryState(draftOrder.delivery) === "missing") {
    return "Не заполнена";
  }

  const priceMinor = Number(draftOrder.delivery.priceMinor ?? 0);

  if (!Number.isFinite(priceMinor) || priceMinor <= 0) {
    return "Цена не указана";
  }

  return formatMinorPrice(priceMinor, draftOrder.delivery.currencyCode ?? "RUB");
}

function shouldShowDraftOrderDeliveryLine(draftOrder: DraftOrder) {
  return (
    draftOrder.delivery.mode !== "not-required" &&
    getDraftOrderDeliveryState(draftOrder.delivery) === "filled"
  );
}

function getDraftOrderDeliveryLineTitle(delivery: DraftOrderDelivery) {
  if (delivery.mode === "cdek") {
    return "СДЭК";
  }

  return "Ручная доставка";
}

function mapApiServiceTypeToDraftServiceType(
  serviceType: string
): DraftOrderItem["serviceType"] {
  if (serviceType === "light_letters" || serviceType === "light-letter") {
    return "light-letter";
  }

  if (serviceType === "dtf_print" || serviceType === "dtf-print") {
    return "dtf-print";
  }

  return "manual";
}

function getDraftItemTypeFromServiceType(
  serviceType: DraftOrderItem["serviceType"]
): DraftOrderItem["type"] {
  if (serviceType === "light-letter") {
    return "Конструктор объёмных букв";
  }

  if (serviceType === "dtf-print") {
    return "DTF-печать";
  }

  return "Позиция заказа";
}

function normalizeOrderWorkflowStatus(status: string): OrderWorkflowStatus {
  return orderWorkflowStatusOptions.some((option) => option.value === status)
    ? (status as OrderWorkflowStatus)
    : "new";
}

function mapApiDeliveryModeToDraftDeliveryMode(mode: unknown): DeliveryMode {
  if (typeof mode !== "string") {
    return "manual";
  }

  const normalizedMode = mode.trim().toLowerCase().replace(/_/g, "-");

  if (normalizedMode === "not-required") {
    return "not-required";
  }

  if (normalizedMode === "cdek") {
    return "cdek";
  }

  return "manual";
}

function getRecordValue(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function isDraftOrderDeliveryNeedsReview(draftOrder: DraftOrder) {
  if (draftOrder.delivery.mode === "not-required") {
    return false;
  }

  return getRecordValue(draftOrder.delivery.providerPayload, "needsReview") === true;
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getOptionalStringOrNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return getOptionalString(value);
}

function getOptionalNumberArray(value: unknown) {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
    ? value
    : undefined;
}

function getEditorParamsRecord(value: unknown) {
  const editorParams = getRecordValue(value, "editorParams");

  return isPlainRecord(editorParams) ? editorParams : null;
}

function getLightLetterEditorRecords(item: OrderDetail["items"][number]) {
  return [
    getEditorParamsRecord(item.params),
    getEditorParamsRecord(item.calculationSnapshot),
    item.params,
    item.calculationSnapshot
  ].filter(isPlainRecord);
}

function getFirstRecordValue(
  records: Array<Record<string, unknown>>,
  key: string
) {
  for (const record of records) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function getLightLetterEditorFields(
  item: OrderDetail["items"][number]
): Partial<DraftOrderItem> {
  const records = getLightLetterEditorRecords(item);
  const lightingModeValue = getFirstRecordValue(records, "lightingMode");
  const lightingMode =
    lightingModeValue === "light" || lightingModeValue === "non-light"
      ? lightingModeValue
      : undefined;

  return {
    boardTapeColorName: getOptionalString(
      getFirstRecordValue(records, "boardTapeColorName")
    ),
    boardThicknessMm: getOptionalNumber(
      getFirstRecordValue(records, "boardThicknessMm")
    ),
    boardWidthMm: getOptionalNumber(getFirstRecordValue(records, "boardWidthMm")),
    faceFilmColorCode: getOptionalString(
      getFirstRecordValue(records, "faceFilmColorCode")
    ),
    faceFilmLabel: getOptionalString(getFirstRecordValue(records, "faceFilmLabel")),
    heightMm: getOptionalStringOrNumber(getFirstRecordValue(records, "heightMm")),
    lightingMode,
    resolvedBoardTapeMaterialName: getOptionalString(
      getFirstRecordValue(records, "resolvedBoardTapeMaterialName")
    ),
    resolvedBoardTapeThicknessMm: getOptionalNumber(
      getFirstRecordValue(records, "resolvedBoardTapeThicknessMm")
    ),
    svgMarkup: getOptionalString(getFirstRecordValue(records, "svgMarkup")),
    svgShapeIndexes: getOptionalNumberArray(
      getFirstRecordValue(records, "svgShapeIndexes")
    ),
    text: getOptionalString(getFirstRecordValue(records, "text")),
    widthMm: getOptionalNumber(getFirstRecordValue(records, "widthMm"))
  };
}

function getCdekDeliveryProviderSummary(providerPayload: unknown) {
  const tariff = getRecordValue(providerPayload, "tariff");
  const timing = getRecordValue(providerPayload, "timing");

  return {
    periodMax: getOptionalNumber(getRecordValue(timing, "periodMax")),
    periodMin: getOptionalNumber(getRecordValue(timing, "periodMin")),
    tariffCode: getOptionalNumber(getRecordValue(tariff, "code")),
    tariffName: getOptionalString(getRecordValue(tariff, "name"))
  };
}

function mapOrderDetailsToDraftOrder(
  orderDetails: OrderDetail,
  existingDraftOrderId?: string
): DraftOrder {
  const items = orderDetails.items.map((item, index) => {
    const serviceType = mapApiServiceTypeToDraftServiceType(item.serviceType);
    const priceMinor = Number(item.totalPriceMinor) || 0;
    const lightLetterEditorFields =
      serviceType === "light-letter" ? getLightLetterEditorFields(item) : {};

    return {
      baselineStatus: "из базы",
      calculationId: `order-${orderDetails.id}-item-${item.id}`,
      calculationSource: "database-order",
      checkMode: "imported",
      calculationSnapshot: item.calculationSnapshot,
      currencyCode: item.currencyCode,
      formattedPrice: formatMinorPrice(priceMinor, item.currencyCode),
      id: `order-${orderDetails.id}-item-${item.id}`,
      managerComment:
        getOptionalString(getRecordValue(item.params, "managerComment")) ??
        getOptionalString(
          getRecordValue(item.calculationSnapshot, "managerComment")
        ),
      ...lightLetterEditorFields,
      params: item.params,
      priceMinor,
      quantity: Number(item.quantity) || 1,
      serviceType,
      title: item.title || `Позиция ${index + 1}`,
      totalPriceMinor: priceMinor,
      type: getDraftItemTypeFromServiceType(serviceType),
      unitPriceMinor: Number(item.unitPriceMinor) || 0
    };
  });
  const cdekProviderSummary = orderDetails.delivery
    ? getCdekDeliveryProviderSummary(orderDetails.delivery.providerPayload)
    : null;

  return {
    createdAt: orderDetails.createdAt,
    customer: {
      comment: orderDetails.customer.comment ?? "",
      email: orderDetails.customer.email ?? "",
      name: orderDetails.customer.name ?? orderDetails.customerName ?? "",
      phone: orderDetails.customer.phone ?? orderDetails.customerPhone ?? ""
    },
    databaseStatus: normalizeOrderWorkflowStatus(orderDetails.status),
    delivery: orderDetails.delivery
      ? {
          address: orderDetails.delivery.addressText ?? "",
          comment: orderDetails.delivery.comment ?? "",
          contactName: orderDetails.delivery.recipientName ?? "",
          currencyCode: orderDetails.delivery.currencyCode,
          mode: mapApiDeliveryModeToDraftDeliveryMode(
            orderDetails.delivery.deliveryMode
          ),
          periodMax: cdekProviderSummary?.periodMax,
          periodMin: cdekProviderSummary?.periodMin,
          phone: orderDetails.delivery.recipientPhone ?? "",
          priceMinor: Number(orderDetails.delivery.priceMinor),
          providerPayload: orderDetails.delivery.providerPayload,
          tariffCode: cdekProviderSummary?.tariffCode,
          tariffName: cdekProviderSummary?.tariffName
        }
      : {
          mode: "not-required"
        },
    id: existingDraftOrderId ?? `database-order-${orderDetails.id}`,
    events: orderDetails.events ?? [],
    items,
    requestComment: orderDetails.customerComment ?? orderDetails.customer.comment ?? "",
    serverOrderId: orderDetails.id,
    serverOrderNumber: orderDetails.orderNumber,
    serverOrderSavedAt: orderDetails.updatedAt,
    status: "awaiting-details",
    totalPriceMinor: Number(orderDetails.totalPriceMinor) || getDraftOrderTotalMinor(items),
    updatedAt: orderDetails.updatedAt
  };
}

function normalizeRussianPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("8")) {
    return digits.slice(1, 11);
  }

  if (digits.startsWith("7")) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

function formatRussianPhone(value: string) {
  const digits = normalizeRussianPhoneDigits(value);
  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10)
  ].filter(Boolean);

  return ["+7", ...groups].join(" ");
}

function hasRussianPhoneDigits(value: string | undefined) {
  return Boolean(value && normalizeRussianPhoneDigits(value).length > 0);
}

function normalizeAuthPhoneLogin(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith("7")) {
    return digits;
  }

  if (digits.length === 10) {
    return `7${digits}`;
  }

  return null;
}

function normalizeAuthCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

type RememberedAuthSession = {
  expiresAt: string;
  phone: string;
  token: string;
  user: AuthUser;
};

function isRememberedAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<AuthUser>;

  return (
    typeof user.id === "number" &&
    typeof user.login === "string" &&
    typeof user.displayName === "string" &&
    (typeof user.email === "string" || user.email === null) &&
    (user.role === "manager" || user.role === "admin")
  );
}

function readRememberedAuth() {
  try {
    const rawValue = window.localStorage.getItem(REMEMBERED_AUTH_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<RememberedAuthSession>;

    if (
      typeof parsedValue.token !== "string" ||
      typeof parsedValue.expiresAt !== "string" ||
      !isRememberedAuthUser(parsedValue.user)
    ) {
      return null;
    }

    const phone =
      window.localStorage.getItem(REMEMBERED_PHONE_STORAGE_KEY) ??
      (typeof parsedValue.phone === "string" ? parsedValue.phone : "");

    return {
      expiresAt: parsedValue.expiresAt,
      phone,
      token: parsedValue.token,
      user: parsedValue.user
    };
  } catch {
    return null;
  }
}

function saveRememberedAuth(session: RememberedAuthSession) {
  window.localStorage.setItem(REMEMBERED_AUTH_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem(REMEMBERED_PHONE_STORAGE_KEY, session.phone);
}

function clearRememberedAuth() {
  window.localStorage.removeItem(REMEMBERED_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(REMEMBERED_PHONE_STORAGE_KEY);
}

function getDraftOrderCustomerTitle(draftOrder: DraftOrder) {
  const customerName = draftOrder.customer?.name?.trim();
  const customerPhone = draftOrder.customer?.phone?.trim();

  return (
    customerName ||
    (hasRussianPhoneDigits(customerPhone) ? formatRussianPhone(customerPhone!) : "") ||
    "Заказчик не заполнен"
  );
}

function getDraftOrderDetailsTitle(draftOrder: DraftOrder) {
  const customerName = draftOrder.customer?.name?.trim();
  const customerPhone = draftOrder.customer?.phone?.trim();

  return (
    customerName ||
    (hasRussianPhoneDigits(customerPhone) ? formatRussianPhone(customerPhone!) : "") ||
    "Заказ без заказчика"
  );
}

function getDraftOrderCustomerNameLabel(draftOrder: DraftOrder) {
  return draftOrder.customer?.name?.trim() || "Заказчик не заполнен";
}

function getDraftOrderCustomerPhoneLabel(draftOrder: DraftOrder) {
  const customerPhone = draftOrder.customer?.phone?.trim();

  return hasRussianPhoneDigits(customerPhone)
    ? formatRussianPhone(customerPhone!)
    : "";
}

function getDraftOrderSummary(draftOrder: DraftOrder) {
  const firstItemTitle = draftOrder.items[0]?.title?.trim();

  if (firstItemTitle && draftOrder.items.length > 1) {
    return `${firstItemTitle} · + ещё ${draftOrder.items.length - 1}`;
  }

  if (firstItemTitle) {
    return firstItemTitle;
  }

  if (draftOrder.items.length > 0) {
    return `Позиции: ${draftOrder.items.length}`;
  }

  return "Позиции не добавлены";
}

function getDraftOrderItemServiceLabel(item: DraftOrderItem) {
  if (item.serviceType === "light-letter") {
    return "ОБЪЁМНЫЕ БУКВЫ";
  }

  if (item.serviceType === "dtf-print") {
    return "DTF-ПЕЧАТЬ";
  }

  return item.type;
}

function getDraftOrderItemDescription(item: DraftOrderItem) {
  return item.title;
}

function getDraftOrderItemCommentText(item: DraftOrderItem) {
  const records = [item.params, item.calculationSnapshot].filter(isPlainRecord);
  const commentKeys = [
    "comment",
    "customerComment",
    "requestComment",
    "clientComment",
    "notes"
  ];

  for (const record of records) {
    for (const key of commentKeys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "";
}

function getDraftOrderItemManagerComment(item: DraftOrderItem | null) {
  if (!item) {
    return "";
  }

  if (typeof item.managerComment === "string" && item.managerComment.trim()) {
    return item.managerComment.trim();
  }

  const records = [item.params, item.calculationSnapshot].filter(isPlainRecord);

  for (const record of records) {
    const value = record.managerComment;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function withManagerCommentPayload(
  payload: Record<string, unknown>,
  managerComment: string
) {
  const normalizedComment = managerComment.trim();

  return {
    ...payload,
    managerComment: normalizedComment || null
  };
}

function applyManagerCommentToDraftOrderItem(
  item: DraftOrderItem,
  managerComment: string
): DraftOrderItem {
  const normalizedComment = managerComment.trim();
  const managerCommentValue = normalizedComment || undefined;
  const managerCommentPayloadValue = normalizedComment || null;

  return {
    ...item,
    calculationSnapshot: isPlainRecord(item.calculationSnapshot)
      ? {
          ...item.calculationSnapshot,
          managerComment: managerCommentPayloadValue
        }
      : item.calculationSnapshot,
    managerComment: managerCommentValue,
    params: isPlainRecord(item.params)
      ? {
          ...item.params,
          managerComment: managerCommentPayloadValue
        }
      : {
          managerComment: managerCommentPayloadValue
        }
  };
}

function getDraftOrderItemQuantityLabel(item: DraftOrderItem) {
  const quantity = Number(item.quantity);

  if (Number.isFinite(quantity) && quantity > 0) {
    return `${quantity} шт.`;
  }

  return "1 шт.";
}

function isDtfQuoteRequestItem(item: DraftOrderItem) {
  const totalPriceMinor = Number(item.totalPriceMinor ?? item.priceMinor);

  return item.serviceType === "dtf-print" && Number.isFinite(totalPriceMinor) && totalPriceMinor === 0;
}

function isDtfQuoteRequestOrder(draftOrder: DraftOrder) {
  return draftOrder.totalPriceMinor === 0 && draftOrder.items.some(isDtfQuoteRequestItem);
}

function hasDtfPrintItem(draftOrder: DraftOrder) {
  return draftOrder.items.some((item) => item.serviceType === "dtf-print");
}

const ozonPaymentStatusLabels: Record<string, string> = {
  authorized: "Авторизована",
  canceled: "Отменена",
  created: "Создана",
  disputed: "Спор",
  expired: "Истекла",
  failed: "Ошибка",
  paid: "Оплачена",
  partial_refund: "Частичный возврат",
  pending: "Ожидает оплаты",
  refunded: "Возврат",
  unknown: "Неизвестно"
};

function getOzonPaymentStatusLabel(status: string) {
  return ozonPaymentStatusLabels[status] ?? status;
}

function getLatestOzonPayment(payments: OrderPayment[]) {
  return payments.find((payment) => payment.provider === "ozon_pay_checkout") ?? null;
}

function isActiveOzonPayment(payment: OrderPayment | null) {
  return (
    payment?.status === "created" ||
    payment?.status === "pending"
  );
}

function isTerminalOzonPayment(payment: OrderPayment | null) {
  return (
    payment?.status === "failed" ||
    payment?.status === "canceled" ||
    payment?.status === "expired"
  );
}

function hasPaidOzonPayment(payments: OrderPayment[]) {
  return payments.some(
    (payment) =>
      payment.provider === "ozon_pay_checkout" &&
      (payment.status === "paid" || payment.status === "authorized")
  );
}

function getCdekFutureShipmentNotice(
  draftOrder: DraftOrder,
  payments: OrderPayment[]
) {
  if (isDraftOrderDeliveryNeedsReview(draftOrder)) {
    return "Перед созданием отправления проверьте и сохраните доставку.";
  }

  if (!hasPaidOzonPayment(payments)) {
    return "Отправление СДЭК будет создано позже, после оплаты заказа.";
  }

  return "Создание отправления СДЭК — следующий этап.";
}

function getOzonPaymentErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("OZON_ACQUIRING_NOT_CONFIGURED")) {
    return "Ozon Pay ещё не настроен на сервере.";
  }

  if (message.includes("DELIVERY_NEEDS_REVIEW")) {
    return "Проверьте и сохраните доставку перед созданием оплаты.";
  }

  return "Не удалось создать оплату Ozon.";
}

function getPaymentPreparationMessage(
  draftOrder: DraftOrder,
  payLink?: string | null
) {
  const orderNumber = draftOrder.serverOrderNumber ?? "заказа";

  if (draftOrder.totalPriceMinor <= 0) {
    return `Здравствуйте! Заявка №${orderNumber} принята. Менеджер уточнит стоимость и подготовит страницу оплаты Ozon Pay.`;
  }

  const amount = formatMinorPrice(draftOrder.totalPriceMinor, "RUB");

  if (payLink) {
    if (hasDtfPrintItem(draftOrder)) {
      return `Здравствуйте! Заявка №${orderNumber} по DTF-печати проверена. Стоимость печати: ${amount}. Для оплаты откройте страницу Ozon Pay: ${payLink}. На странице можно оплатить картой, СБП или Ozon картой. После поступления оплаты запускаем заказ в работу.`;
    }

    return `Здравствуйте! Заявка №${orderNumber} проверена. Стоимость заказа: ${amount}. Для оплаты откройте страницу Ozon Pay: ${payLink}. На странице можно оплатить картой, СБП или Ozon картой. После поступления оплаты запускаем заказ в работу.`;
  }

  if (hasDtfPrintItem(draftOrder)) {
    return `Здравствуйте! Заявка №${orderNumber} по DTF-печати проверена. Стоимость печати: ${amount}. Сейчас подготовим страницу оплаты Ozon Pay. После поступления оплаты запускаем заказ в работу.`;
  }

  return `Здравствуйте! Заявка №${orderNumber} проверена. Стоимость заказа: ${amount}. Сейчас подготовим страницу оплаты Ozon Pay. После поступления оплаты запускаем заказ в работу.`;
}

function getDraftOrderRequestComment(draftOrder: DraftOrder) {
  return draftOrder.requestComment?.trim() || draftOrder.customer?.comment?.trim() || "";
}

type DtfOrderInfo = {
  a3SheetCount: number | null;
  designNeedsEstimate: boolean;
  fileNames: string[];
  hasFiles: boolean;
  printTotalRub: number | null;
  requestKindLabel: string;
  unitPriceRub: number | null;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getDtfItemRecords(item: DraftOrderItem) {
  return [item.params, item.calculationSnapshot].filter(isPlainRecord);
}

function getDtfItemValue(item: DraftOrderItem, key: string) {
  const records = getDtfItemRecords(item);

  for (const record of records) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function getDtfStringValue(item: DraftOrderItem, key: string) {
  const value = getDtfItemValue(item, key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDtfNumberValue(item: DraftOrderItem, key: string) {
  const value = getDtfItemValue(item, key);
  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getDtfBooleanValue(item: DraftOrderItem, key: string) {
  const value = getDtfItemValue(item, key);

  return typeof value === "boolean" ? value : null;
}

function getDtfStringArrayValue(item: DraftOrderItem, key: string) {
  const value = getDtfItemValue(item, key);

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
}

function getDtfOrderInfo(draftOrder: DraftOrder): DtfOrderInfo | null {
  const item = draftOrder.items.find((orderItem) => orderItem.serviceType === "dtf-print");

  if (!item) {
    return null;
  }

  const fileNames = getDtfStringArrayValue(item, "fileNames");
  const unitPriceRub =
    getDtfNumberValue(item, "unitPriceRub") ??
    (Number.isFinite(Number(item.unitPriceMinor)) && Number(item.unitPriceMinor) > 0
      ? Number(item.unitPriceMinor) / 100
      : null);
  const printTotalRub =
    getDtfNumberValue(item, "printTotalRub") ??
    (Number.isFinite(Number(item.totalPriceMinor)) && Number(item.totalPriceMinor) > 0
      ? Number(item.totalPriceMinor) / 100
      : null);

  return {
    a3SheetCount: getDtfNumberValue(item, "a3SheetCount"),
    designNeedsEstimate:
      getDtfBooleanValue(item, "designNeedsEstimate") ??
      getDtfBooleanValue(item, "requiresEstimate") ??
      isDtfQuoteRequestItem(item),
    fileNames,
    hasFiles:
      getDtfBooleanValue(item, "hasFiles") ??
      getDtfBooleanValue(item, "hasFile") ??
      fileNames.length > 0,
    printTotalRub,
    requestKindLabel: getDtfStringValue(item, "requestKindLabel") ?? item.title,
    unitPriceRub
  };
}

function formatDtfRubValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "уточнит менеджер";
  }

  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }) + " ₽";
}

function getDraftOrderDisplayRequestComment(draftOrder: DraftOrder) {
  const comment = getDraftOrderRequestComment(draftOrder);

  if (!comment || !getDtfOrderInfo(draftOrder)) {
    return comment;
  }

  return comment
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;

      return ![
        "Тип обращения:",
        "Способ связи:",
        "Ответ по умолчанию:",
        "Ответ:",
        "Количество листов A3:",
        "Количество листов А3:",
        "Требуется оценка"
      ].some((prefix) => line.startsWith(prefix));
    })
    .join("\n");
}

function getDraftOrderRequestCommentTargetItemId(draftOrder: DraftOrder) {
  const comment = getDraftOrderDisplayRequestComment(draftOrder);

  if (!comment) {
    return null;
  }

  if (draftOrder.items.length === 1) {
    return draftOrder.items[0]?.id ?? null;
  }

  const dtfItems = draftOrder.items.filter(
    (item) => item.serviceType === "dtf-print"
  );

  if (getDtfOrderInfo(draftOrder) && dtfItems.length === 1) {
    return dtfItems[0].id;
  }

  const lightLetterItems = draftOrder.items.filter(
    (item) => item.serviceType === "light-letter"
  );

  if (dtfItems.length === 0 && lightLetterItems.length === 1) {
    return lightLetterItems[0].id;
  }

  return null;
}

function getDraftOrderItemDisplayComment(
  draftOrder: DraftOrder,
  item: DraftOrderItem
) {
  const itemComment = getDraftOrderItemCommentText(item);

  if (itemComment) {
    return itemComment;
  }

  return getDraftOrderRequestCommentTargetItemId(draftOrder) === item.id
    ? getDraftOrderDisplayRequestComment(draftOrder)
    : "";
}

function getDraftOrderFallbackComment(draftOrder: DraftOrder) {
  const comment = getDraftOrderDisplayRequestComment(draftOrder);

  if (!comment || getDraftOrderRequestCommentTargetItemId(draftOrder)) {
    return "";
  }

  return comment;
}

function getOrderSummaryCustomerLabel(order: OrderSummary) {
  const customerName = order.customerName?.trim();
  const customerPhone = order.customerPhone?.trim();

  if (customerName) {
    return customerName;
  }

  if (hasRussianPhoneDigits(customerPhone)) {
    return formatRussianPhone(customerPhone!);
  }

  return "Заказчик не заполнен";
}

function getOrderSummaryItemLabel(order: OrderSummary) {
  const firstItemTitle = order.firstItemTitle?.trim();

  if (firstItemTitle && order.itemsCount > 1) {
    return `${firstItemTitle} · + ещё ${order.itemsCount - 1}`;
  }

  return firstItemTitle || "Позиции не указаны";
}

function isDtfQuoteRequestSummary(order: OrderSummary) {
  return order.totalPriceMinor === 0 && /dtf/i.test(order.firstItemTitle ?? "");
}

const imageAttachmentExtensions = new Set(["gif", "jpeg", "jpg", "png", "webp"]);

function getAttachmentFileExtension(attachment: OrderAttachment) {
  const extension = attachment.originalFileName.split(".").pop()?.trim().toLowerCase();

  return extension && extension !== attachment.originalFileName.toLowerCase()
    ? extension
    : null;
}

function isImageAttachment(attachment: OrderAttachment) {
  const mimeType = attachment.mimeType?.toLowerCase() ?? "";

  return (
    mimeType.startsWith("image/") ||
    imageAttachmentExtensions.has(getAttachmentFileExtension(attachment) ?? "")
  );
}

function isPdfAttachment(attachment: OrderAttachment) {
  const mimeType = attachment.mimeType?.toLowerCase() ?? "";

  return (
    mimeType === "application/pdf" ||
    getAttachmentFileExtension(attachment) === "pdf"
  );
}

function isPreviewableAttachment(attachment: OrderAttachment) {
  return (
    isImageAttachment(attachment) ||
    Boolean(attachment.previewUrl && isPdfAttachment(attachment))
  );
}

function getAttachmentTypeLabel(attachmentType: string) {
  if (attachmentType === "design_file") {
    return "Макет";
  }

  if (attachmentType === "drawing") {
    return "Чертёж";
  }

  if (attachmentType === "reference") {
    return "Референс";
  }

  if (attachmentType === "placement_photo") {
    return "Фото места";
  }

  if (attachmentType === "print_file") {
    return "Файл заказа";
  }

  return "Файл заказа";
}

function getAttachmentFileKindLabel(attachment: OrderAttachment) {
  const fileName = attachment.originalFileName.trim();
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.trim().toUpperCase()
    : "";

  if (extension) {
    return extension.slice(0, 8);
  }

  if (attachment.mimeType === "application/pdf") {
    return "PDF";
  }

  if (attachment.mimeType === "text/plain") {
    return "TXT";
  }

  return "Файл";
}

function formatAttachmentFileSize(fileSize: number | null) {
  if (!fileSize || fileSize <= 0) {
    return "";
  }

  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / 1024 / 1024).toFixed(1)} МБ`;
  }

  if (fileSize >= 1024) {
    return `${Math.ceil(fileSize / 1024)} КБ`;
  }

  return `${fileSize} Б`;
}

function formatAttachmentCountLabel(count: number) {
  const normalizedCount = Math.max(0, count);
  const mod10 = normalizedCount % 10;
  const mod100 = normalizedCount % 100;
  const suffix =
    mod10 === 1 && mod100 !== 11
      ? "файл"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "файла"
        : "файлов";

  return `${normalizedCount} ${suffix}`;
}

function getAttachmentDraftItemAffinity(
  attachment: OrderAttachment
): DraftOrderItem["serviceType"] | null {
  if (attachment.attachmentType === "print_file") {
    return "dtf-print";
  }

  if (
    attachment.attachmentType === "design_file" ||
    attachment.attachmentType === "drawing" ||
    attachment.attachmentType === "reference" ||
    attachment.attachmentType === "placement_photo"
  ) {
    return "light-letter";
  }

  return null;
}

function getDraftOrderAttachmentBuckets(
  draftOrder: DraftOrder,
  attachments: OrderAttachment[]
) {
  const firstItemIdByServiceType = new Map<DraftOrderItem["serviceType"], string>();
  const attachmentsByItemId = new Map<string, OrderAttachment[]>();
  const unassignedAttachments: OrderAttachment[] = [];

  draftOrder.items.forEach((item) => {
    if (!firstItemIdByServiceType.has(item.serviceType)) {
      firstItemIdByServiceType.set(item.serviceType, item.id);
    }
  });

  attachments.forEach((attachment) => {
    const itemServiceType = getAttachmentDraftItemAffinity(attachment);
    const itemId = itemServiceType
      ? firstItemIdByServiceType.get(itemServiceType)
      : null;

    if (!itemId) {
      unassignedAttachments.push(attachment);
      return;
    }

    const itemAttachments = attachmentsByItemId.get(itemId) ?? [];
    itemAttachments.push(attachment);
    attachmentsByItemId.set(itemId, itemAttachments);
  });

  return {
    attachmentsByItemId,
    unassignedAttachments
  };
}

function isDraftOrderCustomerFilled(customer: DraftOrderCustomer | undefined) {
  return Boolean(customer?.name?.trim() || hasRussianPhoneDigits(customer?.phone));
}

function getDraftOrderDeliveryState(delivery: DraftOrderDelivery) {
  if (isDeliveryNotRequired({ delivery })) {
    return "not-required";
  }

  if (delivery.mode === "cdek") {
    return delivery.address?.trim() || delivery.priceMinor ? "filled" : "missing";
  }

  return delivery.address?.trim() ? "filled" : "missing";
}

function isDeliveryNotRequiredValue(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/_/g, "-");

  return (
    normalizedValue === "not-required" ||
    normalizedValue === "delivery not required"
  );
}

function isDeliveryNotRequired(orderOrDraft: unknown) {
  if (!orderOrDraft || typeof orderOrDraft !== "object") {
    return false;
  }

  const orderWithDelivery = orderOrDraft as {
    delivery?: {
      deliveryMode?: unknown;
      deliveryStatus?: unknown;
      delivery_status?: unknown;
      mode?: unknown;
      status?: unknown;
    } | null;
    deliveryMode?: unknown;
    deliveryStatus?: unknown;
    delivery_status?: unknown;
  };

  return [
    orderWithDelivery.delivery?.mode,
    orderWithDelivery.delivery?.status,
    orderWithDelivery.delivery?.deliveryMode,
    orderWithDelivery.delivery?.deliveryStatus,
    orderWithDelivery.delivery?.delivery_status,
    orderWithDelivery.deliveryMode,
    orderWithDelivery.deliveryStatus,
    orderWithDelivery.delivery_status
  ].some(isDeliveryNotRequiredValue);
}

function getOrderSummaryDeliveryState(
  order: OrderSummary,
  draftOrders: DraftOrder[]
) {
  const matchingDraftOrder = draftOrders.find(
    (draftOrder) => draftOrder.serverOrderId === order.id
  );

  if (matchingDraftOrder) {
    return getDraftOrderDeliveryState(matchingDraftOrder.delivery);
  }

  return isDeliveryNotRequired(order) ? "not-required" : "filled";
}

function normalizeDraftOrderDelivery(
  delivery:
    | (Partial<Omit<DraftOrderDelivery, "mode">> & {
        mode?: DeliveryMode | "required";
      })
    | undefined
): DraftOrderDelivery {
  const mode: DeliveryMode =
    delivery?.mode === "not-required"
      ? "not-required"
      : delivery?.mode === "cdek"
        ? "cdek"
        : "manual";

  return {
    address: delivery?.address,
    comment: delivery?.comment,
    contactName: delivery?.contactName,
    currencyCode: delivery?.currencyCode,
    mode,
    periodMax: delivery?.periodMax,
    periodMin: delivery?.periodMin,
    phone: delivery?.phone ? formatRussianPhone(delivery.phone) : undefined,
    priceMinor: delivery?.priceMinor,
    providerPayload: delivery?.providerPayload,
    tariffCode: delivery?.tariffCode,
    tariffName: delivery?.tariffName
  };
}

function getDraftOrderDisplayStatus(draftOrder: DraftOrder) {
  if (draftOrder.serverOrderId || draftOrder.serverOrderNumber) {
    return getDatabaseOrderDisplayStatus(draftOrder.databaseStatus ?? "new");
  }

  if (draftOrder.items.length === 0) {
    return "без позиций";
  }

  if (!isDraftOrderCustomerFilled(draftOrder.customer)) {
    return "нужен заказчик";
  }

  if (getDraftOrderDeliveryState(draftOrder.delivery) === "missing") {
    return "нужна доставка";
  }

  return "оформлен";
}

const orderWorkflowStatusOptions: Array<{
  label: string;
  value: OrderWorkflowStatus;
}> = [
  { label: "Новый", value: "new" },
  { label: "Подтверждён", value: "confirmed" },
  { label: "В работе", value: "in_work" },
  { label: "Готов", value: "ready" },
  { label: "Завершён", value: "completed" },
  { label: "Отменён", value: "canceled" }
];

function getDatabaseOrderDisplayStatus(status: string) {
  const statusLabels: Record<string, string> = Object.fromEntries(
    orderWorkflowStatusOptions.map((option) => [option.value, option.label])
  );

  return status === "draft" ? "Черновик" : statusLabels[status] ?? status;
}

function createDraftOrder(items: DraftOrderItem[] = []): DraftOrder {
  const now = new Date().toISOString();
  const delivery: DraftOrderDelivery = {
    mode: "manual"
  };

  return {
    id: `draft-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "receiving",
    delivery,
    items,
    totalPriceMinor: getDraftOrderGrandTotalMinor(items, delivery),
    createdAt: now,
    updatedAt: now
  };
}

function normalizeDraftOrder(draftOrder: DraftOrder): DraftOrder {
  const delivery = normalizeDraftOrderDelivery(draftOrder.delivery);

  return {
    ...draftOrder,
    delivery,
    totalPriceMinor: getDraftOrderGrandTotalMinor(draftOrder.items, delivery),
    updatedAt: new Date().toISOString()
  };
}

function loadDraftOrdersStorage(): DraftOrdersStorage {
  if (typeof window === "undefined") {
    return {
      activeDraftOrderId: null,
      draftOrders: []
    };
  }

  try {
    const rawValue = window.localStorage.getItem(DRAFT_ORDERS_STORAGE_KEY);

    if (!rawValue) {
      return {
        activeDraftOrderId: null,
        draftOrders: []
      };
    }

    const parsedValue = JSON.parse(rawValue) as Partial<DraftOrdersStorage>;
    const draftOrders = Array.isArray(parsedValue.draftOrders)
      ? parsedValue.draftOrders
          .filter((draftOrder): draftOrder is DraftOrder => {
            return (
              typeof draftOrder?.id === "string" &&
              (draftOrder.status === "receiving" ||
                draftOrder.status === "awaiting-details") &&
              Array.isArray(draftOrder.items)
            );
          })
          .map((draftOrder) => {
            const delivery = normalizeDraftOrderDelivery(draftOrder.delivery);

            return {
              ...draftOrder,
              delivery,
              totalPriceMinor: getDraftOrderGrandTotalMinor(
                draftOrder.items,
                delivery
              )
            };
          })
      : [];
    const activeDraftOrderId =
      typeof parsedValue.activeDraftOrderId === "string" &&
      draftOrders.some((draftOrder) => draftOrder.id === parsedValue.activeDraftOrderId)
        ? parsedValue.activeDraftOrderId
        : draftOrders.find((draftOrder) => draftOrder.status === "receiving")?.id ??
          null;

    return {
      activeDraftOrderId,
      draftOrders
    };
  } catch {
    return {
      activeDraftOrderId: null,
      draftOrders: []
    };
  }
}

function formatPurchasePrice(value: number, currencyCode: string) {
  const currencyLabel = currencyCode === "RUB" ? "₽" : currencyCode;

  return `${(value / 100).toLocaleString("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  })} ${currencyLabel}`;
}

function formatPurchasePriceInput(value: number) {
  return (value / 100).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

function parsePurchasePriceInput(value: string) {
  const normalizedValue = value
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.round(parsedValue * 100);
}

const DTF_A3_WIDTH_CM = 30;
const DTF_A3_HEIGHT_CM = 40;
const DTF_A3_AREA_M2 = 0.3 * 0.4;

function parsePositiveNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDtfItemOriginalWidthCm(item: DraftOrderItem) {
  const widthCm = Number(item.widthCm);
  return Number.isFinite(widthCm) && widthCm > 0
    ? widthCm
    : getDtfNumberValue(item, "widthCm") ?? DTF_A3_WIDTH_CM;
}

function getDtfItemOriginalHeightCm(item: DraftOrderItem) {
  const heightCm = Number(item.heightCm);
  return Number.isFinite(heightCm) && heightCm > 0
    ? heightCm
    : getDtfNumberValue(item, "heightCm") ?? DTF_A3_HEIGHT_CM;
}

function getDtfItemSavedUnitPriceMinor(item: DraftOrderItem | null) {
  if (!item) {
    return null;
  }

  const directUnitPriceMinor = Number(item.unitPriceMinor);

  if (Number.isFinite(directUnitPriceMinor) && directUnitPriceMinor > 0) {
    return Math.round(directUnitPriceMinor);
  }

  const payloadUnitPriceMinor = getDtfNumberValue(item, "unitPriceMinor");

  if (payloadUnitPriceMinor && payloadUnitPriceMinor > 0) {
    return Math.round(payloadUnitPriceMinor);
  }

  const payloadUnitPriceRub = getDtfNumberValue(item, "unitPriceRub");

  if (payloadUnitPriceRub && payloadUnitPriceRub > 0) {
    return Math.round(payloadUnitPriceRub * 100);
  }

  const quantity = Number(item.quantity);
  const totalPriceMinor = Number(item.totalPriceMinor ?? item.priceMinor);

  if (
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(totalPriceMinor) &&
    totalPriceMinor > 0
  ) {
    return Math.round(totalPriceMinor / quantity);
  }

  return null;
}

function isSameDtfFormat(
  item: DraftOrderItem,
  widthCm: number,
  heightCm: number
) {
  return (
    Math.abs(getDtfItemOriginalWidthCm(item) - widthCm) < 0.001 &&
    Math.abs(getDtfItemOriginalHeightCm(item) - heightCm) < 0.001
  );
}

function isSameDtfCalculation(
  item: DraftOrderItem,
  result: DtfPrintCalculationResult
) {
  return (
    isSameDtfFormat(item, result.widthCm, result.heightCm) &&
    Number(item.quantity ?? 1) === result.quantity &&
    Number(item.priceMinor) === result.priceMinor &&
    Number(item.totalPriceMinor ?? item.priceMinor) === result.priceMinor
  );
}

function formatCompactNumber(value: number) {
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1
  });
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU");
}

function formatAreaM2(value: number) {
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3
  });
}

function getMaterialText(material: Material) {
  return `${material.name} ${material.description ?? ""}`.trim();
}

function getUniqueMatches(value: string, pattern: RegExp) {
  return Array.from(
    new Set(Array.from(value.matchAll(pattern), (match) => match[0].trim()))
  );
}

function formatMaterialParameters(material: Material) {
  const source = getMaterialText(material);
  const lowerCategory = material.category_name?.toLowerCase() ?? "";
  const parts: string[] = [];
  const ralMatch = source.match(/RAL\s*\d{4}/i);
  const mmMatches = getUniqueMatches(source, /\d+(?:[.,]\d+)?\s*мм/gi);
  const meterMatches = getUniqueMatches(source, /\d+(?:[.,]\d+)?\s*м\b/gi);
  const literMatches = getUniqueMatches(source, /\d+(?:[.,]\d+)?\s*л\b/gi);
  const kgMatches = getUniqueMatches(source, /\d+(?:[.,]\d+)?\s*кг\b/gi);

  if (ralMatch) {
    parts.push(ralMatch[0].replace(/\s+/, " ").toUpperCase());
  }

  if (lowerCategory.includes("борт")) {
    parts.push(...mmMatches.slice(0, 2));
  } else if (lowerCategory.includes("рулон") || lowerCategory.includes("баннер")) {
    parts.push(...mmMatches.slice(0, 1), ...meterMatches.slice(0, 1));
  } else if (lowerCategory.includes("лист")) {
    parts.push(...mmMatches.slice(0, 3));
  } else if (lowerCategory.includes("жид")) {
    parts.push(...literMatches.slice(0, 1));
  } else {
    parts.push(
      ...mmMatches.slice(0, 2),
      ...meterMatches.slice(0, 1),
      ...literMatches.slice(0, 1),
      ...kgMatches.slice(0, 1)
    );
  }

  return Array.from(new Set(parts)).join(" · ") || "—";
}

function getMaterialPrimaryPrice(pricingInputs: MaterialPricingInput[] | undefined) {
  return pricingInputs?.[0] ?? null;
}

function formatUnitLabel(unitCode: string | null | undefined) {
  switch (unitCode) {
    case "sheet":
      return "лист";
    case "lm":
      return "пог. м";
    case "sqm":
    case "m2":
      return "м²";
    case "l":
    case "liter":
      return "л";
    case "kg":
      return "кг";
    case "g":
      return "г";
    case "bottle":
      return "бут.";
    case "roll":
      return "рул.";
    case "pcs":
    case "piece":
      return "шт.";
    default:
      return unitCode || "—";
  }
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
  const authCodeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const skipMaterialPriceBlurSaveRef = useRef(false);
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceName>("Диез Имидж");
  const [activeSection, setActiveSection] = useState("Главная");
  const [activeSettingsSection, setActiveSettingsSection] = useState(
    settingsHomeSection
  );
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authPhone, setAuthPhone] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isRestoringAuth, setIsRestoringAuth] = useState(true);
  const [serverOrders, setServerOrders] = useState<OrderSummary[]>([]);
  const [serverOrdersStatus, setServerOrdersStatus] = useState<string | null>(
    null
  );
  const [isServerOrdersLoading, setIsServerOrdersLoading] = useState(false);
  const [orderDetailStatus, setOrderDetailStatus] = useState<string | null>(null);
  const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false);
  const [paymentPreparationDraftOrderId, setPaymentPreparationDraftOrderId] =
    useState<string | null>(null);
  const [paymentPreparationStatus, setPaymentPreparationStatus] = useState<
    string | null
  >(null);
  const [orderPaymentsByOrderId, setOrderPaymentsByOrderId] = useState<
    Record<number, OrderPayment[]>
  >({});
  const [orderPaymentsStatusByOrderId, setOrderPaymentsStatusByOrderId] =
    useState<Record<number, string>>({});
  const [orderPaymentActionByOrderId, setOrderPaymentActionByOrderId] = useState<
    Record<number, "cancel" | "create" | "sync" | undefined>
  >({});
  const [orderAttachmentsByOrderId, setOrderAttachmentsByOrderId] = useState<
    Record<number, OrderAttachment[]>
  >({});
  const [attachmentPreviewUrlById, setAttachmentPreviewUrlById] = useState<
    Record<number, string>
  >({});
  const attachmentPreviewUrlByIdRef = useRef<Record<number, string>>({});
  const [attachmentsStatusByOrderId, setAttachmentsStatusByOrderId] = useState<
    Record<number, string>
  >({});
  const [lastDownloadedFilePathByOrderId, setLastDownloadedFilePathByOrderId] =
    useState<Record<number, string>>({});
  const [uploadingAttachmentOrderId, setUploadingAttachmentOrderId] =
    useState<number | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    attachment: OrderAttachment;
    objectUrl: string | null;
  } | null>(null);
  const attachmentPreviewObjectUrlRef = useRef<string | null>(null);
  const [serverConnectionState, setServerConnectionState] = useState<
    "connected" | "disconnected"
  >("disconnected");
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [materialPricingInputsById, setMaterialPricingInputsById] = useState<
    Record<number, MaterialPricingInput[]>
  >({});
  const [editingMaterialPrice, setEditingMaterialPrice] = useState<{
    materialId: number;
    value: string;
  } | null>(null);
  const [savingMaterialPriceId, setSavingMaterialPriceId] = useState<number | null>(
    null
  );
  const [materialPriceErrorById, setMaterialPriceErrorById] = useState<
    Record<number, string>
  >({});
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
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
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>(
    () => loadDraftOrdersStorage().draftOrders
  );
  const [activeDraftOrderId, setActiveDraftOrderId] = useState<string | null>(
    () => loadDraftOrdersStorage().activeDraftOrderId
  );
  const [selectedDraftOrderId, setSelectedDraftOrderId] = useState<string | null>(
    null
  );
  const [draftOrderSaveStatusById, setDraftOrderSaveStatusById] = useState<
    Record<string, string>
  >({});
  const [addedDraftItemFeedback, setAddedDraftItemFeedback] =
    useState<AddedDraftItemFeedback | null>(null);
  const addedDraftItemFeedbackTimerRef = useRef<number | null>(null);
  const [pendingDeleteOrderId, setPendingDeleteOrderId] = useState<string | null>(
    null
  );
  const [pendingDeleteOrderTitle, setPendingDeleteOrderTitle] = useState<
    string | null
  >(null);
  const [pendingDeleteOrderDescription, setPendingDeleteOrderDescription] =
    useState<string | null>(null);
  const [pendingDeleteOrderError, setPendingDeleteOrderError] = useState<
    string | null
  >(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [draftOrderPanelMode, setDraftOrderPanelMode] =
    useState<DraftOrderPanelMode>("details");
  const [draftOrderCustomerForm, setDraftOrderCustomerForm] =
    useState<DraftOrderCustomerForm>({
      comment: "",
      email: "",
      name: "",
      phone: ""
    });
  const [draftOrderDeliveryForm, setDraftOrderDeliveryForm] =
    useState<DraftOrderDeliveryForm>({
      address: "",
      comment: "",
      contactName: "",
      mode: "manual",
      phone: ""
    });
  const [cdekPanelState, setCdekPanelState] = useState<CdekPanelState>(() =>
    createDefaultCdekPanelState()
  );
  const cdekSenderCitySearchSeqRef = useRef(0);
  const cdekRecipientCitySearchSeqRef = useRef(0);
  const [editingDraftOrderItemId, setEditingDraftOrderItemId] = useState<
    string | null
  >(null);
  const [managerCommentDraft, setManagerCommentDraft] = useState("");
  const [managerCommentEditorDraft, setManagerCommentEditorDraft] =
    useState("");
  const [isManagerCommentEditorOpen, setIsManagerCommentEditorOpen] =
    useState(false);
  const [isDraftJsonVisible, setIsDraftJsonVisible] = useState(false);
  const [officeConstructorForm, setOfficeConstructorForm] =
    useState<OfficeConstructorForm>(() => createDefaultOfficeConstructorForm());
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
    getApiHealth()
      .then((healthResult) => {
        setHealth(healthResult);
      })
      .catch(() => {
        setHealth(null);
      });

    getMaterials()
      .then((materialsResult) => {
        setMaterials(materialsResult);
        setSelectedMaterialId(materialsResult[0]?.id ?? null);
        setError(null);
      })
      .catch((unknownError) => {
        setMaterials([]);
        setSelectedMaterialId(null);
        setError(
          unknownError instanceof Error
            ? `Материалы недоступны: ${unknownError.message}`
            : "Материалы временно недоступны"
        );
      });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(attachmentPreviewUrlByIdRef.current).forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });

      if (attachmentPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(attachmentPreviewObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const rememberedAuth = readRememberedAuth();
    const rememberedPhone = window.localStorage.getItem(REMEMBERED_PHONE_STORAGE_KEY);

    if (rememberedPhone) {
      setAuthPhone(formatRussianPhone(rememberedPhone));
    }

    if (!rememberedAuth) {
      setIsRestoringAuth(false);
      return () => {
        isCurrent = false;
      };
    }

    const rememberedSession = rememberedAuth;

    setAuthStatus("Проверяем вход...");

    async function restoreAuth() {
      try {
        const currentUser = await getCurrentUser(rememberedSession.token);

        if (!isCurrent) {
          return;
        }

        setAuthToken(rememberedSession.token);
        setAuthUser(currentUser.user);
        setAuthPhone(formatRussianPhone(rememberedSession.phone));
        setAuthStatus(null);
        await loadServerOrders(rememberedSession.token);
      } catch {
        clearRememberedAuth();

        if (!isCurrent) {
          return;
        }

        setAuthToken(null);
        setAuthUser(null);
        setServerOrders([]);
        setServerOrdersStatus(null);
        setServerConnectionState("disconnected");
        setAuthStatus("Сессия истекла. Введите код снова.");
      } finally {
        if (isCurrent) {
          setIsRestoringAuth(false);
        }
      }
    }

    void restoreAuth();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!authToken || !authUser || isRestoringAuth) {
      return;
    }

    let isCurrent = true;

    const refreshServerOrders = () => {
      if (isCurrent) {
        void loadServerOrders(authToken);
      }
    };

    window.addEventListener("focus", refreshServerOrders);
    const refreshIntervalId = window.setInterval(refreshServerOrders, 30_000);

    refreshServerOrders();

    return () => {
      isCurrent = false;
      window.removeEventListener("focus", refreshServerOrders);
      window.clearInterval(refreshIntervalId);
    };
  }, [authToken, authUser, isRestoringAuth]);

  useEffect(() => {
    if (materials.length === 0) {
      setMaterialPricingInputsById({});
      return;
    }

    let isCurrent = true;

    Promise.allSettled(
      materials.map(async (material) => {
        const result = await getMaterialPricingInputs(material.id);
        return [material.id, result] as const;
      })
    ).then((results) => {
      if (!isCurrent) {
        return;
      }

      const nextPricingInputsById: Record<number, MaterialPricingInput[]> = {};

      for (const result of results) {
        if (result.status === "fulfilled") {
          const [materialId, materialPricingInputs] = result.value;
          nextPricingInputsById[materialId] = materialPricingInputs;
        }
      }

      setMaterialPricingInputsById(nextPricingInputsById);
    });

    return () => {
      isCurrent = false;
    };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesCategory =
        selectedMaterialCategory === "Все" ||
        (material.category_name ?? "Без категории") === selectedMaterialCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        material.name,
        material.description,
        material.category_name,
        material.unit_code,
        material.unit_name,
        formatMaterialParameters(material)
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [materials, query, selectedMaterialCategory]);

  const materialCategoryFilters = useMemo(() => {
    const categories = Array.from(
      new Set(
        materials.map((material) => material.category_name ?? "Без категории")
      )
    ).sort((first, second) => first.localeCompare(second, "ru"));

    return ["Все", ...categories];
  }, [materials]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DRAFT_ORDERS_STORAGE_KEY,
      JSON.stringify({
        activeDraftOrderId,
        draftOrders
      } satisfies DraftOrdersStorage)
    );
  }, [activeDraftOrderId, draftOrders]);

  useEffect(() => {
    return () => {
      if (addedDraftItemFeedbackTimerRef.current !== null) {
        window.clearTimeout(addedDraftItemFeedbackTimerRef.current);
      }
    };
  }, []);

  const activeDraftOrder = useMemo(() => {
    return draftOrders.find((draftOrder) => draftOrder.id === activeDraftOrderId) ?? null;
  }, [activeDraftOrderId, draftOrders]);
  const detailDraftOrder = useMemo(() => {
    return (
      draftOrders.find((draftOrder) => draftOrder.id === selectedDraftOrderId) ??
      activeDraftOrder
    );
  }, [activeDraftOrder, draftOrders, selectedDraftOrderId]);
  const editingDraftOrderItem = useMemo(() => {
    if (!editingDraftOrderItemId) {
      return null;
    }

    return (
      draftOrders
        .flatMap((draftOrder) => draftOrder.items)
        .find((item) => item.id === editingDraftOrderItemId) ?? null
    );
  }, [draftOrders, editingDraftOrderItemId]);
  const detailDraftOrderAttachmentBuckets = useMemo(() => {
    if (!detailDraftOrder?.serverOrderId) {
      return null;
    }

    return getDraftOrderAttachmentBuckets(
      detailDraftOrder,
      orderAttachmentsByOrderId[detailDraftOrder.serverOrderId] ?? []
    );
  }, [detailDraftOrder, orderAttachmentsByOrderId]);
  const editingDraftOrderItemAttachments = useMemo(() => {
    if (!editingDraftOrderItemId) {
      return [];
    }

    const draftOrder = draftOrders.find((currentDraftOrder) =>
      currentDraftOrder.items.some((item) => item.id === editingDraftOrderItemId)
    );

    if (!draftOrder?.serverOrderId) {
      return [];
    }

    const buckets = getDraftOrderAttachmentBuckets(
      draftOrder,
      orderAttachmentsByOrderId[draftOrder.serverOrderId] ?? []
    );

    return buckets.attachmentsByItemId.get(editingDraftOrderItemId) ?? [];
  }, [draftOrders, editingDraftOrderItemId, orderAttachmentsByOrderId]);
  const editingDraftOrderItemComment = useMemo(() => {
    if (!editingDraftOrderItemId) {
      return "";
    }

    const draftOrder = draftOrders.find((currentDraftOrder) =>
      currentDraftOrder.items.some((item) => item.id === editingDraftOrderItemId)
    );
    const item = draftOrder?.items.find(
      (draftItem) => draftItem.id === editingDraftOrderItemId
    );

    if (!draftOrder || !item) {
      return "";
    }

    return getDraftOrderItemDisplayComment(draftOrder, item);
  }, [draftOrders, editingDraftOrderItemId]);
  useEffect(() => {
    if (!editingDraftOrderItemId) {
      setManagerCommentDraft("");
      setManagerCommentEditorDraft("");
      setIsManagerCommentEditorOpen(false);
    }
  }, [editingDraftOrderItemId]);
  useEffect(() => {
    setCdekPanelState(
      createDefaultCdekPanelState(
        getDefaultCdekCargoDescription(detailDraftOrder ?? undefined)
      )
    );
  }, [detailDraftOrder, selectedDraftOrderId]);
  useEffect(() => {
    if (
      draftOrderPanelMode !== "delivery" ||
      draftOrderDeliveryForm.mode !== "cdek" ||
      !authToken ||
      cdekPanelState.status
    ) {
      return;
    }

    let isCurrent = true;

    setCdekPanelState((current) => ({
      ...current,
      isLoadingStatus: true,
      message: null
    }));

    void (async () => {
      try {
        const status = await getCdekStatus(authToken);

        if (!isCurrent) {
          return;
        }

        setCdekPanelState((current) => ({
          ...current,
          message: getCdekStatusMessage(status),
          status
        }));
      } catch (unknownError) {
        if (!isCurrent) {
          return;
        }

        setCdekPanelState((current) => ({
          ...current,
          message: getCdekUiErrorMessage(unknownError)
        }));
      } finally {
        if (isCurrent) {
          setCdekPanelState((current) => ({
            ...current,
            isLoadingStatus: false
          }));
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [
    authToken,
    cdekPanelState.status,
    draftOrderDeliveryForm.mode,
    draftOrderPanelMode
  ]);
  useEffect(() => {
    if (
      draftOrderPanelMode !== "delivery" ||
      draftOrderDeliveryForm.mode !== "cdek" ||
      cdekPanelState.activePicker !== "senderCity"
    ) {
      return;
    }

    const cityName = cdekPanelState.senderCityQuery.trim();

    if (cityName.length < 2) {
      setCdekPanelState((current) => ({
        ...current,
        hasSearchedSenderCities: false,
        isLoadingSenderCities: false,
        senderCityResults: []
      }));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSearchCdekSenderCities(cityName);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    cdekPanelState.activePicker,
    cdekPanelState.senderCityQuery,
    draftOrderDeliveryForm.mode,
    draftOrderPanelMode
  ]);
  useEffect(() => {
    if (
      draftOrderPanelMode !== "delivery" ||
      draftOrderDeliveryForm.mode !== "cdek" ||
      cdekPanelState.activePicker !== "recipientCity"
    ) {
      return;
    }

    const cityName = cdekPanelState.cityQuery.trim();

    if (cityName.length < 2) {
      setCdekPanelState((current) => ({
        ...current,
        cityResults: [],
        hasSearchedCities: false,
        isLoadingCities: false
      }));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSearchCdekCities(cityName);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    cdekPanelState.activePicker,
    cdekPanelState.cityQuery,
    draftOrderDeliveryForm.mode,
    draftOrderPanelMode
  ]);
  useEffect(() => {
    if (
      draftOrderPanelMode !== "delivery" ||
      draftOrderDeliveryForm.mode !== "cdek"
    ) {
      return;
    }

    const fingerprint = getCdekTariffRequestFingerprint(cdekPanelState);

    if (!fingerprint) {
      if (
        cdekPanelState.tariffResults.length > 0 ||
        cdekPanelState.selectedTariff ||
        cdekPanelState.tariffResultsFingerprint
      ) {
        setCdekPanelState((current) => ({
          ...current,
          calculationResult: null,
          selectedTariff: null,
          tariffCode: "",
          tariffRequestFingerprint: null,
          tariffResults: [],
          tariffResultsFingerprint: null
        }));
      }
      return;
    }

    if (
      cdekPanelState.isLoadingTariffs ||
      cdekPanelState.tariffRequestFingerprint === fingerprint ||
      cdekPanelState.tariffResultsFingerprint === fingerprint
    ) {
      return;
    }

    void handleLoadCdekTariffs(fingerprint);
  }, [
    cdekPanelState.cityQuery,
    cdekPanelState.deliveryPointResults,
    cdekPanelState.isLoadingTariffs,
    cdekPanelState.packages,
    cdekPanelState.selectedCity,
    cdekPanelState.selectedDeliveryPoint,
    cdekPanelState.selectedSenderCity,
    cdekPanelState.selectedSenderDeliveryPoint,
    cdekPanelState.senderCityQuery,
    cdekPanelState.tariffRequestFingerprint,
    cdekPanelState.tariffResults.length,
    cdekPanelState.tariffResultsFingerprint,
    draftOrderDeliveryForm.mode,
    draftOrderPanelMode
  ]);
  const paymentPreparationDraftOrder = useMemo(() => {
    return (
      draftOrders.find(
        (draftOrder) => draftOrder.id === paymentPreparationDraftOrderId
      ) ?? null
    );
  }, [draftOrders, paymentPreparationDraftOrderId]);
  const paymentPreparationOzonPayment = useMemo(() => {
    if (!paymentPreparationDraftOrder?.serverOrderId) {
      return null;
    }

    if (isDraftOrderDeliveryNeedsReview(paymentPreparationDraftOrder)) {
      return null;
    }

    return getLatestOzonPayment(
      orderPaymentsByOrderId[paymentPreparationDraftOrder.serverOrderId] ?? []
    );
  }, [orderPaymentsByOrderId, paymentPreparationDraftOrder]);

  const localDraftOrders = useMemo(
    () =>
      draftOrders.filter(
        (draftOrder) => !draftOrder.serverOrderId && !draftOrder.serverOrderNumber
      ),
    [draftOrders]
  );
  const draftOrderItems = activeDraftOrder?.items ?? [];
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
    const editingDtfItem =
      editingDraftOrderItem?.serviceType === "dtf-print"
        ? editingDraftOrderItem
        : null;
    const savedUnitPriceMinor =
      editingDtfItem && isSameDtfFormat(editingDtfItem, widthCm, heightCm)
        ? getDtfItemSavedUnitPriceMinor(editingDtfItem)
        : null;
    const unitPriceMinor =
      savedUnitPriceMinor ??
      (() => {
        const baseBreakdown = calculateDtfA3PrintCostBreakdown({
          commercialMarginPercent: 10,
          printCount: 1
        });

        return Math.round(
          baseBreakdown.totalPricePerPrintMinor * (areaM2 / DTF_A3_AREA_M2)
        );
      })();
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
  }, [
    dtfPrintForm.heightCm,
    dtfPrintForm.quantity,
    dtfPrintForm.widthCm,
    editingDraftOrderItem
  ]);

  useEffect(() => {
    if (!isConstructorPanelOpen) {
      setConstructorPreviewMarkup(null);
      setConstructorPreviewError(null);
      setConstructorLayout(null);
      return;
    }

    if (!officeConstructorForm.text.trim()) {
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
  const isSettingsHomeScreen =
    activeWorkspace === "Диез Имидж" &&
    activeSection === "Настройки" &&
    activeSettingsSection === settingsHomeSection;
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

  function handleStartMaterialPriceEdit(
    materialId: number,
    pricingInput: MaterialPricingInput
  ) {
    setMaterialPriceErrorById((current) => {
      const nextErrors = { ...current };
      delete nextErrors[materialId];
      return nextErrors;
    });
    setEditingMaterialPrice({
      materialId,
      value: formatPurchasePriceInput(pricingInput.purchase_price_minor)
    });
  }

  function handleCancelMaterialPriceEdit() {
    setEditingMaterialPrice(null);
  }

  async function handleSaveMaterialPriceEdit(materialId: number) {
    const currentEdit = editingMaterialPrice;

    if (!currentEdit || currentEdit.materialId !== materialId) {
      return;
    }

    const purchasePriceMinor = parsePurchasePriceInput(currentEdit.value);

    if (purchasePriceMinor === null) {
      setMaterialPriceErrorById((current) => ({
        ...current,
        [materialId]: "Некорректная цена"
      }));
      return;
    }

    const currentPricingInput = getMaterialPrimaryPrice(
      materialPricingInputsById[materialId]
    );

    if (currentPricingInput?.purchase_price_minor === purchasePriceMinor) {
      setEditingMaterialPrice(null);
      return;
    }

    setSavingMaterialPriceId(materialId);
    setMaterialPriceErrorById((current) => {
      const nextErrors = { ...current };
      delete nextErrors[materialId];
      return nextErrors;
    });

    try {
      const updatedPricingInputs = await updateMaterialPurchasePrice(
        materialId,
        purchasePriceMinor
      );

      setMaterialPricingInputsById((current) => ({
        ...current,
        [materialId]: updatedPricingInputs
      }));

      setEditingMaterialPrice(null);
    } catch {
      setMaterialPriceErrorById((current) => ({
        ...current,
        [materialId]: "Не удалось сохранить цену"
      }));
    } finally {
      setSavingMaterialPriceId(null);
    }
  }

  function openServiceSelectionForDraft(draftOrderId: string | null) {
    setActiveWorkspace("Диез Имидж");
    setActiveSection("Заказы");
    setActiveDraftOrderId(draftOrderId);
    setSelectedDraftOrderId(null);
    setIsNewOrderFormOpen(true);
    setIsDraftOrderDetailsOpen(false);
    setNewOrderStep("start");
    setIsConstructorPanelOpen(false);
    setEditingDraftOrderItemId(null);
    setDtfPrintForm({
      heightCm: String(DTF_A3_HEIGHT_CM),
      quantity: "1",
      widthCm: String(DTF_A3_WIDTH_CM)
    });
  }

  function finalizeDraftOrder(draftOrderId: string) {
    setDraftOrders((orders) =>
      orders.map((draftOrder) =>
        draftOrder.id === draftOrderId &&
        draftOrder.status === "receiving" &&
        draftOrder.items.length > 0
          ? normalizeDraftOrder({
              ...draftOrder,
              status: "awaiting-details"
            })
          : draftOrder
      )
    );
    setActiveDraftOrderId((current) =>
      current === draftOrderId ? null : current
    );
  }

  async function syncSavedDraftOrder(draftOrder: DraftOrder) {
    if (!draftOrder.serverOrderId) {
      return;
    }

    if (!authToken) {
      setDraftOrderSaveStatusById((current) => ({
        ...current,
        [draftOrder.id]: "Нет подключения к серверу"
      }));
      return;
    }

    setDraftOrderSaveStatusById((current) => ({
      ...current,
      [draftOrder.id]: "Сохраняем изменения..."
    }));

    try {
      const result = await updateOrderFromDraft(
        draftOrder.serverOrderId,
        draftOrder,
        authToken
      );
      const savedAt = new Date().toISOString();

      setDraftOrders((orders) =>
        orders.map((currentDraftOrder) =>
          currentDraftOrder.id === draftOrder.id
            ? {
                ...currentDraftOrder,
                delivery: result.deliveryNeedsReview
                  ? {
                      ...currentDraftOrder.delivery,
                      providerPayload: {
                        ...(typeof currentDraftOrder.delivery.providerPayload ===
                          "object" &&
                        currentDraftOrder.delivery.providerPayload !== null &&
                        !Array.isArray(currentDraftOrder.delivery.providerPayload)
                          ? currentDraftOrder.delivery.providerPayload
                          : {}),
                        needsReview: true,
                        needsReviewReason: "order_items_changed"
                      }
                    }
                  : currentDraftOrder.delivery,
                serverOrderNumber: result.orderNumber,
                serverOrderSavedAt: savedAt
              }
            : currentDraftOrder
        )
      );
      setDraftOrderSaveStatusById((current) => ({
        ...current,
        [draftOrder.id]: result.deliveryNeedsReview
          ? "Изменения сохранены. Проверьте вес/габариты и сохраните доставку перед оплатой."
          : result.ozonPaymentAutoCanceled
            ? "Изменения сохранены. Старая Ozon-оплата отменена, потому что сумма заказа изменилась. Создайте новую ссылку на оплату вручную."
            : "Изменения сохранены"
      }));
      if (result.ozonPaymentAutoCanceled) {
        void loadOrderPayments(draftOrder.serverOrderId);
      }
      await loadServerOrders(authToken);
    } catch (error) {
      setDraftOrderSaveStatusById((current) => ({
        ...current,
        [draftOrder.id]: `Не удалось сохранить изменения: ${
          error instanceof Error ? error.message : "неизвестная ошибка"
        }`
      }));
    }
  }

  function showDraftItemAddedFeedback(
    draftOrderId: string,
    item: DraftOrderItem
  ) {
    if (addedDraftItemFeedbackTimerRef.current !== null) {
      window.clearTimeout(addedDraftItemFeedbackTimerRef.current);
    }

    setAddedDraftItemFeedback({
      draftOrderId,
      itemPriceLabel: formatMinorPrice(item.priceMinor, item.currencyCode ?? "RUB"),
      itemServiceType: item.serviceType,
      itemTitle: item.title
    });

    addedDraftItemFeedbackTimerRef.current = window.setTimeout(() => {
      setAddedDraftItemFeedback(null);
      addedDraftItemFeedbackTimerRef.current = null;
    }, 2500);
  }

  function resetManagerCommentEditor() {
    setManagerCommentDraft("");
    setManagerCommentEditorDraft("");
    setIsManagerCommentEditorOpen(false);
  }

  function addDraftOrderItem(item: DraftOrderItem) {
    const currentActiveDraftOrder = draftOrders.find(
      (draftOrder) => draftOrder.id === activeDraftOrderId
    );

    if (!currentActiveDraftOrder) {
      const nextDraftOrder = createDraftOrder([item]);
      setDraftOrders((orders) => [...orders, nextDraftOrder]);
      setActiveDraftOrderId(nextDraftOrder.id);
      showDraftItemAddedFeedback(nextDraftOrder.id, item);
      resetManagerCommentEditor();
      return;
    }

    const nextDraftOrder = normalizeDraftOrder({
      ...currentActiveDraftOrder,
      items: [...currentActiveDraftOrder.items, item]
    });

    setDraftOrders((orders) =>
      orders.map((draftOrder) =>
        draftOrder.id === currentActiveDraftOrder.id
          ? nextDraftOrder
          : draftOrder
      )
    );
    void syncSavedDraftOrder(nextDraftOrder);
    showDraftItemAddedFeedback(nextDraftOrder.id, item);
    resetManagerCommentEditor();
  }

  function updateDraftOrderItem(itemId: string, nextItem: DraftOrderItem) {
    const currentDraftOrder = draftOrders.find((draftOrder) =>
      draftOrder.items.some((item) => item.id === itemId)
    );

    if (!currentDraftOrder) {
      return;
    }

    const nextDraftOrder = normalizeDraftOrder({
      ...currentDraftOrder,
      items: currentDraftOrder.items.map((item) =>
        item.id === itemId ? nextItem : item
      )
    });

    setDraftOrders((orders) =>
      orders.map((draftOrder) =>
        draftOrder.id === currentDraftOrder.id ? nextDraftOrder : draftOrder
      )
    );
    void syncSavedDraftOrder(nextDraftOrder);
  }

  function updateDraftOrder(
    draftOrderId: string,
    update: (draftOrder: DraftOrder) => DraftOrder
  ) {
    const currentDraftOrder = draftOrders.find(
      (draftOrder) => draftOrder.id === draftOrderId
    );

    if (!currentDraftOrder) {
      return null;
    }

    const nextDraftOrder = normalizeDraftOrder(update(currentDraftOrder));

    setDraftOrders((orders) =>
      orders.map((draftOrder) =>
        draftOrder.id === draftOrderId ? nextDraftOrder : draftOrder
      )
    );

    return nextDraftOrder;
  }

  function removeDraftOrderItem(itemId: string) {
    const currentDraftOrder = draftOrders.find((draftOrder) =>
      draftOrder.items.some((item) => item.id === itemId)
    );
    const removedDraftOrderId = currentDraftOrder?.id ?? null;
    const nextItems =
      currentDraftOrder?.items.filter((item) => item.id !== itemId) ?? [];
    const nextDraftOrder =
      currentDraftOrder &&
      !(nextItems.length === 0 && currentDraftOrder.status === "receiving")
        ? normalizeDraftOrder({
            ...currentDraftOrder,
            items: nextItems
          })
        : null;

    setDraftOrders((orders) =>
      orders.flatMap((draftOrder) => {
        if (!draftOrder.items.some((item) => item.id === itemId)) {
          return [draftOrder];
        }

        if (nextItems.length === 0 && draftOrder.status === "receiving") {
          return [];
        }

        return nextDraftOrder ? [nextDraftOrder] : [];
      })
    );
    if (nextDraftOrder) {
      void syncSavedDraftOrder(nextDraftOrder);
    }

    setEditingDraftOrderItemId((current) =>
      current === itemId ? null : current
    );

    if (removedDraftOrderId && !nextDraftOrder) {
      setActiveDraftOrderId((current) =>
        current === removedDraftOrderId ? null : current
      );
      setSelectedDraftOrderId((current) =>
        current === removedDraftOrderId ? null : current
      );
    }
  }

  function handleOpenNewOrder() {
    if (
      activeDraftOrder &&
      activeDraftOrder.status === "receiving" &&
      activeDraftOrder.items.length > 0
    ) {
      finalizeDraftOrder(activeDraftOrder.id);
    }

    openServiceSelectionForDraft(null);
  }

  function handleStartVolumeLettersCalculation() {
    setOfficeConstructorForm(createDefaultOfficeConstructorForm());
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
    const params = withManagerCommentPayload(
      {
        boardTapeColorName: result.boardTape.colorName,
        boardThicknessMm: result.boardTape.thicknessMm,
        boardWidthMm: result.boardTape.widthMm,
        faceFilmColorCode: result.faceFilm.colorCode,
        faceFilmLabel: getFaceFilmColorLabel(result.faceFilm),
        heightMm: officeConstructorForm.heightMm,
        lightingMode: officeConstructorForm.mode,
        resolvedBoardTapeMaterialName: result.boardTape.materialName,
        resolvedBoardTapeThicknessMm: result.boardTape.thicknessMm,
        text: officeConstructorForm.text
      },
      managerCommentDraft
    );

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
      totalPriceMinor: result.priceMinor,
      formattedPrice: result.formattedPrice,
      ledCount: result.ledCount,
      managerComment: managerCommentDraft.trim() || undefined,
      params,
      calculationId: result.calculationId,
      baselineStatus: "real calculation",
      checkMode: "real",
      calculationSource: result.source
    };
  }

  function createDtfDraftOrderItem(
    id: string,
    result: DtfPrintCalculationResult,
    previousItem?: DraftOrderItem | null
  ): DraftOrderItem {
    const widthLabel = formatCompactNumber(result.widthCm);
    const heightLabel = formatCompactNumber(result.heightCm);
    const previousParams = isPlainRecord(previousItem?.params)
      ? previousItem.params
      : {};
    const previousCalculationSnapshot = isPlainRecord(
      previousItem?.calculationSnapshot
    )
      ? previousItem.calculationSnapshot
      : {};
    const dtfPayload = {
      areaM2: result.areaM2,
      heightCm: result.heightCm,
      managerComment: managerCommentDraft.trim() || null,
      printTotalRub: result.priceMinor / 100,
      quantity: result.quantity,
      totalPriceMinor: result.priceMinor,
      unitPriceMinor: result.unitPriceMinor,
      unitPriceRub: result.unitPriceMinor / 100,
      widthCm: result.widthCm
    };

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
      unitPriceMinor: result.unitPriceMinor,
      formattedPrice: result.formattedPrice,
      calculationId: result.calculationId,
      calculationSnapshot: {
        ...previousCalculationSnapshot,
        ...dtfPayload
      },
      baselineStatus: "shared calculation",
      checkMode: "dtf-print",
      calculationSource: "@diez/calculation-core/print",
      params: {
        ...previousParams,
        ...dtfPayload
      }
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

      updateDraftOrderItem(editingDraftOrderItemId, updatedItem);
      setEditingDraftOrderItemId(null);
      return;
    }

    addDraftOrderItem(
      createConstructorDraftOrderItem(
        `office-calculation-${Date.now()}`,
        currentCalculationResult
      )
    );
  }

  function handleSaveDtfPrintItem() {
    if (editingDraftOrderItemId) {
      const currentItem =
        editingDraftOrderItem?.serviceType === "dtf-print"
          ? editingDraftOrderItem
          : null;
      const nextManagerComment = managerCommentDraft.trim();
      const currentManagerComment = getDraftOrderItemManagerComment(currentItem);

      if (
        currentItem &&
        isSameDtfCalculation(currentItem, dtfPrintCalculation) &&
        currentManagerComment === nextManagerComment
      ) {
        setEditingDraftOrderItemId(null);
        return;
      }

      const updatedItem = createDtfDraftOrderItem(
        editingDraftOrderItemId,
        dtfPrintCalculation,
        currentItem
      );

      updateDraftOrderItem(editingDraftOrderItemId, updatedItem);
      setEditingDraftOrderItemId(null);
      return;
    }

    addDraftOrderItem(
      createDtfDraftOrderItem(
        `dtf-print-${Date.now()}`,
        dtfPrintCalculation
      )
    );
  }

  function handleAcceptCalculation() {
    if (!currentCalculationResult) {
      return;
    }

    const acceptedItem = createConstructorDraftOrderItem(
      `office-calculation-${Date.now()}`,
      currentCalculationResult
    );

    addDraftOrderItem(acceptedItem);
    setEditingDraftOrderItemId(null);
    setNewOrderStep("details");
  }

  function handleRemoveDraftOrderItem(itemId: string) {
    removeDraftOrderItem(itemId);
  }

  function handleEditDraftOrderItem(item: DraftOrderItem) {
    const draftOrderId =
      draftOrders.find((draftOrder) =>
        draftOrder.items.some((draftItem) => draftItem.id === item.id)
      )?.id ?? null;

    if (item.serviceType === "dtf-print") {
      setDtfPrintForm({
        heightCm: String(item.heightCm ?? DTF_A3_HEIGHT_CM),
        quantity: String(item.quantity ?? 1),
        widthCm: String(item.widthCm ?? DTF_A3_WIDTH_CM)
      });
      const managerComment = getDraftOrderItemManagerComment(item);
      setManagerCommentDraft(managerComment);
      setManagerCommentEditorDraft(managerComment);
      setIsManagerCommentEditorOpen(false);
      setEditingDraftOrderItemId(item.id);
      setActiveDraftOrderId(draftOrderId);
      setIsNewOrderFormOpen(true);
      setIsDraftOrderDetailsOpen(false);
      setNewOrderStep("dtf-print");
      setIsConstructorPanelOpen(false);
      return;
    }

    if (item.serviceType !== "light-letter") {
      return;
    }

    setOfficeConstructorForm({
      boardTapeColorName:
        item.boardTapeColorName ?? DEFAULT_BOARD_TAPE_OPTION.colorName,
      boardWidthMm:
        item.boardWidthMm ?? DEFAULT_OFFICE_CONSTRUCTOR_BOARD_WIDTH_MM,
      boardThicknessMm:
        item.boardThicknessMm ?? DEFAULT_BOARD_TAPE_OPTION.thicknessMm,
      faceFilmColorCode:
        item.faceFilmColorCode ?? DEFAULT_FACE_FILM_OPTION.colorCode,
      heightMm: item.heightMm ?? "300",
      mode: item.lightingMode ?? "light",
      text: item.text ?? ""
    });
    const managerComment = getDraftOrderItemManagerComment(item);
    setManagerCommentDraft(managerComment);
    setManagerCommentEditorDraft(managerComment);
    setIsManagerCommentEditorOpen(false);
    setEditingDraftOrderItemId(item.id);
    setActiveDraftOrderId(draftOrderId);
    setIsNewOrderFormOpen(true);
    setIsDraftOrderDetailsOpen(false);
    setNewOrderStep("calculation");
    setIsConstructorPanelOpen(true);
  }

  function handleDuplicateDraftOrderItem(item: DraftOrderItem) {
    addDraftOrderItem({
      ...item,
      id: `${item.calculationId}-${Date.now()}`
    });
  }

  function handleSelectDraftOrder(draftOrderId: string) {
    const draftOrder = draftOrders.find((order) => order.id === draftOrderId);

    setActiveWorkspace("Диез Имидж");
    setActiveSection("Заказы");
    setSelectedDraftOrderId(draftOrderId);
    setDraftOrderPanelMode("details");
    setActiveDraftOrderId((current) =>
      draftOrder?.status === "receiving" ? draftOrderId : current
    );
    setIsNewOrderFormOpen(false);
    setIsDraftOrderDetailsOpen(true);
  }

  function openDraftOrderCustomerForm(draftOrder: DraftOrder) {
    setActiveWorkspace("Диез Имидж");
    setActiveSection("Заказы");
    setSelectedDraftOrderId(draftOrder.id);
    setIsNewOrderFormOpen(false);
    setIsDraftOrderDetailsOpen(true);
    setDraftOrderPanelMode("customer");
    setDraftOrderCustomerForm({
      comment: draftOrder.customer?.comment ?? "",
      email: draftOrder.customer?.email ?? "",
      name: draftOrder.customer?.name ?? "",
      phone: formatRussianPhone(draftOrder.customer?.phone ?? "")
    });
  }

  function openDraftOrderDeliveryForm(draftOrder: DraftOrder) {
    setActiveWorkspace("Диез Имидж");
    setActiveSection("Заказы");
    setSelectedDraftOrderId(draftOrder.id);
    setIsNewOrderFormOpen(false);
    setIsDraftOrderDetailsOpen(true);
    setDraftOrderPanelMode("delivery");
    setDraftOrderDeliveryForm({
      address: draftOrder.delivery.address ?? "",
      comment: draftOrder.delivery.comment ?? "",
      contactName: draftOrder.delivery.contactName ?? "",
      mode: draftOrder.delivery.mode,
      phone: formatRussianPhone(draftOrder.delivery.phone ?? "")
    });
    setCdekPanelState((current) =>
      createCdekPanelStateFromSavedDelivery(draftOrder, current.status)
    );
  }

  function openCdekPicker(activePicker: NonNullable<CdekActivePicker>) {
    setCdekPanelState((current) => {
      const senderCityCode = getCdekCityCode(current.selectedSenderCity);
      const canUseSenderPointResults =
        senderCityCode !== null &&
        current.senderDeliveryPointResultsCityCode === senderCityCode;

      return {
        ...current,
        activePicker,
        cityResults: activePicker === "recipientCity" ? [] : current.cityResults,
        deliveryPointResults:
          activePicker === "recipientPoint" ? [] : current.deliveryPointResults,
        message: null,
        senderCityResults:
          activePicker === "senderCity" ? [] : current.senderCityResults,
        senderDeliveryPointResults:
          activePicker === "senderPoint" && !canUseSenderPointResults
            ? []
            : current.senderDeliveryPointResults,
        senderDeliveryPointResultsCityCode:
          activePicker === "senderPoint" && !canUseSenderPointResults
            ? null
            : current.senderDeliveryPointResultsCityCode,
        tariffResults: activePicker === "tariff" ? [] : current.tariffResults
      };
    });
  }

  function handleSaveDraftOrderCustomer(draftOrderId: string) {
    const formattedPhone = formatRussianPhone(draftOrderCustomerForm.phone);

    const nextDraftOrder = updateDraftOrder(draftOrderId, (draftOrder) => ({
      ...draftOrder,
      customer: {
        comment: draftOrderCustomerForm.comment.trim() || undefined,
        email: draftOrderCustomerForm.email.trim() || undefined,
        name: draftOrderCustomerForm.name.trim() || undefined,
        phone: hasRussianPhoneDigits(formattedPhone) ? formattedPhone : undefined
      }
    }));
    if (nextDraftOrder) {
      void syncSavedDraftOrder(nextDraftOrder);
    }
    setDraftOrderPanelMode("details");
  }

  function handleSaveDraftOrderDelivery(draftOrderId: string) {
    const formattedPhone = formatRussianPhone(draftOrderDeliveryForm.phone);

    const nextDraftOrder = updateDraftOrder(draftOrderId, (draftOrder) => ({
      ...draftOrder,
      delivery: {
        address:
          draftOrderDeliveryForm.mode === "manual"
            ? draftOrderDeliveryForm.address.trim() || undefined
            : undefined,
        comment: draftOrderDeliveryForm.comment.trim() || undefined,
        contactName:
          draftOrderDeliveryForm.mode === "manual"
            ? draftOrderDeliveryForm.contactName.trim() || undefined
            : undefined,
        mode: draftOrderDeliveryForm.mode,
        phone:
          draftOrderDeliveryForm.mode === "manual" &&
          hasRussianPhoneDigits(formattedPhone)
            ? formattedPhone
            : undefined
      }
    }));
    if (nextDraftOrder) {
      void syncSavedDraftOrder(nextDraftOrder);
    }
    setDraftOrderPanelMode("details");
  }

  async function refreshCdekStatus() {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы проверить СДЭК."
      }));
      return;
    }

    setCdekPanelState((current) => ({
      ...current,
      isLoadingStatus: true,
      message: null
    }));

    try {
      const status = await getCdekStatus(authToken);

      setCdekPanelState((current) => ({
        ...current,
        message: getCdekStatusMessage(status),
        status
      }));
    } catch (unknownError) {
      setCdekPanelState((current) => ({
        ...current,
        message: getCdekUiErrorMessage(unknownError)
      }));
    } finally {
      setCdekPanelState((current) => ({
        ...current,
        isLoadingStatus: false
      }));
    }
  }

  async function handleSearchCdekCities(cityNameOverride?: string) {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы искать города СДЭК."
      }));
      return;
    }

    if (cdekPanelState.status && !cdekPanelState.status.enabled) {
      setCdekPanelState((current) => ({
        ...current,
        message: "СДЭК выключен на сервере."
      }));
      return;
    }

    if (cdekPanelState.status && !cdekPanelState.status.configured) {
      setCdekPanelState((current) => ({
        ...current,
        message: "СДЭК не настроен на сервере."
      }));
      return;
    }

    const cityName = (cityNameOverride ?? cdekPanelState.cityQuery).trim();

    if (cityName.length < 2) {
      setCdekPanelState((current) => ({
        ...current,
        cityResults: [],
        hasSearchedCities: false,
        isLoadingCities: false,
        message: null
      }));
      return;
    }

    const searchSeq = cdekRecipientCitySearchSeqRef.current + 1;
    cdekRecipientCitySearchSeqRef.current = searchSeq;

    setCdekPanelState((current) => ({
      ...current,
        cityResults: [],
        hasSearchedCities: false,
        isLoadingCities: true,
        message: null
    }));

    try {
      const result = await searchCdekCities(
        {
          countryCode: "RU",
          name: cityName
        },
        authToken
      );

      if (cdekRecipientCitySearchSeqRef.current !== searchSeq) {
        return;
      }

      setCdekPanelState((current) => ({
        ...current,
        cityResults: result.items,
        hasSearchedCities: true,
        isLoadingCities: false,
        message: result.items.length ? null : "Город не найден."
      }));
    } catch (unknownError) {
      if (cdekRecipientCitySearchSeqRef.current !== searchSeq) {
        return;
      }

      setCdekPanelState((current) => ({
        ...current,
        hasSearchedCities: true,
        isLoadingCities: false,
        message: getCdekCitySearchErrorMessage(unknownError)
      }));
    }
  }

  async function handleSearchCdekSenderCities(cityNameOverride?: string) {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы искать город отправителя СДЭК."
      }));
      return;
    }

    if (cdekPanelState.status && !cdekPanelState.status.enabled) {
      setCdekPanelState((current) => ({
        ...current,
        message: "СДЭК выключен на сервере."
      }));
      return;
    }

    if (cdekPanelState.status && !cdekPanelState.status.configured) {
      setCdekPanelState((current) => ({
        ...current,
        message: "СДЭК не настроен на сервере."
      }));
      return;
    }

    const cityName = (cityNameOverride ?? cdekPanelState.senderCityQuery).trim();

    if (cityName.length < 2) {
      setCdekPanelState((current) => ({
        ...current,
        isLoadingSenderCities: false,
        hasSearchedSenderCities: false,
        message: null,
        senderCityResults: []
      }));
      return;
    }

    const searchSeq = cdekSenderCitySearchSeqRef.current + 1;
    cdekSenderCitySearchSeqRef.current = searchSeq;

    setCdekPanelState((current) => ({
      ...current,
      hasSearchedSenderCities: false,
      isLoadingSenderCities: true,
      message: null,
      senderCityResults: [],
      senderDeliveryPointResults: [],
      senderDeliveryPointResultsCityCode: null
    }));

    try {
      const result = await searchCdekCities(
        {
          countryCode: "RU",
          name: cityName
        },
        authToken
      );

      if (cdekSenderCitySearchSeqRef.current !== searchSeq) {
        return;
      }

      setCdekPanelState((current) => ({
        ...current,
        hasSearchedSenderCities: true,
        isLoadingSenderCities: false,
        message: result.items.length
          ? null
          : "Город не найден.",
        senderCityResults: result.items
      }));
    } catch (unknownError) {
      if (cdekSenderCitySearchSeqRef.current !== searchSeq) {
        return;
      }

      setCdekPanelState((current) => ({
        ...current,
        hasSearchedSenderCities: true,
        isLoadingSenderCities: false,
        message: getCdekCitySearchErrorMessage(unknownError)
      }));
    }
  }

  async function handleLoadCdekSenderDeliveryPoints() {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы загрузить пункты отправки СДЭК."
      }));
      return;
    }

    const cityCode = getCdekCityCode(cdekPanelState.selectedSenderCity);

    if (!cityCode) {
      setCdekPanelState((current) => ({
        ...current,
        isLoadingSenderDeliveryPoints: false,
        message: "Выберите город отправителя."
      }));
      return;
    }

    if (
      cdekPanelState.senderDeliveryPointResultsCityCode === cityCode &&
      cdekPanelState.senderDeliveryPointResults.length > 0
    ) {
      setCdekPanelState((current) => ({
        ...current,
        message: null,
        senderDeliveryPointFilter: ""
      }));
      return;
    }

    setCdekPanelState((current) => ({
      ...current,
      isLoadingSenderDeliveryPoints: true,
      message: null,
      senderDeliveryPointFilter: "",
      senderDeliveryPointResults: [],
      senderDeliveryPointResultsCityCode: cityCode
    }));

    try {
      const result = await getCdekDeliveryPoints(
        {
          cityCode,
          type: "PVZ"
        },
        authToken
      );

      setCdekPanelState((current) => {
        if (getCdekCityCode(current.selectedSenderCity) !== cityCode) {
          return {
            ...current,
            isLoadingSenderDeliveryPoints: false
          };
        }

        return {
          ...current,
          isLoadingSenderDeliveryPoints: false,
          message: result.items.length
            ? null
            : "Пункты отправки СДЭК не найдены.",
          senderDeliveryPointResults: result.items,
          senderDeliveryPointResultsCityCode: cityCode
        };
      });
    } catch (unknownError) {
      setCdekPanelState((current) => {
        if (getCdekCityCode(current.selectedSenderCity) !== cityCode) {
          return {
            ...current,
            isLoadingSenderDeliveryPoints: false
          };
        }

        return {
          ...current,
          isLoadingSenderDeliveryPoints: false,
          message: getCdekUiErrorMessage(unknownError)
        };
      });
    }
  }

  async function handleLoadCdekDeliveryPoints() {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы загрузить ПВЗ."
      }));
      return;
    }

    const cityCode = cdekPanelState.selectedCity?.code;

    if (!cityCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город получателя."
      }));
      return;
    }

    setCdekPanelState((current) => ({
      ...current,
      deliveryPointFilter: "",
      deliveryPointResults: [],
      isLoadingDeliveryPoints: true,
      message: null
    }));

    try {
      const result = await getCdekDeliveryPoints(
        {
          cityCode,
          type: "ALL"
        },
        authToken
      );

      setCdekPanelState((current) => ({
        ...current,
        deliveryPointResults: result.items,
        isLoadingDeliveryPoints: false,
        message: result.items.length ? null : "ПВЗ не найдены."
      }));
    } catch (unknownError) {
      setCdekPanelState((current) => ({
        ...current,
        isLoadingDeliveryPoints: false,
        message: getCdekUiErrorMessage(unknownError)
      }));
    }
  }

  async function handleLoadCdekTariffs(requestFingerprint?: string) {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы подобрать тарифы СДЭК."
      }));
      return;
    }

    const fromCityCode = getCdekCityCode(cdekPanelState.selectedSenderCity);
    const shipmentPointCode =
      cdekPanelState.selectedSenderDeliveryPoint?.code ?? null;
    const toCityCode = cdekPanelState.selectedCity?.code ?? null;
    const deliveryPointCode = cdekPanelState.selectedDeliveryPoint?.code ?? null;
    const packages = getCdekPackagePayloads(cdekPanelState);
    const fingerprint =
      requestFingerprint ?? getCdekTariffRequestFingerprint(cdekPanelState);

    if (!fromCityCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город отправителя."
      }));
      return;
    }

    if (!shipmentPointCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите пункт отправки."
      }));
      return;
    }

    if (!toCityCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город получателя."
      }));
      return;
    }

    if (!deliveryPointCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите ПВЗ."
      }));
      return;
    }

    if (!packages) {
      setCdekPanelState((current) => ({
        ...current,
        message:
          "Проверьте вес и габариты: вес в кг, габариты в см должны быть положительными."
      }));
      return;
    }

    setCdekPanelState((current) => ({
      ...current,
      isLoadingTariffs: true,
      message: null,
      tariffRequestFingerprint: fingerprint,
      tariffResultsFingerprint:
        current.tariffResultsFingerprint === fingerprint
          ? current.tariffResultsFingerprint
          : null,
      tariffResults: []
    }));

    try {
      const result = await getCdekTariffs(
        {
          currencyCode: "RUB",
          deliveryPointCode,
          fromLocation: {
            code: fromCityCode
          },
          packages: packages.map((packagePayload) => ({
            heightCm: packagePayload.heightCm,
            lengthCm: packagePayload.lengthCm,
            weightGrams: packagePayload.weightGrams,
            widthCm: packagePayload.widthCm
          })),
          shipmentPointCode,
          toLocation: {
            code: toCityCode
          }
        },
        authToken
      );
      const availableTariffs = [...result.items]
        .filter((tariff) => tariff.tariffCode !== null && tariff.errors.length === 0)
        .sort(compareCdekTariffsForPvz);

      setCdekPanelState((current) => ({
        ...current,
        isLoadingTariffs: false,
        message: availableTariffs.length
          ? null
          : "Доступные тарифы СДЭК не найдены.",
        tariffRequestFingerprint: null,
        tariffResultsFingerprint: fingerprint,
        tariffResults: availableTariffs
      }));
    } catch (unknownError) {
      setCdekPanelState((current) => ({
        ...current,
        isLoadingTariffs: false,
        tariffRequestFingerprint: null,
        message: getCdekTariffSelectionErrorMessage(unknownError)
      }));
    }
  }

  async function handleCalculateCdekDelivery(draftOrder: DraftOrder) {
    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы рассчитать СДЭК."
      }));
      return;
    }

    if (!draftOrder.serverOrderId) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Сначала завершите приём заказа, затем рассчитайте СДЭК."
      }));
      return;
    }

    const tariffCode = cdekPanelState.selectedTariff?.tariffCode ?? null;
    const fromCityCode = getCdekCityCode(cdekPanelState.selectedSenderCity);
    const shipmentPointCode =
      cdekPanelState.selectedSenderDeliveryPoint?.code ?? null;
    const toCityCode = cdekPanelState.selectedCity?.code ?? null;
    const deliveryPointCode = cdekPanelState.selectedDeliveryPoint?.code ?? null;
    const packages = getCdekPackagePayloads(cdekPanelState);

    if (!tariffCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Сначала выберите тариф СДЭК."
      }));
      return;
    }

    if (!fromCityCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город отправителя."
      }));
      return;
    }

    if (!shipmentPointCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите пункт отправки."
      }));
      return;
    }

    if (!toCityCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город получателя."
      }));
      return;
    }

    if (!deliveryPointCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите ПВЗ."
      }));
      return;
    }

    if (!packages) {
      setCdekPanelState((current) => ({
        ...current,
        message:
          "Проверьте вес и габариты: вес в кг, габариты в см должны быть положительными."
      }));
      return;
    }

    setCdekPanelState((current) => ({
      ...current,
      calculationResult: null,
      isCalculating: true,
      message: null,
      saveResult: null
    }));

    try {
      const result = await calculateCdekDelivery(
        draftOrder.serverOrderId,
        {
          currencyCode: "RUB",
          deliveryPointCode,
          fromLocation: {
            code: fromCityCode
          },
          packages: packages.map((packagePayload) => ({
            heightCm: packagePayload.heightCm,
            lengthCm: packagePayload.lengthCm,
            weightGrams: packagePayload.weightGrams,
            widthCm: packagePayload.widthCm
          })),
          shipmentPointCode,
          tariffCode,
          toLocation: {
            code: toCityCode
          }
        },
        authToken
      );

      setCdekPanelState((current) => ({
        ...current,
        calculationResult: result,
        isCalculating: false,
        message: null,
        saveResult: null
      }));
    } catch (unknownError) {
      setCdekPanelState((current) => ({
        ...current,
        isCalculating: false,
        message: getCdekCalculationErrorMessage(unknownError)
      }));
    }
  }

  async function handleSaveCdekDelivery(draftOrder: DraftOrder) {
    const calculationResult = cdekPanelState.calculationResult;
    const selectedSenderCity = cdekPanelState.selectedSenderCity;
    const selectedSenderDeliveryPoint = cdekPanelState.selectedSenderDeliveryPoint;
    const selectedCity = cdekPanelState.selectedCity;
    const selectedDeliveryPoint = cdekPanelState.selectedDeliveryPoint;
    const tariffCode = cdekPanelState.selectedTariff?.tariffCode ?? null;
    const selectedSenderCityCode = getCdekCityCode(selectedSenderCity);
    const packages = getCdekPackagePayloads(cdekPanelState);
    const priceMinor = getCdekCalculationPriceMinor(calculationResult);
    const deliverySumMinor = getCdekCalculationTariffPriceMinor(calculationResult);
    const totalSumMinor = getCdekCalculationPriceMinor(calculationResult);
    const vatMinor = getCdekCalculationVatMinor(calculationResult);

    if (!canSaveCdekDeliveryMode(cdekPanelState)) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Сохранение этого способа доставки пока не реализовано."
      }));
      return;
    }

    if (!calculationResult || !priceMinor) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Сначала рассчитайте СДЭК и получите стоимость доставки."
      }));
      return;
    }

    if (!selectedSenderCity || !selectedSenderCityCode) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город отправителя."
      }));
      return;
    }

    if (!selectedSenderDeliveryPoint?.code) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите пункт отправки."
      }));
      return;
    }

    if (!selectedCity?.code) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите город получателя."
      }));
      return;
    }

    if (!selectedDeliveryPoint?.code) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Выберите ПВЗ."
      }));
      return;
    }

    if (!tariffCode || !packages) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Проверьте тариф, вес и габариты."
      }));
      return;
    }

    const deliveryPointAddress =
      selectedDeliveryPoint.address ??
      selectedDeliveryPoint.addressFull ??
      formatCdekDeliveryPointLabel(selectedDeliveryPoint);
    const recipientName =
      draftOrder.delivery.contactName?.trim() ||
      draftOrder.customer?.name?.trim() ||
      undefined;
    const recipientPhone =
      draftOrder.delivery.phone?.trim() ||
      draftOrder.customer?.phone?.trim() ||
      undefined;
    const recipientEmail = draftOrder.customer?.email?.trim() || undefined;
    const shipmentPointCode = selectedSenderDeliveryPoint.code;
    const cargoDescription = packages
      .map((packagePayload) => packagePayload.description)
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(", ");
    const declaredValueMinor = getDraftOrderTotalMinor(draftOrder.items);
    const isDangerousCargo = packages.some(
      (packagePayload) => packagePayload.isDangerousCargo
    );
    const deliveryMode =
      cdekPanelState.selectedTariff?.deliveryMode ??
      (cdekPanelState.tariffFromMode === "warehouse" &&
      cdekPanelState.tariffToMode === "warehouse"
        ? "4"
        : undefined);
    const cdekSavePayload: CdekSaveDeliveryRequest = {
      calculation: calculationResult.calculation,
      cargoDescription,
      city: selectedCity.city ?? selectedCity.fullName ?? cdekPanelState.cityQuery,
      cityCode: selectedCity.code,
      cityUuid: selectedCity.cityUuid ?? undefined,
      comment: draftOrder.delivery.comment?.trim() || undefined,
      countryCode: selectedCity.countryCode ?? "RU",
      currencyCode: "RUB",
      declaredValueMinor,
      deliveryMode,
      deliveryPointAddress,
      deliveryPointCode: selectedDeliveryPoint.code,
      deliveryPointName: selectedDeliveryPoint.name ?? undefined,
      deliveryPointType: selectedDeliveryPoint.type ?? undefined,
      deliveryPointUuid: selectedDeliveryPoint.uuid ?? undefined,
      deliverySumMinor: deliverySumMinor ?? undefined,
      isDangerousCargo,
      packages: packages.map((packagePayload) => ({
        description: packagePayload.description,
        heightCm: packagePayload.heightCm,
        isDangerousCargo: packagePayload.isDangerousCargo,
        lengthCm: packagePayload.lengthCm,
        weightGrams: packagePayload.weightGrams,
        widthCm: packagePayload.widthCm
      })),
      periodMax: calculationResult.calculation.periodMax ?? undefined,
      periodMin: calculationResult.calculation.periodMin ?? undefined,
      placesCount: packages.length,
      priceMinor,
      recipientEmail,
      recipientName,
      recipientPhone,
      region: selectedCity.region ?? undefined,
      senderCity:
        selectedSenderCity.city ??
        selectedSenderCity.fullName ??
        cdekPanelState.senderCityQuery.trim() ??
        undefined,
      senderCityCode: selectedSenderCityCode,
      senderCountryCode: selectedSenderCity.countryCode ?? undefined,
      senderRegion: selectedSenderCity.region ?? undefined,
      shipmentPointAddress:
        selectedSenderDeliveryPoint.address ??
        selectedSenderDeliveryPoint.addressFull ??
        undefined,
      shipmentPointCode,
      shipmentPointName: selectedSenderDeliveryPoint.name ?? undefined,
      shipmentPointType: selectedSenderDeliveryPoint.type ?? undefined,
      shipmentPointUuid: selectedSenderDeliveryPoint.uuid ?? undefined,
      tariffCode: calculationResult.calculation.tariffCode || tariffCode,
      tariffName: cdekPanelState.selectedTariff?.tariffName ?? undefined,
      totalSumMinor: totalSumMinor ?? undefined,
      vatMinor: vatMinor ?? undefined
    };

    if (!draftOrder.serverOrderId) {
      const providerPayload = buildLocalCdekDeliveryProviderPayload(cdekSavePayload);
      const localDelivery: DraftOrderDelivery = {
        ...draftOrder.delivery,
        address: deliveryPointAddress,
        contactName: recipientName,
        currencyCode: "RUB",
        mode: "cdek",
        periodMax: calculationResult.calculation.periodMax ?? undefined,
        periodMin: calculationResult.calculation.periodMin ?? undefined,
        phone: recipientPhone,
        priceMinor,
        providerPayload,
        tariffCode: calculationResult.calculation.tariffCode || tariffCode,
        tariffName: cdekPanelState.selectedTariff?.tariffName ?? undefined
      };
      const localTotalPriceMinor = getDraftOrderGrandTotalMinor(
        draftOrder.items,
        localDelivery
      );
      const localResult: CdekSaveDeliveryResult = {
        delivery: {
          addressText: deliveryPointAddress,
          currencyCode: "RUB",
          deliveryMode: "cdek",
          deliveryStatus: "selected",
          priceMinor,
          providerPayload,
          recipientName: recipientName ?? null,
          recipientPhone: recipientPhone ?? null
        },
        order: {
          id: 0,
          orderNumber: ""
        },
        payment: {
          activePaymentsCanceled: false,
          canceledPaymentIds: [],
          deliveryNeedsReview: false,
          financialChanged: false
        },
        saved: true,
        totals: {
          deliveryTotalMinor: priceMinor,
          totalPriceMinor: localTotalPriceMinor
        }
      };
      const savedAt = new Date().toISOString();

      setDraftOrders((orders) =>
        orders.map((currentDraftOrder) =>
          currentDraftOrder.id === draftOrder.id
            ? {
                ...currentDraftOrder,
                delivery: localDelivery,
                totalPriceMinor: localTotalPriceMinor,
                updatedAt: savedAt
              }
            : currentDraftOrder
        )
      );
      setCdekPanelState((current) => ({
        ...current,
        isSaving: false,
        message: "СДЭК-доставка сохранена в черновик заказа.",
        saveResult: localResult
      }));
      return;
    }

    if (!authToken) {
      setCdekPanelState((current) => ({
        ...current,
        message: "Войдите, чтобы сохранить СДЭК-доставку."
      }));
      return;
    }

    setCdekPanelState((current) => ({
      ...current,
      isSaving: true,
      message: null
    }));

    try {
      const result = await saveCdekDelivery(
        draftOrder.serverOrderId,
        cdekSavePayload,
        authToken
      );
      const savedAt = new Date().toISOString();

      setDraftOrders((orders) =>
        orders.map((currentDraftOrder) =>
          currentDraftOrder.id === draftOrder.id
            ? {
                ...currentDraftOrder,
                delivery: {
                  ...currentDraftOrder.delivery,
                  address: result.delivery.addressText ?? deliveryPointAddress,
                  comment: currentDraftOrder.delivery.comment,
                  contactName: result.delivery.recipientName ?? recipientName,
                  currencyCode: result.delivery.currencyCode,
                  mode: "cdek",
                  periodMax: calculationResult.calculation.periodMax ?? undefined,
                  periodMin: calculationResult.calculation.periodMin ?? undefined,
                  phone: result.delivery.recipientPhone ?? recipientPhone,
                  priceMinor: result.delivery.priceMinor,
                  providerPayload: result.delivery.providerPayload,
                  tariffCode: calculationResult.calculation.tariffCode || tariffCode,
                  tariffName: cdekPanelState.selectedTariff?.tariffName ?? undefined
                },
                serverOrderNumber: result.order.orderNumber,
                serverOrderSavedAt: savedAt,
                totalPriceMinor: result.totals.totalPriceMinor,
                updatedAt: savedAt
              }
            : currentDraftOrder
        )
      );
      setCdekPanelState((current) => ({
        ...current,
        isSaving: false,
        message: null,
        saveResult: result
      }));

      if (result.payment.activePaymentsCanceled) {
        void loadOrderPayments(draftOrder.serverOrderId);
      }

      await loadServerOrders(authToken);
    } catch (unknownError) {
      setCdekPanelState((current) => ({
        ...current,
        isSaving: false,
        message: getCdekUiErrorMessage(unknownError)
      }));
    }
  }

  async function loadServerOrders(sessionToken = authToken) {
    if (!sessionToken) {
      setServerOrdersStatus("Войдите");
      setServerConnectionState("disconnected");
      return;
    }

    setIsServerOrdersLoading(true);
    setServerOrdersStatus("Загрузка...");
    setServerConnectionState("disconnected");

    try {
      const orders = await getOrders(sessionToken);

      setServerOrders(orders);
      setServerOrdersStatus(`Обновлено: ${orders.length}`);
      setServerConnectionState("connected");
    } catch {
      setServerOrders([]);
      setServerOrdersStatus("Ошибка загрузки");
      setServerConnectionState("disconnected");
    } finally {
      setIsServerOrdersLoading(false);
    }
  }

  async function fetchAttachmentPreviewBlob(
    attachment: OrderAttachment,
    sessionToken: string
  ) {
    try {
      return await fetchOrderAttachmentBlob(
        attachment.orderId,
        attachment.id,
        sessionToken,
        "preview"
      );
    } catch (error) {
      if (!isImageAttachment(attachment)) {
        throw error;
      }

      return fetchOrderAttachmentBlob(
        attachment.orderId,
        attachment.id,
        sessionToken,
        "download"
      );
    }
  }

  async function loadOrderAttachments(orderId: number, sessionToken = authToken) {
    if (!sessionToken) {
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Войдите, чтобы увидеть вложения"
      }));
      return;
    }

    setAttachmentsStatusByOrderId((current) => ({
      ...current,
      [orderId]: "Загружаем вложения..."
    }));

    try {
      const attachments = await getOrderAttachments(orderId, sessionToken);

      setOrderAttachmentsByOrderId((current) => ({
        ...current,
        [orderId]: attachments
      }));
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: attachments.length > 0 ? "" : "Файлы не прикреплены"
      }));

      const imageAttachments = attachments.filter(isImageAttachment);

      const attachmentIds = new Set(
        attachments.map((attachment) => attachment.id)
      );
      const previewEntries = (
        await Promise.allSettled(
          imageAttachments.map(async (attachment) => {
            const blob = await fetchAttachmentPreviewBlob(attachment, sessionToken);

            return [attachment.id, URL.createObjectURL(blob)] as const;
          })
        )
      ).flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      );

      setAttachmentPreviewUrlById((current) => {
        const next = { ...current };

        Object.entries(current).forEach(([attachmentId, objectUrl]) => {
          if (attachmentIds.has(Number(attachmentId))) {
            URL.revokeObjectURL(objectUrl);
            delete next[Number(attachmentId)];
          }
        });

        previewEntries.forEach(([attachmentId, objectUrl]) => {
          next[attachmentId] = objectUrl;
        });

        attachmentPreviewUrlByIdRef.current = next;

        return next;
      });
    } catch {
      setOrderAttachmentsByOrderId((current) => ({
        ...current,
        [orderId]: []
      }));
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Не удалось загрузить вложения"
      }));
    }
  }

  async function loadOrderPayments(orderId: number, sessionToken = authToken) {
    if (!sessionToken) {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Войдите, чтобы увидеть оплаты"
      }));
      return;
    }

    setOrderPaymentsStatusByOrderId((current) => ({
      ...current,
      [orderId]: "Загружаем оплаты..."
    }));

    try {
      const payments = await getOrderPayments(orderId, sessionToken);

      setOrderPaymentsByOrderId((current) => ({
        ...current,
        [orderId]: payments
      }));
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: ""
      }));
    } catch {
      setOrderPaymentsByOrderId((current) => ({
        ...current,
        [orderId]: []
      }));
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Не удалось загрузить оплаты"
      }));
    }
  }

  async function handleUploadOrderAttachment(orderId: number, file: File | null) {
    if (!authToken) {
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Нет подключения к серверу"
      }));
      return;
    }

    if (!file) {
      return;
    }

    setUploadingAttachmentOrderId(orderId);
    setAttachmentsStatusByOrderId((current) => ({
      ...current,
      [orderId]: "Загружаем файл..."
    }));

    try {
      await uploadOrderAttachment(orderId, file, authToken, {
        attachmentType: "other",
        source: "desktop"
      });
      await loadOrderAttachments(orderId, authToken);
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Файл добавлен"
      }));
    } catch {
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Не удалось добавить файл"
      }));
    } finally {
      setUploadingAttachmentOrderId(null);
    }
  }

  async function handleOpenAttachmentPreview(attachment: OrderAttachment) {
    if (!authToken) {
      return;
    }

    if (!isPreviewableAttachment(attachment)) {
      setAttachmentPreview((current) => {
        if (current?.objectUrl) {
          URL.revokeObjectURL(current.objectUrl);
        }

        attachmentPreviewObjectUrlRef.current = null;

        return {
          attachment,
          objectUrl: null
        };
      });
      return;
    }

    try {
      const blob = await fetchAttachmentPreviewBlob(attachment, authToken);
      const objectUrl = URL.createObjectURL(blob);

      setAttachmentPreview((current) => {
        if (current?.objectUrl) {
          URL.revokeObjectURL(current.objectUrl);
        }

        attachmentPreviewObjectUrlRef.current = objectUrl;

        return {
          attachment,
          objectUrl
        };
      });
    } catch {
      setAttachmentPreview((current) => {
        if (current?.objectUrl) {
          URL.revokeObjectURL(current.objectUrl);
        }

        attachmentPreviewObjectUrlRef.current = null;

        return {
          attachment,
          objectUrl: null
        };
      });
    }
  }

  async function handleDownloadAttachment(attachment: OrderAttachment) {
    console.info("[attachment-download] click", attachment.id);

    if (!authToken) {
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [attachment.orderId]: "Нет подключения к серверу"
      }));
      return;
    }

    setAttachmentsStatusByOrderId((current) => ({
      ...current,
      [attachment.orderId]: "Скачиваем файл..."
    }));

    try {
      const result = await downloadOrderAttachment(
        attachment.orderId,
        attachment.id,
        authToken,
        attachment.originalFileName
      );

      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [attachment.orderId]:
          result.status === "cancelled"
            ? "Скачивание отменено"
            : result.filePath
              ? `Файл сохранён: ${result.filePath}`
              : "Файл сохранён"
      }));
      setLastDownloadedFilePathByOrderId((current) => {
        if (result.status === "saved" && result.filePath) {
          return {
            ...current,
            [attachment.orderId]: result.filePath
          };
        }

        return current;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const userMessage = errorMessage.includes("DOWNLOADS_FALLBACK_FAILED")
        ? "Не удалось скачать файл: не удалось сохранить в папку загрузок"
        : "Не удалось скачать файл";

      console.error("[attachment-download] failed", {
        attachmentId: attachment.id,
        error: errorMessage
      });
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [attachment.orderId]: userMessage
      }));
    }
  }

  async function handleOpenDownloadedFileLocation(orderId: number) {
    const filePath = lastDownloadedFilePathByOrderId[orderId];

    if (!filePath) {
      return;
    }

    try {
      await openDownloadedFileLocation(filePath);
    } catch {
      setAttachmentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Не удалось открыть папку"
      }));
    }
  }

  function renderAttachmentStatus(orderId: number) {
    const status = attachmentsStatusByOrderId[orderId];
    const filePath = lastDownloadedFilePathByOrderId[orderId];

    if (!status) {
      return null;
    }

    return (
      <div className="attachment-status-row">
        <p className="draft-summary-muted">{status}</p>
        {filePath && status.startsWith("Файл сохранён") ? (
          <button
            aria-label="Открыть папку с файлом"
            className="attachment-open-folder-button"
            onClick={() => void handleOpenDownloadedFileLocation(orderId)}
            title="Открыть папку с файлом"
            type="button"
          >
            <img alt="" src={folderSymlinkIconUrl} />
          </button>
        ) : null}
      </div>
    );
  }

  function renderPositionAttachmentCard(attachment: OrderAttachment) {
    const fileSizeLabel = formatAttachmentFileSize(attachment.fileSize);

    return (
      <article
        className="position-attachment-card"
        key={attachment.id}
        onClick={() => void handleOpenAttachmentPreview(attachment)}
        role="button"
        tabIndex={0}
        title={attachment.originalFileName}
      >
        <div className="position-attachment-preview">
          {isImageAttachment(attachment) && attachmentPreviewUrlById[attachment.id] ? (
            <img
              alt={attachment.originalFileName}
              src={attachmentPreviewUrlById[attachment.id]}
            />
          ) : (
            <span>{getAttachmentFileKindLabel(attachment)}</span>
          )}
        </div>
        <div className="position-attachment-meta">
          <strong>{attachment.originalFileName}</strong>
          <small>
            {getAttachmentTypeLabel(attachment.attachmentType)}
            {fileSizeLabel ? ` · ${fileSizeLabel}` : ""}
          </small>
        </div>
        <button
          aria-label="Скачать файл"
          className="attachment-download-button position-attachment-download"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleDownloadAttachment(attachment);
          }}
          title="Скачать файл"
          type="button"
        >
          <img alt="" src={downloadIconUrl} />
        </button>
      </article>
    );
  }

  function renderPositionAttachmentsSection(attachments: OrderAttachment[]) {
    if (attachments.length === 0) {
      return null;
    }

    return (
      <section className="position-attachments-section">
        <div className="section-heading">
          <div>
            <h3>Файлы позиции</h3>
            <p>{formatAttachmentCountLabel(attachments.length)}</p>
          </div>
        </div>
        <div className="position-attachment-grid">
          {attachments.map((attachment) => renderPositionAttachmentCard(attachment))}
        </div>
      </section>
    );
  }

  function renderPositionCommentSection(comment: string) {
    const normalizedComment = comment.trim();

    if (!normalizedComment) {
      return null;
    }

    return (
      <section className="position-comment-section">
        <div className="section-heading">
          <div>
            <h3>Комментарий клиента</h3>
          </div>
        </div>
        <p>{normalizedComment}</p>
      </section>
    );
  }

  function renderPositionManagerCommentDisplaySection() {
    const normalizedComment = managerCommentDraft.trim();

    if (!normalizedComment) {
      return null;
    }

    return (
      <section className="position-comment-section position-manager-comment-display">
        <div className="section-heading position-comment-heading">
          <div>
            <h3>Комментарий менеджера</h3>
          </div>
          <button
            className="position-comment-edit-icon"
            onClick={openManagerCommentEditor}
            title="Редактировать комментарий"
            type="button"
          >
            <img alt="" src={pencilIconUrl} />
          </button>
        </div>
        <p>{normalizedComment}</p>
      </section>
    );
  }

  function openManagerCommentEditor() {
    setManagerCommentEditorDraft(managerCommentDraft);
    setIsManagerCommentEditorOpen(true);
  }

  function cancelManagerCommentEditor() {
    setManagerCommentEditorDraft(managerCommentDraft);
    setIsManagerCommentEditorOpen(false);
  }

  function confirmManagerCommentEditor() {
    const normalizedComment = managerCommentEditorDraft.trim();

    setManagerCommentDraft(normalizedComment);
    setManagerCommentEditorDraft(normalizedComment);
    setIsManagerCommentEditorOpen(false);

    if (editingDraftOrderItemId && editingDraftOrderItem) {
      updateDraftOrderItem(
        editingDraftOrderItemId,
        applyManagerCommentToDraftOrderItem(
          editingDraftOrderItem,
          normalizedComment
        )
      );
    }
  }

  function renderPositionManagerActionIcons() {
    return (
      <div className="position-manager-action-icons">
        <button
          className="position-manager-action-icon"
          onClick={openManagerCommentEditor}
          title={
            managerCommentDraft.trim()
              ? "Редактировать комментарий"
              : "Добавить комментарий"
          }
          type="button"
        >
          <img alt="" src={messageIconUrl} />
        </button>
        <button
          className="position-manager-action-icon"
          disabled
          title="Нужна привязка файла к позиции"
          type="button"
        >
          <img alt="" src={fileUploadIconUrl} />
        </button>
      </div>
    );
  }

  function renderPaymentPreparationOzonPanel(draftOrder: DraftOrder) {
    const orderId = draftOrder.serverOrderId;

    if (!orderId) {
      return null;
    }

    const deliveryNeedsReview = isDraftOrderDeliveryNeedsReview(draftOrder);
    const payments = orderPaymentsByOrderId[orderId] ?? [];
    const payment = deliveryNeedsReview ? null : getLatestOzonPayment(payments);
    const status = orderPaymentsStatusByOrderId[orderId];
    const action = orderPaymentActionByOrderId[orderId];
    const canCreatePayment =
      !deliveryNeedsReview && (!payment || isTerminalOzonPayment(payment));
    const canCancelPayment = isActiveOzonPayment(payment);

    return (
      <section className="payment-preparation-ozon-panel">
        <div className="payment-preparation-ozon-header">
          <div>
            <strong>Оплата Ozon Pay</strong>
            <p>
              Клиент откроет страницу Ozon Pay и сможет оплатить картой, СБП
              или Ozon картой.
            </p>
          </div>
          {deliveryNeedsReview ? (
            <button
              className="secondary-action-button"
              onClick={() => {
                closePaymentPreparationPanel();
                openDraftOrderDeliveryForm(draftOrder);
              }}
              type="button"
            >
              Проверьте доставку
            </button>
          ) : canCreatePayment ? (
            <button
              className="secondary-action-button"
              disabled={action === "create" || draftOrder.totalPriceMinor <= 0}
              onClick={() => void handleCreateOzonPayment(draftOrder)}
              type="button"
            >
              {action === "create" ? "Создаём..." : "Создать оплату Ozon Pay"}
            </button>
          ) : null}
        </div>

        {deliveryNeedsReview ? (
          <p className="draft-delivery-review-warning">
            Заказ изменён. Проверьте вес/габариты и сохраните доставку перед оплатой.
          </p>
        ) : payment ? (
          <div className="payment-preparation-ozon-body">
            <div className="payment-preparation-ozon-row">
              <span>Статус</span>
              <strong>{getOzonPaymentStatusLabel(payment.status)}</strong>
            </div>
            <div className="payment-preparation-ozon-row">
              <span>Сумма</span>
              <strong>
                {formatMinorPrice(payment.amountMinor, payment.currencyCode)}
              </strong>
            </div>
            <div className="payment-preparation-ozon-row">
              <span>Ссылка</span>
              {payment.payLink ? (
                <a href={payment.payLink} rel="noreferrer" target="_blank">
                  {payment.payLink}
                </a>
              ) : (
                <strong>Ссылка не получена</strong>
              )}
            </div>
            <div className="payment-preparation-ozon-actions">
              <button
                className="secondary-action-button"
                disabled={!payment.payLink}
                onClick={() => handleCopyOzonPaymentLink(draftOrder, payment)}
                type="button"
              >
                Скопировать ссылку
              </button>
              <button
                className="secondary-action-button"
                disabled={!payment.payLink}
                onClick={() => {
                  if (payment.payLink) {
                    void copyTextToClipboard(
                      getPaymentPreparationMessage(draftOrder, payment.payLink),
                      orderId,
                      "Текст для MAX/email скопирован"
                    );
                  }
                }}
                type="button"
              >
                Скопировать текст для MAX/email
              </button>
              <button
                className="secondary-action-button"
                disabled={action === "sync"}
                onClick={() => void handleSyncOzonPayment(draftOrder, payment)}
                type="button"
              >
                {action === "sync" ? "Обновляем..." : "Обновить статус"}
              </button>
              {canCancelPayment ? (
                <button
                  className="secondary-action-button"
                  disabled={action === "cancel"}
                  onClick={() => void handleCancelOzonPayment(draftOrder, payment)}
                  type="button"
                >
                  {action === "cancel" ? "Отменяем..." : "Отменить Ozon-оплату"}
                </button>
              ) : null}
            </div>
            {canCancelPayment ? (
              <p className="draft-summary-muted">
                После отмены можно изменить заказ и создать новую оплату.
              </p>
            ) : null}
          </div>
        ) : draftOrder.totalPriceMinor <= 0 ? (
          <p className="draft-summary-muted">
            Сначала укажите сумму заказа, затем создайте ссылку оплаты.
          </p>
        ) : null}

        {status ? <p className="draft-summary-muted">{status}</p> : null}
      </section>
    );
  }

  function closeAttachmentPreview() {
    setAttachmentPreview((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }

      attachmentPreviewObjectUrlRef.current = null;

      return null;
    });
  }

  function focusAuthCodeInput(index: number) {
    authCodeInputRefs.current[index]?.focus();
  }

  function updateAuthCodeDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const digits = authCode.padEnd(4, " ").slice(0, 4).split("");

    digits[index] = digit;
    setAuthCode(digits.join(""));

    if (digit && index < 3) {
      focusAuthCodeInput(index + 1);
    }
  }

  function handleAuthCodeKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) {
    if (event.key !== "Backspace") {
      return;
    }

    if (authCode[index]?.trim()) {
      const digits = authCode.padEnd(4, " ").slice(0, 4).split("");

      digits[index] = " ";
      setAuthCode(digits.join(""));
      return;
    }

    if (index > 0) {
      event.preventDefault();
      focusAuthCodeInput(index - 1);
    }
  }

  function handleAuthCodePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedCode = normalizeAuthCode(event.clipboardData.getData("text"));

    if (!pastedCode) {
      return;
    }

    event.preventDefault();
    setAuthCode(pastedCode);
    focusAuthCodeInput(Math.min(pastedCode.length, 3));
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAuthLoading) {
      return;
    }

    const normalizedPhone = normalizeAuthPhoneLogin(authPhone);
    const normalizedCode = normalizeAuthCode(authCode);

    if (!normalizedPhone || normalizedCode.length !== 4) {
      setAuthStatus("Введите телефон и 4-значный код.");
      return;
    }

    setIsAuthLoading(true);
    setAuthStatus("Входим...");

    try {
      const result = await loginToApi(normalizedPhone, normalizedCode);
      const currentUser = await getCurrentUser(result.token);

      setAuthToken(result.token);
      setAuthUser(currentUser.user);
      setAuthCode("");
      setAuthStatus("Вход выполнен");
      if (rememberDevice) {
        saveRememberedAuth({
          expiresAt: result.expiresAt,
          phone: normalizedPhone,
          token: result.token,
          user: currentUser.user
        });
      } else {
        clearRememberedAuth();
      }
      await loadServerOrders(result.token);
    } catch {
        setAuthToken(null);
        setAuthUser(null);
        setServerOrders([]);
        setServerOrdersStatus(null);
        setServerConnectionState("disconnected");
        setAuthStatus("Не удалось войти. Проверьте телефон и код.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  function openDeleteDraftOrderModal(draftOrderId: string) {
    const draftOrder = draftOrders.find((order) => order.id === draftOrderId);

    if (!draftOrder) {
      return;
    }

    const hasServerOrder = Boolean(
      draftOrder.serverOrderId || draftOrder.serverOrderNumber
    );
    const orderTitle =
      draftOrder.serverOrderNumber ?? getDraftOrderCustomerNameLabel(draftOrder);

    setPendingDeleteOrderId(draftOrder.id);
    setPendingDeleteOrderTitle(orderTitle);
    setPendingDeleteOrderDescription(
      hasServerOrder
        ? `Заказ ${draftOrder.serverOrderNumber ?? ""} будет удалён из базы данных.`.trim()
        : "Черновик будет удалён."
    );
    setPendingDeleteOrderError(null);
  }

  function openDeleteOrderModal(order: OrderSummary) {
    setPendingDeleteOrderId(`server-order:${order.id}`);
    setPendingDeleteOrderTitle(order.orderNumber);
    setPendingDeleteOrderDescription(
      `Заказ ${order.orderNumber} будет удалён из базы данных.`
    );
    setPendingDeleteOrderError(null);
  }

  function returnToHomeAfterOrderDelete() {
    setSelectedDraftOrderId(null);
    setActiveDraftOrderId(null);
    setDraftOrderPanelMode("details");
    setIsDraftOrderDetailsOpen(false);
    setIsNewOrderFormOpen(false);
    setOrderDetailStatus(null);
    setActiveSection("Главная");
  }

  async function deleteDraftOrderById(draftOrderId: string) {
    const draftOrder = draftOrders.find((order) => order.id === draftOrderId);

    if (!draftOrder) {
      return;
    }

    const hasServerOrder = Boolean(
      draftOrder.serverOrderId || draftOrder.serverOrderNumber
    );

    if (hasServerOrder) {
      if (!draftOrder.serverOrderId) {
        setDraftOrderSaveStatusById((current) => ({
          ...current,
          [draftOrder.id]: "Не удалось удалить заказ"
        }));
        return;
      }

      if (!authToken) {
        setDraftOrderSaveStatusById((current) => ({
          ...current,
          [draftOrder.id]: "Не удалось удалить заказ: сначала войдите"
        }));
        return;
      }

      try {
        await deleteOrder(draftOrder.serverOrderId, authToken);
        await loadServerOrders(authToken);
      } catch (error) {
        setDraftOrderSaveStatusById((current) => ({
          ...current,
          [draftOrder.id]: `Не удалось удалить заказ: ${
            error instanceof Error ? error.message : "неизвестная ошибка"
          }`
        }));
        return;
      }
    }

    setDraftOrders((orders) =>
      orders.filter((draftOrder) => draftOrder.id !== draftOrderId)
    );
    setActiveDraftOrderId((current) =>
      current === draftOrderId ? null : current
    );
    setSelectedDraftOrderId((current) =>
      current === draftOrderId ? null : current
    );

    returnToHomeAfterOrderDelete();
  }

  async function deleteServerOrderById(orderId: number) {
    if (!authToken) {
      setServerOrdersStatus("Войдите");
      setServerConnectionState("disconnected");
      return;
    }

    setServerOrdersStatus("Удаляем...");

    try {
      await deleteOrder(orderId, authToken);
      setDraftOrders((current) =>
        current.filter((draftOrder) => draftOrder.serverOrderId !== orderId)
      );
      setSelectedDraftOrderId((current) => {
        const currentDraftOrder = draftOrders.find(
          (draftOrder) => draftOrder.id === current
        );

        return currentDraftOrder?.serverOrderId === orderId ? null : current;
      });
      setActiveDraftOrderId((current) => {
        const currentDraftOrder = draftOrders.find(
          (draftOrder) => draftOrder.id === current
        );

        return currentDraftOrder?.serverOrderId === orderId ? null : current;
      });
      setOrderDetailStatus("Заказ удалён");
      await loadServerOrders(authToken);
      returnToHomeAfterOrderDelete();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось удалить заказ";

      setServerOrdersStatus(message);
      throw new Error(message);
    }
  }

  async function confirmPendingDeleteOrder() {
    if (!pendingDeleteOrderId || isDeletingOrder) {
      return;
    }

    setIsDeletingOrder(true);
    setPendingDeleteOrderError(null);

    try {
      if (pendingDeleteOrderId.startsWith("server-order:")) {
        const orderId = Number(pendingDeleteOrderId.replace("server-order:", ""));

        if (!Number.isInteger(orderId) || orderId <= 0) {
          throw new Error("Не удалось удалить заказ");
        }

        await deleteServerOrderById(orderId);
      } else {
        await deleteDraftOrderById(pendingDeleteOrderId);
      }

      setPendingDeleteOrderId(null);
      setPendingDeleteOrderTitle(null);
      setPendingDeleteOrderDescription(null);
    } catch (error) {
      setPendingDeleteOrderError(
        error instanceof Error ? error.message : "Не удалось удалить заказ"
      );
    } finally {
      setIsDeletingOrder(false);
    }
  }

  async function refreshOpenedServerOrder(
    orderId: number,
    existingDraftOrderId?: string
  ) {
    if (!authToken) {
      return null;
    }

    const orderDetail = await getOrder(orderId, authToken);
    const mappedDraftOrder = mapOrderDetailsToDraftOrder(
      orderDetail,
      existingDraftOrderId
    );

    setDraftOrders((current) => {
      const hasExistingDraftOrder = current.some(
        (draftOrder) =>
          draftOrder.id === mappedDraftOrder.id ||
          draftOrder.serverOrderId === mappedDraftOrder.serverOrderId
      );

      if (!hasExistingDraftOrder) {
        return [...current, mappedDraftOrder];
      }

      return current.map((draftOrder) =>
        draftOrder.id === mappedDraftOrder.id ||
        draftOrder.serverOrderId === mappedDraftOrder.serverOrderId
          ? mappedDraftOrder
          : draftOrder
      );
    });
    setSelectedDraftOrderId(mappedDraftOrder.id);

    return mappedDraftOrder;
  }

  function openPaymentPreparationPanel(draftOrder: DraftOrder) {
    setPaymentPreparationDraftOrderId(draftOrder.id);
    setPaymentPreparationStatus(null);
    if (draftOrder.serverOrderId) {
      void loadOrderPayments(draftOrder.serverOrderId);
    }
  }

  function closePaymentPreparationPanel() {
    setPaymentPreparationDraftOrderId(null);
    setPaymentPreparationStatus(null);
  }

  async function handleCopyPaymentPreparationText(draftOrder: DraftOrder) {
    const message = getPaymentPreparationMessage(
      draftOrder,
      paymentPreparationOzonPayment?.payLink
    );

    if (!navigator.clipboard?.writeText) {
      setPaymentPreparationStatus("Скопируйте текст вручную из поля ниже");
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setPaymentPreparationStatus("Текст скопирован");
    } catch {
      setPaymentPreparationStatus("Не удалось скопировать автоматически");
    }
  }

  async function copyTextToClipboard(
    text: string,
    orderId: number,
    successMessage: string
  ) {
    if (!navigator.clipboard?.writeText) {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Скопируйте текст вручную"
      }));
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: successMessage
      }));
    } catch {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Не удалось скопировать автоматически"
      }));
    }
  }

  async function handleCreateOzonPayment(draftOrder: DraftOrder) {
    const orderId = draftOrder.serverOrderId;

    if (!orderId || !authToken) {
      return;
    }

    if (isDraftOrderDeliveryNeedsReview(draftOrder)) {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Проверьте и сохраните доставку перед созданием оплаты."
      }));
      return;
    }

    setOrderPaymentActionByOrderId((current) => ({
      ...current,
      [orderId]: "create"
    }));
    setOrderPaymentsStatusByOrderId((current) => ({
      ...current,
      [orderId]: "Создаём оплату Ozon..."
    }));

    try {
      const result = await createOzonOrderPayment(orderId, authToken);

      setOrderPaymentsByOrderId((current) => {
        const existingPayments = current[orderId] ?? [];
        const nextPayments = [
          result.payment,
          ...existingPayments.filter((payment) => payment.id !== result.payment.id)
        ];

        return {
          ...current,
          [orderId]: nextPayments
        };
      });
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: result.payment.payLink
          ? "Оплата Ozon создана"
          : "Оплата создана, но ссылка не получена"
      }));
    } catch (error) {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: getOzonPaymentErrorMessage(error)
      }));
    } finally {
      setOrderPaymentActionByOrderId((current) => ({
        ...current,
        [orderId]: undefined
      }));
    }
  }

  async function handleSyncOzonPayment(
    draftOrder: DraftOrder,
    payment: OrderPayment
  ) {
    const orderId = draftOrder.serverOrderId;

    if (!orderId || !authToken) {
      return;
    }

    setOrderPaymentActionByOrderId((current) => ({
      ...current,
      [orderId]: "sync"
    }));
    setOrderPaymentsStatusByOrderId((current) => ({
      ...current,
      [orderId]: "Обновляем статус оплаты..."
    }));

    try {
      const result = await syncOrderPayment(orderId, payment.id, authToken);

      setOrderPaymentsByOrderId((current) => {
        const existingPayments = current[orderId] ?? [];
        const nextPayments = [
          result.payment,
          ...existingPayments.filter((item) => item.id !== result.payment.id)
        ];

        return {
          ...current,
          [orderId]: nextPayments
        };
      });
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Статус оплаты обновлён"
      }));
    } catch {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Не удалось обновить статус оплаты"
      }));
    } finally {
      setOrderPaymentActionByOrderId((current) => ({
        ...current,
        [orderId]: undefined
      }));
    }
  }

  async function handleCancelOzonPayment(
    draftOrder: DraftOrder,
    payment: OrderPayment
  ) {
    const orderId = draftOrder.serverOrderId;

    if (!orderId || !authToken) {
      return;
    }

    setOrderPaymentActionByOrderId((current) => ({
      ...current,
      [orderId]: "cancel"
    }));
    setOrderPaymentsStatusByOrderId((current) => ({
      ...current,
      [orderId]: "Отменяем Ozon-оплату..."
    }));

    try {
      const result = await cancelOrderPayment(orderId, payment.id, authToken);

      setOrderPaymentsByOrderId((current) => {
        const existingPayments = current[orderId] ?? [];
        const nextPayments = [
          result.payment,
          ...existingPayments.filter((item) => item.id !== result.payment.id)
        ];

        return {
          ...current,
          [orderId]: nextPayments
        };
      });
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]: "Ozon-оплата отменена. Можно изменить заказ и создать новую оплату."
      }));
      void refreshOpenedServerOrder(orderId, draftOrder.id);
      void loadServerOrders(authToken);
    } catch (error) {
      setOrderPaymentsStatusByOrderId((current) => ({
        ...current,
        [orderId]:
          error instanceof Error
            ? error.message
            : "Не удалось отменить Ozon-оплату"
      }));
    } finally {
      setOrderPaymentActionByOrderId((current) => ({
        ...current,
        [orderId]: undefined
      }));
    }
  }

  function handleCopyOzonPaymentLink(draftOrder: DraftOrder, payment: OrderPayment) {
    const orderId = draftOrder.serverOrderId;

    if (!orderId || !payment.payLink) {
      return;
    }

    void copyTextToClipboard(payment.payLink, orderId, "Ссылка скопирована");
  }

  async function handleOpenOrderDetail(
    order: OrderSummary,
    panelMode: DraftOrderPanelMode = "details"
  ) {
    if (!authToken) {
      setServerOrdersStatus("Войдите");
      setServerConnectionState("disconnected");
      return;
    }

    setActiveWorkspace("Диез Имидж");
    setActiveSection("Заказы");
    setIsNewOrderFormOpen(false);
    setIsDraftOrderDetailsOpen(false);
    setOrderDetailStatus("Загружаем заказ...");
    setIsOrderDetailLoading(true);

    try {
      const orderDetail = await getOrder(order.id, authToken);
      const existingDraftOrder = draftOrders.find(
        (draftOrder) => draftOrder.serverOrderId === orderDetail.id
      );
      const mappedDraftOrder = mapOrderDetailsToDraftOrder(
        orderDetail,
        existingDraftOrder?.id
      );

      setDraftOrders((current) => {
        const hasExistingDraftOrder = current.some(
          (draftOrder) =>
            draftOrder.id === mappedDraftOrder.id ||
            draftOrder.serverOrderId === mappedDraftOrder.serverOrderId
        );

        if (!hasExistingDraftOrder) {
          return [...current, mappedDraftOrder];
        }

        return current.map((draftOrder) =>
          draftOrder.id === mappedDraftOrder.id ||
          draftOrder.serverOrderId === mappedDraftOrder.serverOrderId
            ? mappedDraftOrder
            : draftOrder
        );
      });
      setSelectedDraftOrderId(mappedDraftOrder.id);
      if (panelMode === "customer") {
        setDraftOrderCustomerForm({
          comment: mappedDraftOrder.customer?.comment ?? "",
          email: mappedDraftOrder.customer?.email ?? "",
          name: mappedDraftOrder.customer?.name ?? "",
          phone: formatRussianPhone(mappedDraftOrder.customer?.phone ?? "")
        });
      }
      if (panelMode === "delivery") {
        setDraftOrderDeliveryForm({
          address: mappedDraftOrder.delivery.address ?? "",
          comment: mappedDraftOrder.delivery.comment ?? "",
          contactName: mappedDraftOrder.delivery.contactName ?? "",
          mode: mappedDraftOrder.delivery.mode,
          phone: formatRussianPhone(mappedDraftOrder.delivery.phone ?? "")
        });
      }
      setDraftOrderPanelMode(panelMode);
      setIsDraftOrderDetailsOpen(true);
      setOrderDetailStatus(null);
      setServerConnectionState("connected");
      void loadOrderAttachments(orderDetail.id, authToken);
      void loadOrderPayments(orderDetail.id, authToken);
    } catch {
      setOrderDetailStatus("Не удалось открыть заказ");
      setServerConnectionState("disconnected");
    } finally {
      setIsOrderDetailLoading(false);
    }
  }

  async function handleSaveDraftOrderToDatabase(draftOrder: DraftOrder) {
    if (!authToken) {
      setDraftOrderSaveStatusById((current) => ({
        ...current,
        [draftOrder.id]: "Не удалось завершить приём заказа: сначала войдите"
      }));
      return;
    }

    setDraftOrderSaveStatusById((current) => ({
      ...current,
      [draftOrder.id]: "Создаём заказ..."
    }));

    try {
      const cdekSaveRequest =
        draftOrder.delivery.mode === "cdek"
          ? getCdekSaveRequestFromDraftDelivery(draftOrder.delivery)
          : null;
      const createOrderPayload = cdekSaveRequest
        ? {
            ...draftOrder,
            totalPriceMinor: getDraftOrderTotalMinor(draftOrder.items)
          }
        : draftOrder;
      const result = await createOrderFromDraft(createOrderPayload, authToken);
      let savedCdekResult: CdekSaveDeliveryResult | null = null;

      if (cdekSaveRequest) {
        setDraftOrderSaveStatusById((current) => ({
          ...current,
          [draftOrder.id]: "Сохраняем СДЭК-доставку..."
        }));
        savedCdekResult = await saveCdekDelivery(
          result.id,
          cdekSaveRequest,
          authToken
        );
      }

      const savedAt = new Date().toISOString();

      updateDraftOrder(draftOrder.id, (currentDraftOrder) => ({
        ...currentDraftOrder,
        delivery: savedCdekResult
          ? {
              ...currentDraftOrder.delivery,
              address:
                savedCdekResult.delivery.addressText ??
                currentDraftOrder.delivery.address,
              contactName:
                savedCdekResult.delivery.recipientName ??
                currentDraftOrder.delivery.contactName,
              currencyCode: savedCdekResult.delivery.currencyCode,
              mode: "cdek",
              phone:
                savedCdekResult.delivery.recipientPhone ??
                currentDraftOrder.delivery.phone,
              priceMinor: savedCdekResult.delivery.priceMinor,
              providerPayload: savedCdekResult.delivery.providerPayload
            }
          : currentDraftOrder.delivery,
        serverOrderId: result.id,
        serverOrderNumber: result.orderNumber,
        serverOrderSavedAt: savedAt,
        totalPriceMinor:
          savedCdekResult?.totals.totalPriceMinor ??
          currentDraftOrder.totalPriceMinor
      }));

      setDraftOrderSaveStatusById((current) => ({
        ...current,
        [draftOrder.id]: savedCdekResult
          ? `Заказ создан: ${result.orderNumber}. СДЭК-доставка сохранена.`
          : result.alreadyExists
            ? `Заказ уже создан: ${result.orderNumber}`
            : `Заказ создан: ${result.orderNumber}`
      }));
      void loadServerOrders(authToken);
    } catch (error) {
      setDraftOrderSaveStatusById((current) => ({
        ...current,
        [draftOrder.id]: `Не удалось завершить приём заказа: ${
          error instanceof Error ? error.message : "неизвестная ошибка"
        }`
      }));
    }
  }

  function handleAddItemToDraftOrder(draftOrder: DraftOrder) {
    openServiceSelectionForDraft(draftOrder.id);
  }

  if (isRestoringAuth && !authToken && !authUser) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Диез Имидж</p>
              <h1>Проверяем вход...</h1>
              <p>Если сессия действительна, приложение откроется автоматически.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!authToken || !authUser) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Диез Имидж</p>
              <h1>Вход в Control Center</h1>
              <p>Введите номер телефона и код</p>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label className="form-field">
              <span>Телефон</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                onChange={(event) => setAuthPhone(formatRussianPhone(event.target.value))}
                placeholder="+7 999 000 00 00"
                value={authPhone}
              />
            </label>

            <label className="form-field">
              <span>Код</span>
              <div className="auth-code-row">
                {Array.from({ length: 4 }).map((_, index) => (
                  <input
                    aria-label={`Цифра кода ${index + 1}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    className="auth-code-input"
                    inputMode="numeric"
                    key={index}
                    maxLength={1}
                    onChange={(event) => updateAuthCodeDigit(index, event.target.value)}
                    onKeyDown={(event) => handleAuthCodeKeyDown(event, index)}
                    onPaste={handleAuthCodePaste}
                    ref={(element) => {
                      authCodeInputRefs.current[index] = element;
                    }}
                    type="text"
                    value={authCode[index]?.trim() ?? ""}
                  />
                ))}
              </div>
            </label>

            <label className="auth-remember-row">
              <input
                checked={rememberDevice}
                onChange={(event) => setRememberDevice(event.target.checked)}
                type="checkbox"
              />
              <span>Запомнить это устройство</span>
            </label>

            <p className="auth-small-note">
              Код не сохраняется.
            </p>

            {authStatus ? <p className="auth-status">{authStatus}</p> : null}

            <button
              className="primary-action-button"
              disabled={isAuthLoading}
              type="submit"
            >
              {isAuthLoading ? "Входим..." : "Войти"}
            </button>
          </form>

        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {addedDraftItemFeedback ? (
        <div className="app-toast app-toast-success" role="status">
          <strong>Позиция добавлена</strong>
          <span>
            {addedDraftItemFeedback.itemTitle} —{" "}
            {addedDraftItemFeedback.itemPriceLabel}
          </span>
        </div>
      ) : null}

      {pendingDeleteOrderId ? (
        <div
          aria-modal="true"
          className="app-modal-backdrop"
          role="dialog"
        >
          <section className="app-modal">
            <div>
              <p className="eyebrow">{pendingDeleteOrderTitle}</p>
              <h2>Удалить заказ?</h2>
              <p>{pendingDeleteOrderDescription}</p>
            </div>

            {pendingDeleteOrderError ? (
              <p className="auth-status">{pendingDeleteOrderError}</p>
            ) : null}

            <div className="app-modal-actions">
              <button
                className="secondary-action-button"
                disabled={isDeletingOrder}
                onClick={() => {
                  setPendingDeleteOrderId(null);
                  setPendingDeleteOrderTitle(null);
                  setPendingDeleteOrderDescription(null);
                  setPendingDeleteOrderError(null);
                }}
                type="button"
              >
                Отмена
              </button>
              <button
                className="danger-action-button"
                disabled={isDeletingOrder}
                onClick={() => void confirmPendingDeleteOrder()}
                type="button"
              >
                {isDeletingOrder ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isManagerCommentEditorOpen ? (
        <div
          aria-modal="true"
          className="app-modal-backdrop manager-comment-modal"
          role="dialog"
        >
          <section className="app-modal manager-comment-content">
            <div className="manager-comment-header">
              <div>
                <h2>Комментарий менеджера</h2>
              </div>
              <button
                aria-label="Закрыть комментарий"
                className="attachment-preview-close-button"
                onClick={cancelManagerCommentEditor}
                title="Закрыть"
                type="button"
              >
                ×
              </button>
            </div>
            <label className="form-field">
              <span>Внутренний комментарий к позиции</span>
              <textarea
                autoFocus
                className="manager-comment-textarea"
                placeholder="Добавьте заметку для производства или менеджера"
                value={managerCommentEditorDraft}
                onChange={(event) =>
                  setManagerCommentEditorDraft(event.target.value)
                }
              />
            </label>
            <div className="app-modal-actions">
              <button
                className="secondary-action-button"
                onClick={cancelManagerCommentEditor}
                type="button"
              >
                Отмена
              </button>
              <button
                className="primary-action-button manager-comment-confirm-button"
                onClick={confirmManagerCommentEditor}
                type="button"
              >
                Подтвердить
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {attachmentPreview ? (
        <div
          aria-modal="true"
          className="app-modal-backdrop attachment-preview-modal"
          role="dialog"
        >
          <section className="app-modal attachment-preview-content">
            <div className="attachment-preview-header">
              <div>
                <p className="eyebrow">
                  {getAttachmentTypeLabel(attachmentPreview.attachment.attachmentType)}
                </p>
                <h2>{attachmentPreview.attachment.originalFileName}</h2>
              </div>
              <div className="app-modal-actions attachment-preview-actions">
                <button
                  className="secondary-action-button attachment-download-button"
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDownloadAttachment(attachmentPreview.attachment);
                  }}
                  title="Скачать файл"
                  type="button"
                >
                  <img alt="" src={downloadIconUrl} />
                </button>
                <button
                  aria-label="Закрыть предпросмотр"
                  className="attachment-preview-close-button"
                  onClick={closeAttachmentPreview}
                  title="Закрыть предпросмотр"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>

            {attachmentPreview.objectUrl &&
            isImageAttachment(attachmentPreview.attachment) ? (
              <img
                alt={attachmentPreview.attachment.originalFileName}
                className="attachment-preview-image"
                src={attachmentPreview.objectUrl}
              />
            ) : attachmentPreview.objectUrl &&
              isPdfAttachment(attachmentPreview.attachment) ? (
              <iframe
                className="attachment-preview-frame"
                src={attachmentPreview.objectUrl}
                title={attachmentPreview.attachment.originalFileName}
              />
            ) : (
              <div className="attachment-preview-file">
                <div className="attachment-card-file">
                  <span>{getAttachmentFileKindLabel(attachmentPreview.attachment)}</span>
                  <strong>{getAttachmentTypeLabel(attachmentPreview.attachment.attachmentType)}</strong>
                </div>
                <div>
                  <h3>Предпросмотр недоступен</h3>
                  <p>
                    {attachmentPreview.attachment.originalFileName}
                    {formatAttachmentFileSize(attachmentPreview.attachment.fileSize)
                      ? ` · ${formatAttachmentFileSize(
                          attachmentPreview.attachment.fileSize
                        )}`
                      : ""}
                  </p>
                </div>
                <button
                  className="secondary-action-button attachment-preview-download"
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDownloadAttachment(attachmentPreview.attachment)
                  }}
                  type="button"
                >
                  <img alt="" src={downloadIconUrl} />
                  Скачать
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {paymentPreparationDraftOrder ? (
        <div
          aria-modal="true"
          className="app-modal-backdrop payment-preparation-modal"
          role="dialog"
        >
          <section className="app-modal payment-preparation-content">
            <div className="payment-preparation-header">
              <div>
                <p className="eyebrow">
                  {paymentPreparationDraftOrder.serverOrderNumber ??
                    "Локальный заказ"}
                </p>
                <h2>Подготовка оплаты</h2>
              </div>
              <button
                aria-label="Закрыть подготовку оплаты"
                className="attachment-preview-close-button"
                onClick={closePaymentPreparationPanel}
                title="Закрыть подготовку оплаты"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="payment-preparation-details">
              <span>Номер заказа</span>
              <strong>
                {paymentPreparationDraftOrder.serverOrderNumber ?? "Не создан"}
              </strong>
              <span>Клиент</span>
              <strong>
                {paymentPreparationDraftOrder.customer?.name?.trim() ||
                  "Не указан"}
              </strong>
              <span>Телефон</span>
              <strong>
                {paymentPreparationDraftOrder.customer?.phone
                  ? formatRussianPhone(paymentPreparationDraftOrder.customer.phone)
                  : "Не указан"}
              </strong>
              <span>Email</span>
              <strong>
                {paymentPreparationDraftOrder.customer?.email?.trim() ||
                  "Не указан"}
              </strong>
              <span>Сумма</span>
              <strong>
                {paymentPreparationDraftOrder.totalPriceMinor > 0
                  ? formatMinorPrice(
                      paymentPreparationDraftOrder.totalPriceMinor,
                      "RUB"
                    )
                  : "Требует расчёта"}
              </strong>
              <span>Способ оплаты</span>
              <strong>Оплата Ozon Pay</strong>
            </div>

            {renderPaymentPreparationOzonPanel(paymentPreparationDraftOrder)}

            <label className="form-field payment-message-field">
              <span>Текст для клиента</span>
              <textarea
                readOnly
                rows={5}
                value={getPaymentPreparationMessage(
                  paymentPreparationDraftOrder,
                  paymentPreparationOzonPayment?.payLink
                )}
              />
            </label>

            {paymentPreparationStatus ? (
              <p className="draft-summary-muted">{paymentPreparationStatus}</p>
            ) : null}

            <div className="app-modal-actions">
              <button
                className="secondary-action-button"
                onClick={closePaymentPreparationPanel}
                type="button"
              >
                Закрыть
              </button>
              <button
                className="primary-action-button"
                onClick={() =>
                  void handleCopyPaymentPreparationText(
                    paymentPreparationDraftOrder
                  )
                }
                type="button"
              >
                Скопировать текст
              </button>
            </div>
          </section>
        </div>
      ) : null}

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
            className={
              serverConnectionState === "connected"
                ? "server-db-status-icon server-db-status-icon-connected"
                : "server-db-status-icon server-db-status-icon-disconnected"
            }
            title={
              serverConnectionState === "connected"
                ? "Подключено к базе данных на сервере"
                : "Нет подключения к базе данных на сервере"
            }
          >
            <img alt="" src={cloudNetworkIconUrl} />
          </span>
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
              setActiveSettingsSection(settingsHomeSection);
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
          <section className="activity-feed-panel">
            <div className="feed-title-row">
              <h2>Лента</h2>
              {serverOrdersStatus ? (
                <span className="feed-sync-status">{serverOrdersStatus}</span>
              ) : null}
            </div>

            <div className="feed-order-section">
              <div className="feed-section-heading">
                <strong>Заказы</strong>
              </div>

              {serverOrders.length > 0 ? (
                <div className="feed-order-list">
                  {serverOrders.map((order) => {
                    const hasCustomer = Boolean(
                      order.customerName?.trim() || order.customerPhone?.trim()
                    );
                    const deliveryState = getOrderSummaryDeliveryState(
                      order,
                      draftOrders
                    );

                    return (
                      <article
                        className="server-order-card feed-order-card"
                        key={order.id}
                        onClick={() => void handleOpenOrderDetail(order)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleOpenOrderDetail(order);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="server-order-card-content">
                          <strong>{order.orderNumber}</strong>
                          <span>{getOrderSummaryCustomerLabel(order)}</span>
                          <span>{getOrderSummaryItemLabel(order)}</span>
                          {isDtfQuoteRequestSummary(order) ? (
                            <span className="quote-required-label">Требует расчёта</span>
                          ) : (
                            <em>
                              Итого:{" "}
                              {formatMinorPrice(order.totalPriceMinor, order.currencyCode)}
                            </em>
                          )}
                          <small>
                            Статус: {getDatabaseOrderDisplayStatus(order.status)}
                          </small>
                        </div>
                        <div className="draft-feed-card-actions">
                          <button
                            aria-label="Удалить заказ"
                            className="draft-feed-icon-button draft-feed-icon-button-trash"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteOrderModal(order);
                            }}
                            title="Удалить заказ"
                            type="button"
                          >
                            <img alt="" src={trashIconUrl} />
                          </button>
                        </div>
                        <div className="draft-feed-card-indicators">
                          <button
                            aria-label={
                              hasCustomer ? "Заказчик заполнен" : "Заказчик не заполнен"
                            }
                            className={
                              hasCustomer
                                ? "draft-feed-indicator draft-feed-indicator-ok"
                                : "draft-feed-indicator draft-feed-indicator-alert"
                            }
                            title={
                              hasCustomer ? "Заказчик заполнен" : "Заказчик не заполнен"
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleOpenOrderDetail(order, "customer");
                            }}
                            type="button"
                          >
                            <img alt="" src={userIconUrl} />
                          </button>
                          <button
                            aria-label={
                              deliveryState === "not-required"
                                ? "Доставка не требуется"
                                : "Доставка оформлена"
                            }
                            className="draft-feed-indicator draft-feed-indicator-ok"
                            title={
                              deliveryState === "not-required"
                                ? "Доставка не требуется"
                                : "Доставка оформлена"
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleOpenOrderDetail(order, "delivery");
                            }}
                            type="button"
                          >
                            <img
                              alt=""
                              src={
                                deliveryState === "not-required"
                                  ? truckOffIconUrl
                                  : truckIconUrl
                              }
                            />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="server-orders-empty">
                  {isServerOrdersLoading ? "Загружаем заказы..." : "Заказов пока нет"}
                </p>
              )}
            </div>

            {localDraftOrders.length > 0 && (
              <div className="feed-order-section">
                <div className="feed-section-heading">
                  <strong>Черновики</strong>
                </div>

                <div className="draft-feed-list">
                  {localDraftOrders.map((draftOrder) => {
                    const isCustomerFilled = isDraftOrderCustomerFilled(
                      draftOrder.customer
                    );
                    const deliveryState = getDraftOrderDeliveryState(
                      draftOrder.delivery
                    );
                    const isRecentlyUpdated =
                      addedDraftItemFeedback?.draftOrderId === draftOrder.id;

                    return (
                      <div
                        className={
                          [
                            "draft-feed-card",
                            draftOrder.id === selectedDraftOrderId
                              ? "draft-feed-card-active"
                              : null,
                            isRecentlyUpdated ? "draft-feed-card-flash" : null
                          ]
                            .filter(Boolean)
                            .join(" ")
                        }
                        key={draftOrder.id}
                        onClick={() => handleSelectDraftOrder(draftOrder.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectDraftOrder(draftOrder.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="draft-feed-card-content">
                          {draftOrder.serverOrderNumber ? (
                            <span className="draft-feed-order-number">
                              {draftOrder.serverOrderNumber}
                            </span>
                          ) : null}
                          <strong>{getDraftOrderCustomerNameLabel(draftOrder)}</strong>
                          {getDraftOrderCustomerPhoneLabel(draftOrder) ? (
                            <span>{getDraftOrderCustomerPhoneLabel(draftOrder)}</span>
                          ) : null}
                          <span>{getDraftOrderSummary(draftOrder)}</span>
                          <span>
                            Итого: {formatMinorPrice(draftOrder.totalPriceMinor, "RUB")}
                          </span>
                          <em>
                            Статус: {getDraftOrderDisplayStatus(draftOrder)}
                          </em>
                        </div>
                        <div className="draft-feed-card-actions">
                          <button
                            aria-label={
                              draftOrder.serverOrderId || draftOrder.serverOrderNumber
                                ? "Удалить заказ"
                                : "Удалить черновик"
                            }
                            className="draft-feed-icon-button draft-feed-icon-button-trash"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteDraftOrderModal(draftOrder.id);
                            }}
                            title={
                              draftOrder.serverOrderId || draftOrder.serverOrderNumber
                                ? "Удалить заказ"
                                : "Удалить черновик"
                            }
                            type="button"
                          >
                            <img alt="" src={trashIconUrl} />
                          </button>
                        </div>
                        <div className="draft-feed-card-indicators">
                          <button
                            aria-label={
                              isCustomerFilled
                                ? "Заказчик заполнен"
                                : "Заказчик не заполнен"
                            }
                            className={
                              isCustomerFilled
                                ? "draft-feed-indicator draft-feed-indicator-ok"
                                : "draft-feed-indicator draft-feed-indicator-alert"
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              openDraftOrderCustomerForm(draftOrder);
                            }}
                            title={
                              isCustomerFilled
                                ? "Заказчик заполнен"
                                : "Заказчик не заполнен"
                            }
                            type="button"
                          >
                            <img alt="" src={userIconUrl} />
                          </button>
                          <button
                            aria-label={
                              deliveryState === "not-required"
                                ? "Доставка не требуется"
                                : deliveryState === "filled"
                                  ? "Доставка заполнена"
                                  : "Доставка не заполнена"
                            }
                            className={
                              deliveryState === "missing"
                                ? "draft-feed-indicator draft-feed-indicator-alert"
                                : "draft-feed-indicator draft-feed-indicator-ok"
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              openDraftOrderDeliveryForm(draftOrder);
                            }}
                            title={
                              deliveryState === "not-required"
                                ? "Доставка не требуется"
                                : deliveryState === "filled"
                                  ? "Доставка заполнена"
                                : "Доставка не заполнена"
                            }
                            type="button"
                          >
                            <img
                              alt=""
                              src={
                                deliveryState === "not-required"
                                  ? truckOffIconUrl
                                : truckIconUrl
                              }
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
              {!isNewOrderFormOpen && !isDraftOrderDetailsOpen && !isOrderDetailLoading ? (
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

              {isOrderDetailLoading ? (
                <section className="order-form-panel">
                  <p className="draft-summary-muted">
                    {orderDetailStatus ?? "Загружаем заказ..."}
                  </p>
                </section>
              ) : null}

              {isDraftOrderDetailsOpen && detailDraftOrder ? (
                <>
                <section className="order-form-panel draft-order-detail-panel">
                  <div className="section-heading">
                    <InnerPageHeader
                      onBack={() => {
                        if (draftOrderPanelMode === "details") {
                          setIsDraftOrderDetailsOpen(false);
                        } else {
                          setDraftOrderPanelMode("details");
                        }
                      }}
                      title={
                        draftOrderPanelMode === "customer"
                          ? "Заказчик"
                          : draftOrderPanelMode === "delivery"
                            ? "Доставка"
                            : getDraftOrderDetailsTitle(detailDraftOrder)
                      }
                    />
                  </div>
                  {draftOrderPanelMode === "details" ? (
                    <div className="draft-order-overview">
                      <strong>
                        {detailDraftOrder.serverOrderNumber ?? "Локальный заказ"}
                      </strong>
                      <span>
                        Заказчик: {getDraftOrderCustomerNameLabel(detailDraftOrder)}
                      </span>
                      <span>Позиций: {detailDraftOrder.items.length}</span>
                      <span>
                        Итого:{" "}
                        {formatMinorPrice(detailDraftOrder.totalPriceMinor, "RUB")}
                      </span>
                      <em>
                        Статус: {getDraftOrderDisplayStatus(detailDraftOrder)}
                      </em>
                    </div>
                  ) : null}

                  {draftOrderPanelMode === "customer" ? (
                    <section className="draft-items-panel draft-items-panel-detail draft-contact-panel">
                      <div className="section-heading">
                        <div>
                          <h3>Черновик заказа</h3>
                        </div>
                      </div>

                      <div className="order-form-grid">
                        <label className="form-field">
                          <span>Имя / компания</span>
                          <input
                            value={draftOrderCustomerForm.name}
                            onChange={(event) =>
                              setDraftOrderCustomerForm((current) => ({
                                ...current,
                                name: event.target.value
                              }))
                            }
                          />
                        </label>

                        <label className="form-field">
                          <span>Телефон</span>
                          <input
                            autoComplete="tel"
                            inputMode="numeric"
                            value={draftOrderCustomerForm.phone || "+7"}
                            onChange={(event) =>
                              setDraftOrderCustomerForm((current) => ({
                                ...current,
                                phone: formatRussianPhone(event.target.value)
                              }))
                            }
                            onBlur={(event) =>
                              setDraftOrderCustomerForm((current) => ({
                                ...current,
                                phone: formatRussianPhone(event.target.value)
                              }))
                            }
                          />
                        </label>

                        <label className="form-field">
                          <span>Email</span>
                          <input
                            value={draftOrderCustomerForm.email}
                            onChange={(event) =>
                              setDraftOrderCustomerForm((current) => ({
                                ...current,
                                email: event.target.value
                              }))
                            }
                          />
                        </label>

                        <label className="form-field form-field-wide">
                          <span>Комментарий</span>
                          <textarea
                            value={draftOrderCustomerForm.comment}
                            onChange={(event) =>
                              setDraftOrderCustomerForm((current) => ({
                                ...current,
                                comment: event.target.value
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="draft-order-footer">
                        <button
                          className="primary-action-button"
                          onClick={() =>
                            handleSaveDraftOrderCustomer(detailDraftOrder.id)
                          }
                          type="button"
                        >
                          Сохранить
                        </button>
                      </div>
                    </section>
                  ) : draftOrderPanelMode === "delivery" ? (
                    <section className="draft-items-panel draft-items-panel-detail draft-contact-panel">
                      <div className="section-heading">
                        <div>
                          <h3>Черновик заказа</h3>
                        </div>
                      </div>

                      <div className="delivery-mode-panel">
                        <span>Способ доставки</span>
                        <div className="delivery-mode-options">
                          <button
                            className={
                              draftOrderDeliveryForm.mode === "not-required"
                                ? "delivery-mode-option delivery-mode-option-active"
                                : "delivery-mode-option"
                            }
                            onClick={() =>
                              setDraftOrderDeliveryForm((current) => ({
                                ...current,
                                mode: "not-required"
                              }))
                            }
                            type="button"
                          >
                            Доставка не требуется
                          </button>
                          <button
                            className={
                              draftOrderDeliveryForm.mode === "manual"
                                ? "delivery-mode-option delivery-mode-option-active"
                                : "delivery-mode-option"
                            }
                            onClick={() =>
                              setDraftOrderDeliveryForm((current) => ({
                                ...current,
                                mode: "manual"
                              }))
                            }
                            type="button"
                          >
                            Ручная доставка
                          </button>
                          <button
                            className={
                              draftOrderDeliveryForm.mode === "cdek"
                                ? "delivery-mode-option delivery-mode-option-active"
                                : "delivery-mode-option"
                            }
                            onClick={() =>
                              setDraftOrderDeliveryForm((current) => ({
                                ...current,
                                mode: "cdek"
                              }))
                            }
                            type="button"
                          >
                            СДЭК
                          </button>
                        </div>
                      </div>

                      {draftOrderDeliveryForm.mode === "not-required" ? (
                        <p className="draft-summary-muted">
                          Доставка для этого заказа не требуется.
                        </p>
                      ) : draftOrderDeliveryForm.mode === "cdek" ? (
                        <div
                          className={[
                            "delivery-cdek-panel",
                            cdekPanelState.saveResult &&
                            !cdekPanelState.isEditingSavedDelivery
                              ? "delivery-cdek-panel-summary"
                              : null,
                            isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                              ? "delivery-cdek-panel-review"
                              : null
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="delivery-cdek-header">
                            <div>
                              <strong>СДЭК</strong>
                              <span>{getCdekIntegrationLabel(cdekPanelState.status)}</span>
                            </div>
                            <button
                              className="delivery-cdek-status-button"
                              disabled={cdekPanelState.isLoadingStatus}
                              onClick={() => void refreshCdekStatus()}
                              type="button"
                            >
                              {cdekPanelState.isLoadingStatus
                                ? "Проверяем..."
                                : "Проверить"}
                            </button>
                          </div>

                          <p
                            className={
                              isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                ? "delivery-cdek-save-note delivery-cdek-save-note-warning"
                                : cdekPanelState.saveResult
                                ? "delivery-cdek-save-note delivery-cdek-save-note-success"
                                : "delivery-cdek-save-note"
                            }
                          >
                            {isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                              ? "Заказ изменён. Проверьте вес/габариты и сохраните доставку перед оплатой."
                              : cdekPanelState.saveResult
                              ? "СДЭК-доставка сохранена в заказ. Отправление СДЭК ещё не создано."
                              : "Расчёт не сохранён в заказ. Сохраните доставку, чтобы добавить её стоимость в итог заказа."}
                          </p>

                          {cdekPanelState.message ? (
                            <p className="delivery-cdek-message">
                              {cdekPanelState.message}
                            </p>
                          ) : null}

                          {cdekPanelState.saveResult &&
                          !cdekPanelState.isEditingSavedDelivery ? (
                            <div className="delivery-cdek-summary-card">
                              <div className="delivery-cdek-summary-header">
                                <div>
                                  <strong>
                                    {isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                      ? "СДЭК-доставка требует проверки"
                                      : "СДЭК-доставка сохранена"}
                                  </strong>
                                  <span>
                                    {isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                      ? "Заказ изменён после сохранения доставки"
                                      : "Отправление СДЭК ещё не создано"}
                                  </span>
                                </div>
                              </div>
                              <p
                                className={
                                  isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                    ? "delivery-cdek-save-note delivery-cdek-save-note-warning"
                                    : "delivery-cdek-save-note"
                                }
                              >
                                {getCdekFutureShipmentNotice(
                                  detailDraftOrder,
                                  detailDraftOrder.serverOrderId
                                    ? orderPaymentsByOrderId[
                                        detailDraftOrder.serverOrderId
                                      ] ?? []
                                    : []
                                )}
                              </p>
                              <dl className="delivery-cdek-summary-list">
                                <div>
                                  <dt>Откуда</dt>
                                  <dd>
                                    {getCdekRouteSummary(
                                      cdekPanelState.selectedSenderCity,
                                      cdekPanelState.selectedSenderDeliveryPoint,
                                      cdekPanelState.senderCityQuery
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Куда</dt>
                                  <dd>
                                    {getCdekRouteSummary(
                                      cdekPanelState.selectedCity,
                                      cdekPanelState.selectedDeliveryPoint,
                                      cdekPanelState.cityQuery
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Тариф</dt>
                                  <dd>
                                    {formatCdekTariffWorkLabel(
                                      cdekPanelState.selectedTariff
                                    )}
                                    {formatCdekTariffCode(
                                      cdekPanelState.selectedTariff
                                    ) ? (
                                      <span className="delivery-cdek-code">
                                        {formatCdekTariffCode(
                                          cdekPanelState.selectedTariff
                                        )}
                                      </span>
                                    ) : null}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Стоимость</dt>
                                  <dd>
                                    {getCdekCalculationPriceLabel(
                                      cdekPanelState.calculationResult
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Срок</dt>
                                  <dd>
                                    {getCdekCalculationPeriodLabel(
                                      cdekPanelState.calculationResult
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Груз</dt>
                                  <dd>{getCdekCargoSummary(cdekPanelState)}</dd>
                                </div>
                              </dl>
                              <div className="delivery-cdek-summary-actions">
                                {isDraftOrderDeliveryNeedsReview(detailDraftOrder) ? (
                                  <button
                                    className="primary-action-button"
                                    disabled={
                                      cdekPanelState.isSaving ||
                                      !canSubmitCdekDelivery(cdekPanelState)
                                    }
                                    onClick={() =>
                                      void handleSaveCdekDelivery(detailDraftOrder)
                                    }
                                    type="button"
                                  >
                                    {cdekPanelState.isSaving
                                      ? "Сохраняем..."
                                      : "Подтвердить доставку"}
                                  </button>
                                ) : null}
                                <button
                                  className="secondary-action-button"
                                  onClick={() =>
                                    setCdekPanelState((current) => ({
                                      ...createCdekPanelStateFromSavedDelivery(
                                        detailDraftOrder,
                                        current.status
                                      ),
                                      isEditingSavedDelivery: true
                                    }))
                                  }
                                  type="button"
                                >
                                  Изменить доставку
                                </button>
                                <button
                                  className="secondary-action-button"
                                  onClick={() =>
                                    setCdekPanelState((current) => ({
                                      ...createCdekPanelStateFromSavedDelivery(
                                        detailDraftOrder,
                                        current.status
                                      ),
                                      isEditingSavedDelivery: true
                                    }))
                                  }
                                  type="button"
                                >
                                  Пересчитать
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <div className="delivery-cdek-form">
                            <section className="delivery-cdek-section delivery-cdek-route-section">
                              <div className="delivery-cdek-section-header">
                                <div>
                                  <strong>Маршрут</strong>
                                </div>
                              </div>

                              <div className="delivery-cdek-route-grid">
                                <div className="delivery-cdek-route-field">
                                  <label className="form-field">
                                    <span>Город отправителя</span>
                                    <div className="delivery-cdek-picker">
                                      <div className="delivery-cdek-search-field">
                                        <input
                                          placeholder="Например, Ливны"
                                          value={cdekPanelState.senderCityQuery}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => ({
                                              ...current,
                                              activePicker: "senderCity",
                                              calculationResult: null,
                                              hasSearchedSenderCities: false,
                                              saveResult: null,
                                              selectedSenderCity: null,
                                              selectedSenderDeliveryPoint: null,
                                              selectedTariff: null,
                                              senderDeliveryPointFilter: "",
                                              senderCityQuery: event.target.value,
                                              senderCityResults: [],
                                              senderDeliveryPointResults: [],
                                              senderDeliveryPointResultsCityCode:
                                                null,
                                              shipmentPointCode: "",
                                              tariffCode: "",
                                              tariffResults: []
                                            }))
                                          }
                                          onFocus={() => openCdekPicker("senderCity")}
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              void handleSearchCdekSenderCities();
                                            }
                                          }}
                                        />
                                      </div>
                                      {cdekPanelState.activePicker === "senderCity" &&
                                      (cdekPanelState.isLoadingSenderCities ||
                                        cdekPanelState.senderCityResults.length > 0 ||
                                        cdekPanelState.hasSearchedSenderCities) ? (
                                        <div className="delivery-cdek-list">
                                          {cdekPanelState.isLoadingSenderCities ? (
                                            <div className="delivery-cdek-list-empty">
                                              Ищем город...
                                            </div>
                                          ) : cdekPanelState.senderCityResults.length >
                                            0 ? (
                                            cdekPanelState.senderCityResults.map((city) => (
                                              <button
                                                className={
                                                  cdekPanelState.selectedSenderCity
                                                    ?.code === city.code
                                                    ? "delivery-cdek-list-item delivery-cdek-list-item-active"
                                                    : "delivery-cdek-list-item"
                                                }
                                                key={`sender-${city.code ?? city.cityUuid ?? city.fullName}`}
                                                onClick={() =>
                                                  setCdekPanelState((current) => ({
                                                    ...current,
                                                    activePicker: null,
                                                    calculationResult: null,
                                                    message: null,
                                                    saveResult: null,
                                                    selectedSenderCity: city,
                                                    selectedSenderDeliveryPoint: null,
                                                    selectedTariff: null,
                                                    senderDeliveryPointFilter: "",
                                                    senderCityQuery:
                                                      formatCdekCityLabel(city),
                                                    senderCityResults: [],
                                                    senderDeliveryPointResults: [],
                                                    senderDeliveryPointResultsCityCode:
                                                      null,
                                                    shipmentPointCode: "",
                                                    tariffCode: "",
                                                    tariffResults: []
                                                  }))
                                                }
                                                type="button"
                                              >
                                                <strong>
                                                  {city.city ?? city.fullName}
                                                </strong>
                                                <span>{formatCdekCitySubtitle(city)}</span>
                                              </button>
                                            ))
                                          ) : (
                                            <div className="delivery-cdek-list-empty">
                                              Город не найден
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  </label>
                                  <label className="delivery-cdek-select-label">
                                    <span>Пункт отправки</span>
                                    <button
                                      className="delivery-cdek-select-field"
                                      disabled={
                                        !getCdekCityCode(
                                          cdekPanelState.selectedSenderCity
                                        )
                                      }
                                      onClick={() => {
                                        if (
                                          !getCdekCityCode(
                                            cdekPanelState.selectedSenderCity
                                          )
                                        ) {
                                          return;
                                        }
                                        openCdekPicker("senderPoint");
                                        void handleLoadCdekSenderDeliveryPoints();
                                      }}
                                      type="button"
                                    >
                                      <strong>
                                        {cdekPanelState.selectedSenderCity
                                          ? getCdekPointSelectLabel(
                                              cdekPanelState.selectedSenderCity,
                                              cdekPanelState.selectedSenderDeliveryPoint,
                                              cdekPanelState.senderCityQuery
                                            ) || "Выберите пункт отправки"
                                          : "Выберите город отправителя"}
                                      </strong>
                                      <span>▾</span>
                                    </button>
                                  </label>
                                  {cdekPanelState.activePicker === "senderPoint" ? (
                                    <div className="delivery-cdek-picker">
                                      <div className="delivery-cdek-list delivery-cdek-list-static">
                                        <input
                                          className="delivery-cdek-dropdown-filter"
                                          placeholder="Поиск по адресу"
                                          value={cdekPanelState.senderDeliveryPointFilter}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => ({
                                              ...current,
                                              senderDeliveryPointFilter:
                                                event.target.value
                                            }))
                                          }
                                        />
                                        {cdekPanelState.isLoadingSenderDeliveryPoints ? (
                                          <div className="delivery-cdek-list-empty">
                                            Ищем...
                                          </div>
                                        ) : (
                                          (() => {
                                            const points = filterCdekDeliveryPoints(
                                              cdekPanelState.senderDeliveryPointResults,
                                              cdekPanelState.senderDeliveryPointFilter
                                            );

                                            return points.length > 0 ? (
                                              <>
                                                <div className="delivery-cdek-list-count">
                                                  Показано {points.length} пунктов
                                                </div>
                                                {points.map((point) => (
                                                  <button
                                                    className={
                                                      cdekPanelState
                                                        .selectedSenderDeliveryPoint
                                                        ?.code === point.code
                                                        ? "delivery-cdek-list-item delivery-cdek-list-item-active"
                                                        : "delivery-cdek-list-item"
                                                    }
                                                    key={`sender-${point.code ?? point.uuid ?? point.address}`}
                                                    onClick={() =>
                                                      setCdekPanelState((current) => ({
                                                        ...current,
                                                        activePicker: null,
                                                        calculationResult: null,
                                                        message: null,
                                                        saveResult: null,
                                                        selectedSenderDeliveryPoint:
                                                          point,
                                                        selectedTariff: null,
                                                        senderDeliveryPointFilter: "",
                                                        senderDeliveryPointResults:
                                                          current
                                                            .senderDeliveryPointResults,
                                                        senderDeliveryPointResultsCityCode:
                                                          getCdekCityCode(
                                                            current.selectedSenderCity
                                                          ),
                                                        shipmentPointCode:
                                                          point.code ?? "",
                                                        tariffCode: "",
                                                        tariffResults: []
                                                      }))
                                                    }
                                                    type="button"
                                                  >
                                                    <strong>
                                                      {formatCdekDeliveryPointLabel(
                                                        point
                                                      )}
                                                    </strong>
                                                    <span>
                                                      {[point.address, point.workTime]
                                                        .filter(Boolean)
                                                        .join(" / ")}
                                                    </span>
                                                  </button>
                                                ))}
                                              </>
                                            ) : (
                                              <div className="delivery-cdek-list-empty">
                                                Пункты отправки не найдены.
                                              </div>
                                            );
                                          })()
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="delivery-cdek-route-field">
                                  <label className="form-field">
                                    <span>Город получателя</span>
                                    <div className="delivery-cdek-picker">
                                      <div className="delivery-cdek-search-field">
                                        <input
                                          placeholder="Например, Орёл"
                                          value={cdekPanelState.cityQuery}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => ({
                                              ...current,
                                              activePicker: "recipientCity",
                                              cityQuery: event.target.value,
                                              calculationResult: null,
                                              cityResults: [],
                                              deliveryPointFilter: "",
                                              deliveryPointResults: [],
                                              hasSearchedCities: false,
                                              saveResult: null,
                                              selectedCity: null,
                                              selectedDeliveryPoint: null,
                                              selectedTariff: null,
                                              tariffCode: "",
                                              tariffResults: []
                                            }))
                                          }
                                          onFocus={() => openCdekPicker("recipientCity")}
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              void handleSearchCdekCities();
                                            }
                                          }}
                                        />
                                      </div>
                                      {cdekPanelState.activePicker ===
                                        "recipientCity" &&
                                      (cdekPanelState.isLoadingCities ||
                                        cdekPanelState.cityResults.length > 0 ||
                                        cdekPanelState.hasSearchedCities) ? (
                                        <div className="delivery-cdek-list">
                                          {cdekPanelState.isLoadingCities ? (
                                            <div className="delivery-cdek-list-empty">
                                              Ищем город...
                                            </div>
                                          ) : cdekPanelState.cityResults.length > 0 ? (
                                            cdekPanelState.cityResults.map((city) => (
                                              <button
                                                className={
                                                  cdekPanelState.selectedCity
                                                    ?.code === city.code
                                                    ? "delivery-cdek-list-item delivery-cdek-list-item-active"
                                                    : "delivery-cdek-list-item"
                                                }
                                                key={`${city.code ?? city.cityUuid ?? city.fullName}`}
                                                onClick={() =>
                                                  setCdekPanelState((current) => ({
                                                    ...current,
                                                    activePicker: null,
                                                    calculationResult: null,
                                                    cityQuery:
                                                      formatCdekCityLabel(city),
                                                    cityResults: [],
                                                    deliveryPointResults: [],
                                                    message: null,
                                                    saveResult: null,
                                                    selectedCity: city,
                                                    selectedDeliveryPoint: null,
                                                    selectedTariff: null,
                                                    deliveryPointFilter: "",
                                                    tariffCode: "",
                                                    tariffResults: []
                                                  }))
                                                }
                                                type="button"
                                              >
                                                <strong>
                                                  {city.city ?? city.fullName}
                                                </strong>
                                                <span>{formatCdekCitySubtitle(city)}</span>
                                              </button>
                                            ))
                                          ) : (
                                            <div className="delivery-cdek-list-empty">
                                              Город не найден
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  </label>
                                  <label className="delivery-cdek-select-label">
                                    <span>ПВЗ получателя</span>
                                    <button
                                      className="delivery-cdek-select-field"
                                      disabled={!cdekPanelState.selectedCity?.code}
                                      onClick={() => {
                                        if (!cdekPanelState.selectedCity?.code) {
                                          return;
                                        }
                                        openCdekPicker("recipientPoint");
                                        void handleLoadCdekDeliveryPoints();
                                      }}
                                      type="button"
                                    >
                                      <strong>
                                        {cdekPanelState.selectedCity
                                          ? getCdekPointSelectLabel(
                                              cdekPanelState.selectedCity,
                                              cdekPanelState.selectedDeliveryPoint,
                                              cdekPanelState.cityQuery
                                            ) || "Выберите ПВЗ"
                                          : "Выберите город получателя"}
                                      </strong>
                                      <span>▾</span>
                                    </button>
                                  </label>
                                  {cdekPanelState.activePicker ===
                                  "recipientPoint" ? (
                                    <div className="delivery-cdek-picker">
                                      <div className="delivery-cdek-list delivery-cdek-list-static">
                                        <input
                                          className="delivery-cdek-dropdown-filter"
                                          placeholder="Поиск по адресу ПВЗ"
                                          value={cdekPanelState.deliveryPointFilter}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => ({
                                              ...current,
                                              deliveryPointFilter: event.target.value
                                            }))
                                          }
                                        />
                                        {cdekPanelState.isLoadingDeliveryPoints ? (
                                          <div className="delivery-cdek-list-empty">
                                            Ищем...
                                          </div>
                                        ) : (
                                          (() => {
                                            const points = filterCdekDeliveryPoints(
                                              cdekPanelState.deliveryPointResults,
                                              cdekPanelState.deliveryPointFilter
                                            );

                                            return points.length > 0 ? (
                                              <>
                                                <div className="delivery-cdek-list-count">
                                                  Показано {points.length} пунктов
                                                </div>
                                                {points.map((point) => (
                                                  <button
                                                    className={
                                                      cdekPanelState
                                                        .selectedDeliveryPoint
                                                        ?.code === point.code
                                                        ? "delivery-cdek-list-item delivery-cdek-list-item-active"
                                                        : "delivery-cdek-list-item"
                                                    }
                                                    key={
                                                      point.code ??
                                                      point.uuid ??
                                                      point.address
                                                    }
                                                    onClick={() =>
                                                      setCdekPanelState((current) => ({
                                                        ...current,
                                                        activePicker: null,
                                                        calculationResult: null,
                                                        deliveryPointFilter: "",
                                                        deliveryPointResults: [],
                                                        message: null,
                                                        saveResult: null,
                                                        selectedDeliveryPoint:
                                                          point,
                                                        selectedTariff: null,
                                                        tariffCode: "",
                                                        tariffResults: []
                                                      }))
                                                    }
                                                    type="button"
                                                  >
                                                    <strong>
                                                      {formatCdekDeliveryPointLabel(
                                                        point
                                                      )}
                                                    </strong>
                                                    <span>
                                                      {[point.address, point.workTime]
                                                        .filter(Boolean)
                                                        .join(" / ")}
                                                    </span>
                                                  </button>
                                                ))}
                                              </>
                                            ) : (
                                              <div className="delivery-cdek-list-empty">
                                                ПВЗ не найдены.
                                              </div>
                                            );
                                          })()
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </section>

                            <section className="delivery-cdek-section">
                              <div className="delivery-cdek-section-header">
                                <div>
                                  <strong>Груз</strong>
                                  <span>{getCdekCargoSummary(cdekPanelState)}</span>
                                </div>
                              </div>
                              <div className="delivery-cdek-cargo-grid">
                                {cdekPanelState.packages.map((packageState, index) => (
                                  <div
                                    className="delivery-cdek-package-card"
                                    key={packageState.id}
                                  >
                                    <div className="delivery-cdek-package-header">
                                      <strong>Грузовое место №{index + 1}</strong>
                                      <div>
                                        <button
                                          className="delivery-cdek-package-action-button"
                                          onClick={() =>
                                            setCdekPanelState((current) => {
                                              const packages = [
                                                ...current.packages.slice(0, index + 1),
                                                {
                                                  ...packageState,
                                                  id: `cdek-package-${Date.now()}-${index}`
                                                },
                                                ...current.packages.slice(index + 1)
                                              ];

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                          type="button"
                                        >
                                          Копировать
                                        </button>
                                        {cdekPanelState.packages.length > 1 ? (
                                          <button
                                            className="delivery-cdek-package-action-button delivery-cdek-package-action-button-danger"
                                            onClick={() =>
                                              setCdekPanelState((current) => {
                                                const packages =
                                                  current.packages.filter(
                                                    (item) =>
                                                      item.id !== packageState.id
                                                  );

                                                return syncCdekLegacyCargoFields(
                                                  resetCdekPackageDependentState(
                                                    current
                                                  ),
                                                  packages
                                                );
                                              })
                                            }
                                            type="button"
                                          >
                                            Удалить
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="delivery-cdek-package-fields">
                                      <label className="form-field">
                                        <span>Вес, кг</span>
                                        <input
                                          inputMode="decimal"
                                          onFocus={() =>
                                            setCdekPanelState((current) => ({
                                              ...current,
                                              activePicker: null
                                            }))
                                          }
                                          value={packageState.weightKg}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => {
                                              const packages = current.packages.map(
                                                (item) =>
                                                  item.id === packageState.id
                                                    ? {
                                                        ...item,
                                                        weightKg: event.target.value
                                                      }
                                                    : item
                                              );

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                        />
                                      </label>
                                      <label className="form-field">
                                        <span>Длина, см</span>
                                        <input
                                          inputMode="numeric"
                                          value={packageState.lengthCm}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => {
                                              const packages = current.packages.map(
                                                (item) =>
                                                  item.id === packageState.id
                                                    ? {
                                                        ...item,
                                                        lengthCm: event.target.value
                                                      }
                                                    : item
                                              );

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                        />
                                      </label>
                                      <label className="form-field">
                                        <span>Ширина, см</span>
                                        <input
                                          inputMode="numeric"
                                          value={packageState.widthCm}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => {
                                              const packages = current.packages.map(
                                                (item) =>
                                                  item.id === packageState.id
                                                    ? {
                                                        ...item,
                                                        widthCm: event.target.value
                                                      }
                                                    : item
                                              );

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                        />
                                      </label>
                                      <label className="form-field">
                                        <span>Высота, см</span>
                                        <input
                                          inputMode="numeric"
                                          value={packageState.heightCm}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => {
                                              const packages = current.packages.map(
                                                (item) =>
                                                  item.id === packageState.id
                                                    ? {
                                                        ...item,
                                                        heightCm: event.target.value
                                                      }
                                                    : item
                                              );

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                        />
                                      </label>
                                      <label className="form-field form-field-wide">
                                        <span>Описание груза</span>
                                        <textarea
                                          value={packageState.cargoDescription}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => {
                                              const packages = current.packages.map(
                                                (item) =>
                                                  item.id === packageState.id
                                                    ? {
                                                        ...item,
                                                        cargoDescription:
                                                          event.target.value
                                                      }
                                                    : item
                                              );

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                        />
                                      </label>
                                      <label className="checkbox-field delivery-cdek-cargo-flag">
                                        <input
                                          checked={packageState.isDangerousCargo}
                                          onChange={(event) =>
                                            setCdekPanelState((current) => {
                                              const packages = current.packages.map(
                                                (item) =>
                                                  item.id === packageState.id
                                                    ? {
                                                        ...item,
                                                        isDangerousCargo:
                                                          event.target.checked
                                                      }
                                                    : item
                                              );

                                              return syncCdekLegacyCargoFields(
                                                resetCdekPackageDependentState(current),
                                                packages
                                              );
                                            })
                                          }
                                          type="checkbox"
                                        />
                                        <span>Опасный груз</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  className="secondary-action-button delivery-cdek-add-package"
                                  onClick={() =>
                                    setCdekPanelState((current) => {
                                      const lastPackage =
                                        current.packages[current.packages.length - 1] ??
                                        createCdekPackageState(
                                          getDefaultCdekCargoDescription(
                                            detailDraftOrder
                                          )
                                        );
                                      const packages = [
                                        ...current.packages,
                                        {
                                          ...lastPackage,
                                          id: `cdek-package-${Date.now()}-${current.packages.length}`
                                        }
                                      ];

                                      return syncCdekLegacyCargoFields(
                                        resetCdekPackageDependentState(current),
                                        packages
                                      );
                                    })
                                  }
                                  type="button"
                                >
                                  + Грузовое место
                                </button>
                              </div>
                            </section>

                            <section className="delivery-cdek-section delivery-cdek-tariff-section">
                              <div className="delivery-cdek-section-header">
                                <div>
                                  <strong>Тарифы</strong>
                                </div>
                              </div>

                              <div className="delivery-cdek-tariff-panel">
                                <div className="delivery-cdek-tariff-mode-row">
                                  <span>* Откуда</span>
                                  <div className="delivery-cdek-segmented">
                                    <button
                                      className={
                                        cdekPanelState.tariffFromMode ===
                                        "warehouse"
                                          ? "delivery-cdek-mode-chip delivery-cdek-mode-chip-active"
                                          : "delivery-cdek-mode-chip"
                                      }
                                      onClick={() =>
                                        setCdekPanelState((current) =>
                                          updateCdekTariffMode(current, {
                                            fromMode: "warehouse"
                                          })
                                        )
                                      }
                                      type="button"
                                    >
                                      из ПВЗ
                                    </button>
                                    <button
                                      className={
                                        cdekPanelState.tariffFromMode === "door"
                                          ? "delivery-cdek-mode-chip delivery-cdek-mode-chip-active"
                                          : "delivery-cdek-mode-chip"
                                      }
                                      onClick={() =>
                                        setCdekPanelState((current) =>
                                          updateCdekTariffMode(current, {
                                            fromMode: "door"
                                          })
                                        )
                                      }
                                      type="button"
                                    >
                                      курьер заберёт по адресу
                                    </button>
                                  </div>
                                </div>
                                <div className="delivery-cdek-tariff-mode-row">
                                  <span>* Куда доставить</span>
                                  <div className="delivery-cdek-segmented delivery-cdek-segmented-three">
                                    <button
                                      className={
                                        cdekPanelState.tariffToMode ===
                                        "warehouse"
                                          ? "delivery-cdek-mode-chip delivery-cdek-mode-chip-active"
                                          : "delivery-cdek-mode-chip"
                                      }
                                      onClick={() =>
                                        setCdekPanelState((current) =>
                                          updateCdekTariffMode(current, {
                                            toMode: "warehouse"
                                          })
                                        )
                                      }
                                      type="button"
                                    >
                                      в ПВЗ
                                    </button>
                                    <button
                                      className={
                                        cdekPanelState.tariffToMode === "postamat"
                                          ? "delivery-cdek-mode-chip delivery-cdek-mode-chip-active"
                                          : "delivery-cdek-mode-chip"
                                      }
                                      onClick={() =>
                                        setCdekPanelState((current) =>
                                          updateCdekTariffMode(current, {
                                            toMode: "postamat"
                                          })
                                        )
                                      }
                                      type="button"
                                    >
                                      в постамат
                                    </button>
                                    <button
                                      className={
                                        cdekPanelState.tariffToMode === "door"
                                          ? "delivery-cdek-mode-chip delivery-cdek-mode-chip-active"
                                          : "delivery-cdek-mode-chip"
                                      }
                                      onClick={() =>
                                        setCdekPanelState((current) =>
                                          updateCdekTariffMode(current, {
                                            toMode: "door"
                                          })
                                        )
                                      }
                                      type="button"
                                    >
                                      курьером по адресу
                                    </button>
                                  </div>
                                </div>

                                {cdekPanelState.isLoadingTariffs ? (
                                  <div className="delivery-cdek-list-empty">
                                    Подбираем тарифы...
                                  </div>
                                ) : !canRequestCdekTariffs(cdekPanelState) ? (
                                  <div className="delivery-cdek-list-empty">
                                    Заполните маршрут и груз, чтобы увидеть тарифы.
                                  </div>
                                ) : cdekPanelState.tariffResults.length > 0 ? (
                                  (() => {
                                    const visibleTariffs = getCdekVisibleTariffs(
                                      cdekPanelState.tariffResults,
                                      cdekPanelState.tariffFromMode,
                                      cdekPanelState.tariffToMode
                                    );

                                    if (visibleTariffs.length === 0) {
                                      return (
                                        <div className="delivery-cdek-list-empty">
                                          Для выбранного способа доставки тарифы не
                                          найдены.
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="delivery-cdek-tariff-list">
                                        {visibleTariffs.map((tariff) => (
                                          <button
                                            className={
                                              cdekPanelState.selectedTariff
                                                ?.tariffCode === tariff.tariffCode
                                                ? "delivery-cdek-tariff-row delivery-cdek-tariff-row-active"
                                                : "delivery-cdek-tariff-row"
                                            }
                                            key={`tariff-${tariff.tariffCode ?? tariff.tariffName}`}
                                            onClick={() => {
                                              const calculationResult =
                                                createCdekCalculationResultFromTariff(
                                                  detailDraftOrder,
                                                  tariff
                                                );

                                              setCdekPanelState((current) => ({
                                                ...current,
                                                activePicker: null,
                                                calculationResult,
                                                message: null,
                                                saveResult:
                                                  current.saveResult &&
                                                  current.selectedTariff?.tariffCode ===
                                                    tariff.tariffCode
                                                    ? current.saveResult
                                                    : null,
                                                selectedTariff: tariff,
                                                tariffCode:
                                                  tariff.tariffCode === null
                                                    ? ""
                                                    : String(tariff.tariffCode)
                                              }));
                                            }}
                                            type="button"
                                          >
                                            <span className="delivery-cdek-tariff-main">
                                              <strong>
                                                {formatCdekTariffWorkLabel(tariff)}
                                                {formatCdekTariffCode(tariff) ? (
                                                  <span className="delivery-cdek-code">
                                                    {formatCdekTariffCode(tariff)}
                                                  </span>
                                                ) : null}
                                              </strong>
                                              <span className="delivery-cdek-tariff-price">
                                                <em>{getCdekTariffPriceLabel(tariff)}</em>
                                                {getCdekTariffPaymentHint(tariff) ? (
                                                  <small>
                                                    {getCdekTariffPaymentHint(tariff)}
                                                  </small>
                                                ) : null}
                                              </span>
                                            </span>
                                            <span className="delivery-cdek-tariff-meta">
                                              {getCdekTariffDeliverySummaryLabel(tariff)}
                                            </span>
                                            {cdekPanelState.selectedTariff
                                              ?.tariffCode === tariff.tariffCode ? (
                                              <span
                                                aria-hidden="true"
                                                className="delivery-cdek-tariff-check"
                                              >
                                                ✓
                                              </span>
                                            ) : null}
                                          </button>
                                        ))}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="delivery-cdek-list-empty">
                                    Тарифы не найдены для выбранного маршрута.
                                  </div>
                                )}
                              </div>
                            </section>
                          </div>

                          <section className="delivery-cdek-section delivery-cdek-calculation-section">
                            <div className="delivery-cdek-section-header">
                              <div>
                                <strong>Расчёт и сохранение</strong>
                                <span>
                                  {getCdekCalculationSectionSummary(
                                    cdekPanelState,
                                    detailDraftOrder,
                                    isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="delivery-cdek-actions">
                              <button
                                className="primary-action-button"
                                disabled={
                                  cdekPanelState.isSaving ||
                                  (Boolean(cdekPanelState.saveResult) &&
                                    !isDraftOrderDeliveryNeedsReview(
                                      detailDraftOrder
                                    )) ||
                                  !canSaveCdekDeliveryMode(cdekPanelState) ||
                                  !canSubmitCdekDelivery(cdekPanelState)
                                }
                                onClick={() =>
                                  void handleSaveCdekDelivery(detailDraftOrder)
                                }
                                type="button"
                              >
                                {getCdekSaveButtonLabel(
                                  cdekPanelState,
                                  isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                )}
                              </button>
                              <span>{getCdekSenderSummary(cdekPanelState)}</span>
                            </div>
                            <p className="delivery-cdek-footer-note">
                              {getCdekSaveActionNote(
                                cdekPanelState,
                                isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                              )}
                            </p>

                            {!canSaveCdekDeliveryMode(cdekPanelState) ? (
                              <p className="delivery-cdek-footer-note">
                                Сохранение этого способа доставки пока не
                                реализовано.
                              </p>
                            ) : null}

                            {cdekPanelState.calculationResult ? (
                              <div className="delivery-cdek-result">
                                <strong>
                                  К оплате за доставку:{" "}
                                  {getCdekCalculationPayableLabel(
                                    cdekPanelState.calculationResult
                                  )}
                                </strong>
                                {getCdekCalculationTariffPriceMinor(
                                  cdekPanelState.calculationResult
                                ) !== null ? (
                                  <span>
                                    Стоимость тарифа:{" "}
                                    {formatCdekRubMinor(
                                      getCdekCalculationTariffPriceMinor(
                                        cdekPanelState.calculationResult
                                      ) ?? 0
                                    )}
                                  </span>
                                ) : null}
                                {getCdekCalculationVatMinor(
                                  cdekPanelState.calculationResult
                                ) !== null ? (
                                  <span>
                                    НДС:{" "}
                                    {formatCdekRubMinor(
                                      getCdekCalculationVatMinor(
                                        cdekPanelState.calculationResult
                                      ) ?? 0
                                    )}
                                  </span>
                                ) : null}
                                <span>
                                  Срок:{" "}
                                  {cdekPanelState.calculationResult.calculation.periodMin ??
                                    "?"}
                                  -
                                  {cdekPanelState.calculationResult.calculation.periodMax ??
                                    "?"}{" "}
                                  дн.
                                </span>
                                {cdekPanelState.calculationResult.calculation.warnings
                                  .length > 0 ? (
                                  <span>
                                    Предупреждения:{" "}
                                    {
                                      cdekPanelState.calculationResult.calculation
                                        .warnings.length
                                    }
                                  </span>
                                ) : null}
                                {cdekPanelState.calculationResult.calculation.errors
                                  .length > 0 ? (
                                  <span>
                                    Ошибки:{" "}
                                    {
                                      cdekPanelState.calculationResult.calculation
                                        .errors.length
                                    }
                                  </span>
                                ) : null}
                                <em>
                                  {isDraftOrderDeliveryNeedsReview(detailDraftOrder)
                                    ? "Проверьте и подтвердите доставку перед оплатой"
                                    : cdekPanelState.saveResult
                                    ? "Расчёт сохранён как СДЭК-доставка заказа"
                                    : "Расчёт не сохранён в заказ"}
                                </em>
                              </div>
                            ) : null}

                            {cdekPanelState.saveResult &&
                            !isDraftOrderDeliveryNeedsReview(detailDraftOrder) ? (
                              <div className="delivery-cdek-saved-result">
                                <strong>СДЭК-доставка сохранена</strong>
                                <span>Отправление СДЭК ещё не создано.</span>
                                <span>
                                  Стоимость тарифа:{" "}
                                  {getCdekCalculationTariffPriceMinor(
                                    cdekPanelState.calculationResult
                                  ) !== null
                                    ? formatCdekRubMinor(
                                        getCdekCalculationTariffPriceMinor(
                                          cdekPanelState.calculationResult
                                        ) ?? 0
                                      )
                                    : getCdekCalculationPayableLabel(
                                        cdekPanelState.calculationResult
                                      )}
                                </span>
                                {getCdekCalculationVatMinor(
                                  cdekPanelState.calculationResult
                                ) !== null ? (
                                  <span>
                                    НДС:{" "}
                                    {formatCdekRubMinor(
                                      getCdekCalculationVatMinor(
                                        cdekPanelState.calculationResult
                                      ) ?? 0
                                    )}
                                  </span>
                                ) : null}
                                <span>
                                  К оплате за доставку:{" "}
                                  {getCdekCalculationPayableLabel(
                                    cdekPanelState.calculationResult
                                  )}
                                </span>
                                <span>
                                  Срок:{" "}
                                  {getCdekCalculationPeriodLabel(
                                    cdekPanelState.calculationResult
                                  )}
                                </span>
                              </div>
                            ) : null}
                          </section>
                        </div>
                      ) : (
                        <div className="order-form-grid">
                          <label className="form-field form-field-wide">
                            <span>Адрес доставки</span>
                            <input
                              value={draftOrderDeliveryForm.address}
                              onChange={(event) =>
                                setDraftOrderDeliveryForm((current) => ({
                                  ...current,
                                  address: event.target.value
                                }))
                              }
                            />
                          </label>

                          <label className="form-field">
                            <span>Контактное лицо</span>
                            <input
                              value={draftOrderDeliveryForm.contactName}
                              onChange={(event) =>
                                setDraftOrderDeliveryForm((current) => ({
                                  ...current,
                                  contactName: event.target.value
                                }))
                              }
                            />
                          </label>

                          <label className="form-field">
                            <span>Телефон</span>
                            <input
                              autoComplete="tel"
                              inputMode="numeric"
                              value={draftOrderDeliveryForm.phone || "+7"}
                              onChange={(event) =>
                                setDraftOrderDeliveryForm((current) => ({
                                  ...current,
                                  phone: formatRussianPhone(event.target.value)
                                }))
                              }
                              onBlur={(event) =>
                                setDraftOrderDeliveryForm((current) => ({
                                  ...current,
                                  phone: formatRussianPhone(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label className="form-field form-field-wide">
                            <span>Комментарий</span>
                            <textarea
                              value={draftOrderDeliveryForm.comment}
                              onChange={(event) =>
                                setDraftOrderDeliveryForm((current) => ({
                                  ...current,
                                  comment: event.target.value
                                }))
                              }
                            />
                          </label>
                        </div>
                      )}

                      {draftOrderDeliveryForm.mode !== "cdek" ? (
                        <div className="draft-order-footer">
                          <button
                            className="primary-action-button"
                            onClick={() =>
                              handleSaveDraftOrderDelivery(detailDraftOrder.id)
                            }
                            type="button"
                          >
                            Сохранить
                          </button>
                        </div>
                      ) : null}
                    </section>
                  ) : (
                    <section className="draft-items-panel draft-items-panel-detail">
                    <div className="draft-summary-grid">
                      <section className="draft-summary-card">
                        <div className="draft-summary-card-header">
                          <h4 className="draft-summary-title">
                            <img alt="" src={userIconUrl} />
                            <span>Заказчик</span>
                          </h4>
                          <span
                            className={
                              isDraftOrderCustomerFilled(detailDraftOrder.customer)
                                ? "draft-summary-state draft-summary-state-ok"
                                : "draft-summary-state draft-summary-state-alert"
                            }
                          >
                            {isDraftOrderCustomerFilled(detailDraftOrder.customer)
                              ? "Заполнено"
                              : "Не заполнено"}
                          </span>
                          <button
                            aria-label={
                              isDraftOrderCustomerFilled(detailDraftOrder.customer)
                                ? "Изменить заказчика"
                                : "Заполнить заказчика"
                            }
                            className="draft-summary-edit-button"
                            onClick={() =>
                              openDraftOrderCustomerForm(detailDraftOrder)
                            }
                            title={
                              isDraftOrderCustomerFilled(detailDraftOrder.customer)
                                ? "Изменить заказчика"
                                : "Заполнить заказчика"
                            }
                            type="button"
                          >
                            <img alt="" src={pencilIconUrl} />
                          </button>
                        </div>
                        {isDraftOrderCustomerFilled(detailDraftOrder.customer) ? (
                          <div className="draft-summary-lines">
                            {detailDraftOrder.customer?.name ? (
                              <strong>{detailDraftOrder.customer.name}</strong>
                            ) : null}
                            {detailDraftOrder.customer?.phone ? (
                              <span>
                                {formatRussianPhone(detailDraftOrder.customer.phone)}
                              </span>
                            ) : null}
                            {detailDraftOrder.customer?.email ? (
                              <span>{detailDraftOrder.customer.email}</span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="draft-summary-muted">Заказчик не заполнен</p>
                        )}
                      </section>

                      <section className="draft-summary-card">
                        <div className="draft-summary-card-header">
                          <h4 className="draft-summary-title">
                            <img alt="" src={truckIconUrl} />
                            <span>Доставка</span>
                          </h4>
                          <span
                            className={
                              getDraftOrderDeliveryState(detailDraftOrder.delivery) ===
                              "missing"
                                ? "draft-summary-state draft-summary-state-alert"
                                : "draft-summary-state draft-summary-state-ok"
                            }
                          >
                            {detailDraftOrder.delivery.mode === "not-required"
                              ? "Не требуется"
                              : detailDraftOrder.delivery.mode === "cdek" &&
                                  getDraftOrderDeliveryState(
                                    detailDraftOrder.delivery
                                  ) !== "missing"
                                ? "СДЭК"
                              : getDraftOrderDeliveryState(detailDraftOrder.delivery) ===
                                  "missing"
                                ? "Не заполнено"
                                : "Заполнено"}
                          </span>
                          <button
                            aria-label={
                              getDraftOrderDeliveryState(detailDraftOrder.delivery) ===
                              "missing"
                                ? "Заполнить доставку"
                                : "Изменить доставку"
                            }
                            className="draft-summary-edit-button"
                            onClick={() =>
                              openDraftOrderDeliveryForm(detailDraftOrder)
                            }
                            title={
                              getDraftOrderDeliveryState(detailDraftOrder.delivery) ===
                              "missing"
                                ? "Заполнить доставку"
                                : "Изменить доставку"
                            }
                            type="button"
                          >
                            <img alt="" src={pencilIconUrl} />
                          </button>
                        </div>
                        {detailDraftOrder.delivery.mode === "not-required" ? (
                          <p className="draft-summary-muted">Доставка не требуется</p>
                        ) : getDraftOrderDeliveryState(detailDraftOrder.delivery) ===
                          "missing" ? (
                          <p className="draft-summary-muted">Доставка не заполнена</p>
                        ) : (
                          <div className="draft-summary-lines">
                            {detailDraftOrder.delivery.mode === "cdek" ? (
                              <span>
                                СДЭК
                                {detailDraftOrder.delivery.priceMinor
                                  ? `: ${formatMinorPrice(
                                      detailDraftOrder.delivery.priceMinor,
                                      detailDraftOrder.delivery.currencyCode ?? "RUB"
                                    )}`
                                  : ""}
                              </span>
                            ) : null}
                            {detailDraftOrder.delivery.address ? (
                              <span>
                                {detailDraftOrder.delivery.mode === "cdek"
                                  ? "ПВЗ"
                                  : "Адрес"}
                                : {detailDraftOrder.delivery.address}
                              </span>
                            ) : null}
                            {detailDraftOrder.delivery.mode === "cdek" &&
                            (detailDraftOrder.delivery.tariffName ||
                              detailDraftOrder.delivery.tariffCode) ? (
                              <span>
                                Тариф:{" "}
                                {detailDraftOrder.delivery.tariffName ??
                                  "тариф СДЭК"}
                                {detailDraftOrder.delivery.tariffCode
                                  ? ` (#${detailDraftOrder.delivery.tariffCode})`
                                  : ""}
                              </span>
                            ) : null}
                            {detailDraftOrder.delivery.mode === "cdek" &&
                            (detailDraftOrder.delivery.periodMin ||
                              detailDraftOrder.delivery.periodMax) ? (
                              <span>
                                Срок: {detailDraftOrder.delivery.periodMin ?? "?"}-
                                {detailDraftOrder.delivery.periodMax ?? "?"} дн.
                              </span>
                            ) : null}
                            {detailDraftOrder.delivery.contactName ? (
                              <span>Контакт: {detailDraftOrder.delivery.contactName}</span>
                            ) : null}
                            {detailDraftOrder.delivery.phone ? (
                              <span>Телефон: {detailDraftOrder.delivery.phone}</span>
                            ) : null}
                            {detailDraftOrder.delivery.comment ? (
                              <span>Комментарий: {detailDraftOrder.delivery.comment}</span>
                            ) : null}
                          </div>
                        )}
                        {isDraftOrderDeliveryNeedsReview(detailDraftOrder) ? (
                          <p className="draft-delivery-review-warning">
                            Заказ изменён. Проверьте вес/габариты и сохраните доставку перед оплатой.
                          </p>
                        ) : null}
                      </section>
                    </div>

                    {getDraftOrderFallbackComment(detailDraftOrder) ? (
                      <section className="draft-comment-fallback">
                        <strong>Комментарий заказа</strong>
                        <span>{getDraftOrderFallbackComment(detailDraftOrder)}</span>
                      </section>
                    ) : null}

                    <div className="section-heading">
                      <div>
                        <h3>Позиции</h3>
                        <p>
                          Статус: {getDraftOrderDisplayStatus(detailDraftOrder)}
                        </p>
                      </div>
                    </div>

                    <ol className="draft-items-list">
                      {detailDraftOrder.items.map((item, index) => {
                        const itemAttachments =
                          detailDraftOrderAttachmentBuckets?.attachmentsByItemId.get(
                            item.id
                          ) ?? [];
                        const itemCommentText = getDraftOrderItemDisplayComment(
                          detailDraftOrder,
                          item
                        ) || getDraftOrderItemManagerComment(item);

                        return (
                        <li className="draft-item-row" key={item.id}>
                          <div className="draft-item-main">
                            <strong>
                              {index + 1}. {getDraftOrderItemServiceLabel(item)}
                            </strong>
                            <span>{getDraftOrderItemDescription(item)}</span>
                            {itemAttachments.length > 0 || itemCommentText ? (
                              <div className="draft-item-indicators">
                                {itemAttachments.length > 0 ? (
                                  <span
                                    className="draft-item-indicator"
                                    title={`Файлы: ${itemAttachments.length}`}
                                  >
                                    <img alt="" src={paperclipIconUrl} />
                                    {itemAttachments.length > 1 ? (
                                      <span
                                        className={
                                          itemAttachments.length > 9
                                            ? "draft-item-indicator-badge draft-item-indicator-badge-wide"
                                            : "draft-item-indicator-badge"
                                        }
                                      >
                                        {itemAttachments.length}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : null}
                                {itemCommentText ? (
                                  <span
                                    className="draft-item-indicator"
                                    title="Есть комментарий"
                                  >
                                    <img alt="" src={messageIconUrl} />
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <span className="draft-item-quantity">
                            {getDraftOrderItemQuantityLabel(item)}
                          </span>
                          <strong>
                            {isDtfQuoteRequestItem(item)
                              ? "Требует расчёта"
                              : item.formattedPrice}
                          </strong>
                          {item.serviceType === "light-letter" ||
                          item.serviceType === "dtf-print" ? (
                            <button
                              aria-label="Редактировать позицию"
                              className="draft-item-action-button draft-item-action-edit"
                              onClick={() => handleEditDraftOrderItem(item)}
                              title="Редактировать позицию"
                              type="button"
                            >
                              <img alt="" src={pencilIconUrl} />
                            </button>
                          ) : null}
                          <button
                            aria-label="Удалить позицию"
                            className="draft-item-action-button draft-item-action-delete"
                            onClick={() => handleRemoveDraftOrderItem(item.id)}
                            title="Удалить позицию"
                            type="button"
                          >
                            <img alt="" src={trashIconUrl} />
                          </button>
                        </li>
                        );
                      })}
                    </ol>

                    {shouldShowDraftOrderDeliveryLine(detailDraftOrder) ? (
                      <div className="draft-delivery-line">
                        <div className="draft-delivery-line-main">
                          <span className="draft-delivery-line-label">Доставка</span>
                          <strong>
                            {getDraftOrderDeliveryLineTitle(detailDraftOrder.delivery)}
                            {detailDraftOrder.delivery.mode === "cdek" &&
                            (detailDraftOrder.delivery.tariffName ||
                              detailDraftOrder.delivery.tariffCode) ? (
                              <>
                                {" · "}
                                {detailDraftOrder.delivery.tariffName ?? "тариф СДЭК"}
                                {detailDraftOrder.delivery.tariffCode
                                  ? ` (#${detailDraftOrder.delivery.tariffCode})`
                                  : ""}
                              </>
                            ) : null}
                          </strong>
                          {detailDraftOrder.delivery.address ? (
                            <span>
                              {detailDraftOrder.delivery.mode === "cdek"
                                ? "ПВЗ"
                                : "Адрес"}
                              : {detailDraftOrder.delivery.address}
                            </span>
                          ) : null}
                          {detailDraftOrder.delivery.mode === "cdek" &&
                          (detailDraftOrder.delivery.periodMin ||
                            detailDraftOrder.delivery.periodMax) ? (
                            <span>
                              Срок: {detailDraftOrder.delivery.periodMin ?? "?"}-
                              {detailDraftOrder.delivery.periodMax ?? "?"} дн.
                            </span>
                          ) : null}
                        </div>
                        <strong className="draft-delivery-line-price">
                          {getDraftOrderDeliveryTotalLabel(detailDraftOrder)}
                        </strong>
                      </div>
                    ) : null}

                    <div className="draft-order-footer">
                      <div className="draft-total-row">
                        <div className="draft-total-breakdown">
                          <div className="draft-total-breakdown-row">
                            <span>Позиции:</span>
                            <strong>
                              {isDtfQuoteRequestOrder(detailDraftOrder)
                                ? "Стоимость рассчитает менеджер"
                                : formatMinorPrice(
                                    getDraftOrderTotalMinor(detailDraftOrder.items),
                                    "RUB"
                                  )}
                            </strong>
                          </div>
                          <div className="draft-total-breakdown-row">
                            <span>Доставка:</span>
                            <strong>{getDraftOrderDeliveryTotalLabel(detailDraftOrder)}</strong>
                          </div>
                          <div className="draft-total-breakdown-row draft-total-breakdown-row-total">
                            <span>Итого:</span>
                            <strong>
                              {isDtfQuoteRequestOrder(detailDraftOrder)
                                ? "Стоимость рассчитает менеджер"
                                : formatMinorPrice(detailDraftOrder.totalPriceMinor, "RUB")}
                            </strong>
                          </div>
                        </div>
                        {detailDraftOrder.serverOrderNumber ? (
                          <button
                            className="payment-preparation-button"
                            onClick={() =>
                              openPaymentPreparationPanel(detailDraftOrder)
                            }
                            type="button"
                          >
                            Подготовить оплату
                          </button>
                        ) : null}
                      </div>

                      <div className="draft-order-actions">
                        {!detailDraftOrder.serverOrderId &&
                        !detailDraftOrder.serverOrderNumber ? (
                          <button
                            className="primary-action-button"
                            disabled={
                              getDraftOrderDisplayStatus(detailDraftOrder) !== "оформлен"
                            }
                            onClick={() =>
                              handleSaveDraftOrderToDatabase(detailDraftOrder)
                            }
                            type="button"
                          >
                            Завершить приём заказа
                          </button>
                        ) : null}
                        <button
                          className="secondary-action-button"
                          onClick={() => handleAddItemToDraftOrder(detailDraftOrder)}
                          type="button"
                        >
                          Добавить позицию
                        </button>
                      </div>
                      {draftOrderSaveStatusById[detailDraftOrder.id] ||
                      detailDraftOrder.serverOrderNumber ? (
                        <p className="draft-order-save-status">
                          {draftOrderSaveStatusById[detailDraftOrder.id] ??
                            `Заказ создан: ${detailDraftOrder.serverOrderNumber}`}
                        </p>
                      ) : null}
                    </div>
                    </section>
                  )}
                </section>

                {draftOrderPanelMode === "details" &&
                detailDraftOrder.serverOrderId &&
                detailDraftOrderAttachmentBuckets &&
                (detailDraftOrderAttachmentBuckets.unassignedAttachments.length > 0 ||
                  Boolean(
                    attachmentsStatusByOrderId[detailDraftOrder.serverOrderId]
                  ) ||
                  uploadingAttachmentOrderId === detailDraftOrder.serverOrderId) ? (
                  <section className="order-attachments-section order-attachments-section-standalone">
                    <div className="section-heading">
                      <div>
                        <h3>Прочие вложения</h3>
                        <p>Файлы без понятной привязки к позиции</p>
                      </div>

                      <label className="secondary-action-button attachment-upload-button">
                        <input
                          type="file"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            void handleUploadOrderAttachment(
                              detailDraftOrder.serverOrderId!,
                              file
                            );
                            event.target.value = "";
                          }}
                        />
                        {uploadingAttachmentOrderId === detailDraftOrder.serverOrderId
                          ? "Загружаем..."
                          : "Добавить файл"}
                      </label>
                    </div>

                    {detailDraftOrderAttachmentBuckets.unassignedAttachments.length >
                    0 ? (
                      <>
                        <div className="attachment-grid">
                          {detailDraftOrderAttachmentBuckets.unassignedAttachments.map(
                            (attachment) => (
                            <article
                              className="attachment-card"
                              key={attachment.id}
                              onClick={() =>
                                void handleOpenAttachmentPreview(attachment)
                              }
                              role="button"
                              tabIndex={0}
                            >
                              <div className="attachment-card-media">
                                {isImageAttachment(attachment) &&
                                attachmentPreviewUrlById[attachment.id] ? (
                                  <img
                                    alt={attachment.originalFileName}
                                    src={attachmentPreviewUrlById[attachment.id]}
                                  />
                                ) : (
                                  <div className="attachment-card-file">
                                    <span>{getAttachmentFileKindLabel(attachment)}</span>
                                    <strong>
                                      {getAttachmentTypeLabel(
                                        attachment.attachmentType
                                      )}
                                    </strong>
                                  </div>
                                )}
                              </div>
                              <div className="attachment-card-meta">
                                <strong>{attachment.originalFileName}</strong>
                                <span>
                                  {getAttachmentTypeLabel(attachment.attachmentType)}
                                  {formatAttachmentFileSize(attachment.fileSize)
                                    ? ` · ${formatAttachmentFileSize(
                                        attachment.fileSize
                                      )}`
                                    : ""}
                                </span>
                              </div>
                              <button
                                aria-label="Скачать файл"
                                className="attachment-download-button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleDownloadAttachment(attachment);
                                }}
                                title="Скачать файл"
                                type="button"
                            >
                              <img alt="" src={downloadIconUrl} />
                            </button>
                          </article>
                            )
                          )}
                        </div>
                        {renderAttachmentStatus(detailDraftOrder.serverOrderId)}
                      </>
                    ) : (
                      renderAttachmentStatus(detailDraftOrder.serverOrderId)
                    )}
                  </section>
                ) : null}
                </>
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
                      <InnerPageHeader
                        onBack={() => {
                          setNewOrderStep("start");
                          setIsConstructorPanelOpen(false);
                          setEditingDraftOrderItemId(null);
                        }}
                        title={
                          newOrderStep === "dtf-print"
                            ? "DTF-ПЕЧАТЬ"
                            : "ОБЪЁМНЫЕ БУКВЫ"
                        }
                      />
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
                              aria-label="Загрузить макет"
                              className="constructor-file-action-button"
                              onClick={handleConstructorLayoutUploadClick}
                              title="Загрузить макет"
                              type="button"
                            >
                              <img
                                alt=""
                                className="constructor-file-action-icon"
                                src={fileUploadIconUrl}
                              />
                            </button>
                            <button
                              aria-label="Скачать макет"
                              className="constructor-file-action-button"
                              onClick={handleConstructorLayoutDownloadClick}
                              title="Скачать макет"
                              type="button"
                            >
                              <img
                                alt=""
                                className="constructor-file-action-icon"
                                src={fileDownloadIconUrl}
                              />
                            </button>
                            {constructorFileActionStatus ? (
                              <span className="constructor-file-action-status">
                                {constructorFileActionStatus}
                              </span>
                            ) : null}
                          </div>

                          <div className="position-parameter-card-heading">
                            <h3>Объёмные буквы</h3>
                            {renderPositionManagerActionIcons()}
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
                                    : addedDraftItemFeedback?.itemServiceType ===
                                        "light-letter"
                                      ? "Добавлено ✓"
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
                          </section>

                          {renderPositionCommentSection(
                            editingDraftOrderItemComment
                          )}
                          {renderPositionManagerCommentDisplaySection()}

                          {renderPositionAttachmentsSection(
                            editingDraftOrderItemAttachments
                          )}

                        </>
                      ) : null}

                    </section>
                  ) : newOrderStep === "dtf-print" ? (
                    <section className="service-workspace dtf-service-workspace">
                      <div className="dtf-calculation-panel">
                        <section className="dtf-fields-card">
                          <div className="section-heading position-parameter-card-heading">
                            <h3>Параметры DTF</h3>
                            {renderPositionManagerActionIcons()}
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
                            {editingDraftOrderItemId
                              ? "Обновить позицию"
                              : addedDraftItemFeedback?.itemServiceType ===
                                  "dtf-print"
                                ? "Добавлено ✓"
                                : "Добавить позицию"}
                          </button>
                        </section>
                      </div>
                      {renderPositionCommentSection(editingDraftOrderItemComment)}
                      {renderPositionManagerCommentDisplaySection()}
                      {renderPositionAttachmentsSection(
                        editingDraftOrderItemAttachments
                      )}
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
                Интеграция Ozon будет подключена позже через общую систему.
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
          ) : isSettingsHomeScreen ? (
            <section className="settings-home-panel">
              <div className="content-header">
                <div>
                  <p className="eyebrow">Рабочая область</p>
                  <h2>Настройки</h2>
                  <p>
                    Разделы настройки программы, материалов, расчётов и
                    интеграций.
                  </p>
                </div>
              </div>

              <div className="settings-card-grid">
                {settingsCards.map((card) => (
                  <article
                    className={
                      card.isActive
                        ? "settings-card settings-card-active"
                        : "settings-card settings-card-disabled"
                    }
                    key={card.title}
                  >
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                    {card.isActive ? (
                      <button
                        className="secondary-action-button"
                        onClick={() => {
                          if (!card.section) {
                            return;
                          }

                          setActiveSettingsSection(card.section);
                        }}
                        type="button"
                      >
                        Открыть
                      </button>
                    ) : (
                      <span className="settings-card-status">Позже</span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : isMaterialsScreen ? (
            <>
              <div className="content-header">
                <div>
                  <InnerPageHeader
                    ariaLabel="Назад к настройкам"
                    onBack={() => setActiveSettingsSection(settingsHomeSection)}
                    title={materialsSettingsSection}
                  />
                  <p>
                    Справочник материалов, закупочных цен и параметров расчётов.
                  </p>
                </div>
              </div>

              <div className="toolbar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по материалам, категориям и единицам"
                />
                <span>
                  {filteredMaterials.length} из {materials.length} материалов
                </span>
              </div>

              <div className="material-category-filter">
                {materialCategoryFilters.map((category) => (
                  <button
                    className={
                      category === selectedMaterialCategory
                        ? "material-category-chip material-category-chip-active"
                        : "material-category-chip"
                    }
                    key={category}
                    onClick={() => setSelectedMaterialCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>

              {error ? (
                <div className="error-card">{error}</div>
              ) : (
                <section className="materials-section materials-section-wide">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Материал</th>
                            <th>Категория</th>
                            <th>Параметры</th>
                            <th>Ед.</th>
                            <th>Цена</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMaterials.map((material) => {
                            const primaryPrice = getMaterialPrimaryPrice(
                              materialPricingInputsById[material.id]
                            );

                            return (
                              <tr
                                className={
                                  material.id === selectedMaterialId
                                    ? "selected-row"
                                    : undefined
                                }
                                key={material.id}
                                onClick={() => setSelectedMaterialId(material.id)}
                              >
                                <td>
                                  <strong>{material.name}</strong>
                                </td>
                                <td>{material.category_name ?? "—"}</td>
                                <td className="material-params-cell">
                                  {formatMaterialParameters(material)}
                                </td>
                                <td>{formatUnitLabel(material.unit_code)}</td>
                                <td className="material-price-cell">
                                  {primaryPrice ? (
                                    editingMaterialPrice?.materialId ===
                                    material.id ? (
                                      <input
                                        autoFocus
                                        className="material-price-input"
                                        disabled={
                                          savingMaterialPriceId === material.id
                                        }
                                        inputMode="decimal"
                                        onBlur={() => {
                                          if (skipMaterialPriceBlurSaveRef.current) {
                                            skipMaterialPriceBlurSaveRef.current =
                                              false;
                                            return;
                                          }

                                          void handleSaveMaterialPriceEdit(
                                            material.id
                                          );
                                        }}
                                        onChange={(event) =>
                                          setEditingMaterialPrice({
                                            materialId: material.id,
                                            value: event.target.value
                                          })
                                        }
                                        onClick={(event) => event.stopPropagation()}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            skipMaterialPriceBlurSaveRef.current =
                                              true;
                                            void handleSaveMaterialPriceEdit(
                                              material.id
                                            );
                                          }

                                          if (event.key === "Escape") {
                                            event.preventDefault();
                                            skipMaterialPriceBlurSaveRef.current =
                                              true;
                                            handleCancelMaterialPriceEdit();
                                          }
                                        }}
                                        value={editingMaterialPrice.value}
                                      />
                                    ) : (
                                      <button
                                        className="material-price-button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleStartMaterialPriceEdit(
                                            material.id,
                                            primaryPrice
                                          );
                                        }}
                                        type="button"
                                      >
                                        {formatPurchasePrice(
                                          primaryPrice.purchase_price_minor,
                                          primaryPrice.currency_code
                                        )}
                                      </button>
                                    )
                                  ) : (
                                    <span className="muted-text">—</span>
                                  )}
                                  {savingMaterialPriceId === material.id ? (
                                    <small className="material-price-status">
                                      Сохраняем...
                                    </small>
                                  ) : null}
                                  {materialPriceErrorById[material.id] ? (
                                    <small className="material-price-error">
                                      {materialPriceErrorById[material.id]}
                                    </small>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                </section>
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
                <strong>Настройки → Материалы и цены</strong>.
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

