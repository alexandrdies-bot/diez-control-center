import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export type ApiHealth = {
  ok: boolean;
  service: string;
  version: string;
};

export type Material = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  category_id: number | null;
  category_name: string | null;
  unit_id: number;
  unit_code: string;
  unit_name: string;
};

export type MaterialPricingInput = {
  id: number;
  material_id: number;
  supplier_name: string | null;
  purchase_unit_id: number;
  purchase_unit_code: string;
  calculation_unit_id: number;
  calculation_unit_code: string;
  purchase_price_minor: number;
  markup_percent: string;
  delivery_price_minor: number;
  work_amount: string;
  currency_code: string;
  source_note: string | null;
  valid_from: string;
  valid_to: string | null;
};

export type CalculationFixtureDebugResult = {
  ok: boolean;
  mode: string;
  fixtureId: string;
  expectedTotalPriceMinor: number;
  calculatedTotalPriceMinor: number;
  formattedTotalPrice: string;
  ledCount: number;
  ledCountMatches: boolean | null;
  roundedTotalPriceMinorMatches: boolean;
  faceFilmCostMinor: number | null;
  faceFilmCostMatches: boolean | null;
  limitation: string;
};

export type CustomerAccountRetention = {
  customerId: number | null;
  displayName: string | null;
  email: string | null;
  id: number;
  lastActivityAt: string;
  phone: string;
  phoneNormalized: string;
  retentionLocked: boolean;
  retentionLockReason: string | null;
  retentionLockedAt: string | null;
  retentionLockedByUserId: number | null;
  retentionLockUntil: string | null;
};

export type OrderWorkflowStatus =
  | "new"
  | "confirmed"
  | "in_work"
  | "ready"
  | "completed"
  | "canceled";

export type OrderSummary = {
  createdAt: string;
  currencyCode: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryMode: string;
  deliveryStatus: string;
  firstItemTitle: string | null;
  id: number;
  itemsCount: number;
  orderNumber: string;
  source: string;
  sourceRef: string | null;
  status: string;
  totalPriceMinor: number;
  updatedAt: string;
};

export type OrderDetail = OrderSummary & {
  customer: {
    comment: string | null;
    email: string | null;
    id: number | null;
    name: string | null;
    phone: string | null;
  };
  customerAccount: CustomerAccountRetention | null;
  customerComment: string | null;
  customerId: number | null;
  delivery: {
    addressText: string | null;
    comment: string | null;
    currencyCode: string;
    deliveryMode: string;
    deliveryStatus: string;
    id: number;
    priceMinor: number;
    recipientName: string | null;
    recipientPhone: string | null;
    trackingNumber: string | null;
  } | null;
  events: OrderEvent[];
  items: Array<{
    calculationSnapshot: unknown;
    currencyCode: string;
    id: number;
    params: unknown;
    quantity: string;
    serviceType: string;
    sortOrder: number;
    title: string;
    totalPriceMinor: number;
    unitPriceMinor: number;
  }>;
};

export type OrderEvent = {
  actorName: string | null;
  actorType: string;
  createdAt: string;
  eventType: string;
  id: number;
  payload: unknown;
};

export type OrderAttachment = {
  attachmentType: string;
  comment: string | null;
  createdAt: string;
  downloadUrl: string;
  fileSize: number | null;
  id: number;
  mimeType: string | null;
  orderId: number;
  originalFileName: string;
  previewUrl: string | null;
};

export type DownloadOrderAttachmentResult =
  | { filePath?: string; status: "saved" }
  | { status: "cancelled" };

export type AuthUser = {
  displayName: string;
  email: string | null;
  id: number;
  login: string;
  role: "manager" | "admin";
};

export type AuthLoginResult = {
  expiresAt: string;
  token: string;
  user: AuthUser;
};

export type AuthMeResult = {
  session: {
    expiresAt: string;
  };
  user: AuthUser;
};

export type CreateOrderResult = {
  alreadyExists?: boolean;
  id: number;
  orderNumber: string;
};

export type DeleteOrderResult = {
  deleted: boolean;
  id: number;
};

export type UpdateOrderResult = {
  canceledOzonPaymentIds?: number[];
  id: number;
  ozonPaymentAutoCanceled?: boolean;
  orderNumber: string;
  updated: boolean;
};

export type UpdateOrderStatusResult = {
  event: OrderEvent;
  id: number;
  orderNumber: string;
  status: OrderWorkflowStatus;
};

export type AddOrderManagerCommentResult = {
  event: OrderEvent;
  id: number;
  orderNumber: string;
};

export type OrderPayment = {
  amountMinor: number;
  canceledAt: string | null;
  createdAt: string;
  currencyCode: string;
  expiresAt: string | null;
  id: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  ozonStatus: string | null;
  paidAt: string | null;
  payLink: string | null;
  paymentMethod: string | null;
  provider: string;
  refundedAt: string | null;
  status: string;
  testMode: boolean | null;
  updatedAt: string;
};

export type OrderPaymentResult = {
  payment: OrderPayment;
};

export type CdekStatus = {
  baseUrl: string;
  configured: boolean;
  enabled: boolean;
  env: "test" | "prod";
  features: {
    calculation: boolean;
    cities: boolean;
    deliveryPoints: boolean;
    printForms: boolean;
    shipments: boolean;
    webhooks: boolean;
  };
  missing: string[];
  tokenStatus: "cached" | "not_requested";
};

export type CdekCity = {
  city: string | null;
  cityUuid: string | null;
  code: number | null;
  countryCode: string | null;
  fiasGuid: string | null;
  fullName: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  regionCode: number | null;
};

export type CdekCitySearchResult = {
  items: CdekCity[];
};

export type CdekDeliveryPoint = {
  address: string | null;
  addressFull?: string | null;
  allowedCod: boolean | null;
  city?: string | null;
  cityCode?: number | null;
  code: string | null;
  countryCode?: string | null;
  dimensions?: {
    heightMax: number | null;
    lengthMax: number | null;
    widthMax: number | null;
  } | null;
  haveCash: boolean | null;
  haveCashless: boolean | null;
  heightMax?: number | null;
  isDressingRoom?: boolean | null;
  latitude: number | null;
  lengthMax?: number | null;
  longitude: number | null;
  name?: string | null;
  nearestStation?: string | null;
  phones: string[];
  type: string | null;
  uuid?: string | null;
  weightMax: number | null;
  weightMin: number | null;
  widthMax?: number | null;
  workTime: string | null;
};

export type CdekDeliveryPointSearchParams = {
  cityCode: number;
  type?: "ALL" | "PVZ" | "POSTAMAT";
};

export type CdekDeliveryPointSearchResult = {
  items: CdekDeliveryPoint[];
};

export type CdekDeliveryCalculationRequest = {
  currencyCode?: "RUB";
  deliveryPointCode?: string;
  fromLocation: {
    code: number;
  };
  packages: Array<{
    heightCm: number;
    lengthCm: number;
    weightGrams: number;
    widthCm: number;
  }>;
  shipmentPointCode?: string;
  tariffCode: number;
  toLocation: {
    code: number;
  };
};

export type CdekDeliveryCalculation = {
  calendarMax: number | null;
  calendarMin: number | null;
  currencyCode: string;
  deliverySum?: number | null;
  deliverySumMinor: number | null;
  errors: unknown[];
  notSaved: true;
  periodMax: number | null;
  periodMin: number | null;
  priceMinor: number | null;
  provider: "cdek";
  services: unknown[];
  tariffCode: number;
  totalSum?: number | null;
  totalSumMinor: number | null;
  warnings: unknown[];
  weightCalc: number | null;
};

export type CdekDeliveryCalculationResult = {
  calculation: CdekDeliveryCalculation;
  order: {
    id: number;
    orderNumber: string;
  };
};

export type CdekSaveDeliveryPackage = {
  heightCm: number;
  lengthCm: number;
  weightGrams: number;
  widthCm: number;
};

export type CdekSaveDeliveryRequest = {
  calculation?: CdekDeliveryCalculation;
  calendarMax?: string;
  calendarMin?: string;
  city: string;
  cityCode: number;
  cityUuid?: string;
  comment?: string;
  countryCode?: string;
  currencyCode?: "RUB";
  deliveryPointAddress: string;
  deliveryPointCode: string;
  deliveryPointType?: string;
  deliveryPointUuid?: string;
  packages: CdekSaveDeliveryPackage[];
  periodMax?: number;
  periodMin?: number;
  priceMinor: number;
  recipientName?: string;
  recipientPhone?: string;
  region?: string;
  shipmentPointCode?: string;
  tariffCode: number;
  tariffName?: string;
};

export type CdekSaveDeliveryResult = {
  delivery: {
    addressText: string | null;
    currencyCode: string;
    deliveryMode: "cdek";
    deliveryStatus: string;
    priceMinor: number;
    providerPayload: unknown;
    recipientName: string | null;
    recipientPhone: string | null;
  };
  order: {
    id: number;
    orderNumber: string;
  };
  payment: {
    activePaymentsCanceled: boolean;
    canceledPaymentIds: number[];
    financialChanged: boolean;
  };
  saved: boolean;
  totals: {
    deliveryTotalMinor: number;
    totalPriceMinor: number;
  };
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "https://api.diezimg.ru";
const apiWriteKey = import.meta.env.VITE_API_WRITE_KEY?.trim();
const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY?.trim();

function createApiHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  return headers;
}

function createJsonApiHeaders(apiKey?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...createApiHeaders(apiKey)
  };
}

export function createBearerHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`
  };
}

export function createJsonBearerHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...createBearerHeaders(token)
  };
}

function getOrderMutationErrorMessage(responseBody: string) {
  try {
    const parsedResponse = JSON.parse(responseBody) as {
      error?: unknown;
      message?: unknown;
    };

    if (parsedResponse.error === "ORDER_HAS_OZON_PAYMENT") {
      return "У заказа есть Ozon-оплата. Удаление запрещено. Сначала нужно разобраться с оплатой.";
    }

    if (parsedResponse.error === "ORDER_HAS_ACTIVE_OZON_PAYMENT") {
      return "У заказа есть активная Ozon-оплата. Сначала отмените оплату, затем измените заказ.";
    }

    if (parsedResponse.error === "ORDER_HAS_FINAL_OZON_PAYMENT") {
      return "У заказа есть финансовая Ozon-оплата. Изменение заказа запрещено.";
    }

    if (
      parsedResponse.error === "OZON_PAYMENT_NOT_CANCELABLE" ||
      parsedResponse.error === "OZON_PAYMENT_PROVIDER_ORDER_ID_REQUIRED"
    ) {
      return typeof parsedResponse.message === "string"
        ? parsedResponse.message
        : "Не удалось отменить Ozon-оплату.";
    }
  } catch {
    return null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getValidMinorPrice(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && Number.isInteger(numberValue)
    ? numberValue
    : null;
}

function getValidQuantity(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
}

function parsePriceMinorFromDisplay(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/\s+/g, "")
    .replace("RUB", "")
    .replace("₽", "")
    .replace(",", ".")
    .trim();
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.round(numericValue * 100)
    : null;
}

function createOrderDraftPayload(draftOrder: unknown) {
  if (!isRecord(draftOrder)) {
    return draftOrder;
  }

  const items = Array.isArray(draftOrder.items)
    ? draftOrder.items.filter(isRecord).map((item) => {
        const itemTotalPriceMinor =
          getValidMinorPrice(item.totalPriceMinor) ??
          getValidMinorPrice(item.priceMinor) ??
          parsePriceMinorFromDisplay(item.formattedPrice) ??
          parsePriceMinorFromDisplay(item.price);

        if (itemTotalPriceMinor === null || itemTotalPriceMinor <= 0) {
          throw new Error(
            `Некорректная цена позиции: ${
              typeof item.title === "string" && item.title.trim()
                ? item.title
                : String(item.id ?? "без названия")
            }`
          );
        }

        return {
          ...item,
          priceMinor: itemTotalPriceMinor,
          quantity: getValidQuantity(item.quantity),
          totalPriceMinor: itemTotalPriceMinor
        };
      })
    : [];
  const itemsTotalPriceMinor = items.reduce((total, item) => {
    return total + (getValidMinorPrice(item.totalPriceMinor) ?? 0);
  }, 0);
  const totalPriceMinor =
    getValidMinorPrice(draftOrder.totalPriceMinor) ?? itemsTotalPriceMinor;

  return {
    ...draftOrder,
    items,
    totalPriceMinor
  };
}

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${apiBaseUrl}/health`);

  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`);
  }

  return response.json() as Promise<ApiHealth>;
}

export async function getMaterials(): Promise<Material[]> {
  const response = await fetch(`${apiBaseUrl}/materials`);

  if (!response.ok) {
    throw new Error(`Materials request failed: ${response.status}`);
  }

  return response.json() as Promise<Material[]>;
}

export async function getMaterialPricingInputs(
  materialId: number
): Promise<MaterialPricingInput[]> {
  const response = await fetch(`${apiBaseUrl}/materials/${materialId}/pricing-inputs`);

  if (!response.ok) {
    throw new Error(`Material pricing inputs request failed: ${response.status}`);
  }

  return response.json() as Promise<MaterialPricingInput[]>;
}

export async function updateMaterialPurchasePrice(
  materialId: number,
  purchasePriceMinor: number
): Promise<MaterialPricingInput[]> {
  const response = await fetch(`${apiBaseUrl}/materials/${materialId}/pricing-inputs`, {
    body: JSON.stringify({
      purchasePriceMinor
    }),
    headers: createJsonApiHeaders(adminApiKey),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(`Material purchase price update failed: ${response.status}`);
  }

  return response.json() as Promise<MaterialPricingInput[]>;
}

export async function getCalculationFixtureDebug(
  fixtureId: string
): Promise<CalculationFixtureDebugResult> {
  const response = await fetch(
    `${apiBaseUrl}/debug/calculation/fixtures/${fixtureId}`
  );

  if (!response.ok) {
    throw new Error(`Calculation fixture request failed: ${response.status}`);
  }

  return response.json() as Promise<CalculationFixtureDebugResult>;
}

export async function login(
  loginValue: string,
  password: string
): Promise<AuthLoginResult> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    body: JSON.stringify({
      clientName: "diez-control-center-desktop",
      login: loginValue,
      password
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/auth/login ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<AuthLoginResult>;
}

export async function logout(token: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${apiBaseUrl}/auth/logout`, {
    headers: createBearerHeaders(token),
    method: "POST"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/auth/logout ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function getCurrentUser(token: string): Promise<AuthMeResult> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: createBearerHeaders(token)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/auth/me ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<AuthMeResult>;
}

export async function getOrders(token?: string): Promise<OrderSummary[]> {
  const response = await fetch(`${apiBaseUrl}/orders`, {
    headers: token ? createBearerHeaders(token) : undefined
  });

  if (!response.ok) {
    throw new Error(`Orders request failed: ${response.status}`);
  }

  return response.json() as Promise<OrderSummary[]>;
}

export async function getOrder(
  orderId: number,
  token?: string
): Promise<OrderDetail> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}`, {
    headers: token ? createBearerHeaders(token) : undefined
  });

  if (!response.ok) {
    throw new Error(`Order request failed: ${response.status}`);
  }

  return response.json() as Promise<OrderDetail>;
}

export function getOrderAttachmentPreviewUrl(
  orderId: number,
  attachmentId: number
) {
  return `${apiBaseUrl}/orders/${orderId}/attachments/${attachmentId}/preview`;
}

export function getOrderAttachmentDownloadUrl(
  orderId: number,
  attachmentId: number
) {
  return `${apiBaseUrl}/orders/${orderId}/attachments/${attachmentId}/download`;
}

export async function getOrderAttachments(
  orderId: number,
  token: string
): Promise<OrderAttachment[]> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/attachments`, {
    headers: createBearerHeaders(token)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/attachments ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<OrderAttachment[]>;
}

export async function uploadOrderAttachment(
  orderId: number,
  file: File,
  token: string,
  meta?: {
    attachmentType?: string;
    comment?: string;
    source?: string;
  }
): Promise<OrderAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  if (meta?.attachmentType) {
    formData.append("attachmentType", meta.attachmentType);
  }

  if (meta?.comment) {
    formData.append("comment", meta.comment);
  }

  if (meta?.source) {
    formData.append("source", meta.source);
  }

  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/attachments`, {
    body: formData,
    headers: createBearerHeaders(token),
    method: "POST"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/attachments ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<OrderAttachment>;
}

export async function fetchOrderAttachmentBlob(
  orderId: number,
  attachmentId: number,
  token: string,
  mode: "download" | "preview"
): Promise<Blob> {
  const url =
    mode === "preview"
      ? getOrderAttachmentPreviewUrl(orderId, attachmentId)
      : getOrderAttachmentDownloadUrl(orderId, attachmentId);
  const response = await fetch(url, {
    headers: createBearerHeaders(token)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `${url} ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.blob();
}

function getFileNameFromContentDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return utf8Match[1].trim().replace(/^"|"$/g, "");
    }
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i);

  return plainMatch?.[1]?.trim() || null;
}

function sanitizeDownloadedFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]/g, "_").trim() || "attachment";
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim();

  return extension && extension !== fileName ? extension : null;
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function saveAttachmentToDownloads(
  fileName: string,
  bytes: Uint8Array
): Promise<string> {
  return invoke<string>("save_file_to_downloads", {
    bytes: Array.from(bytes),
    filename: fileName
  });
}

export async function downloadOrderAttachment(
  orderId: number,
  attachmentId: number,
  token: string,
  fallbackFileName?: string
): Promise<DownloadOrderAttachmentResult> {
  const url = getOrderAttachmentDownloadUrl(orderId, attachmentId);
  const response = await fetch(url, {
    headers: createBearerHeaders(token)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `${url} ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const fileName = sanitizeDownloadedFileName(
    getFileNameFromContentDisposition(response.headers.get("Content-Disposition")) ||
      fallbackFileName ||
      `attachment-${attachmentId}`
  );

  if (isTauri()) {
    const extension = getFileExtension(fileName);
    let filePath: string | null | undefined;

    try {
      filePath = await save({
        defaultPath: fileName,
        filters: extension
          ? [
              {
                extensions: [extension],
                name: "Файл заказа"
              }
            ]
          : undefined,
        title: "Сохранить файл заказа"
      });
    } catch (error) {
      console.warn("[attachment-download] save dialog failed, using downloads fallback", {
        error: error instanceof Error ? error.message : String(error)
      });
      filePath = undefined;
    }

    if (filePath === undefined) {
      try {
        const fallbackPath = await saveAttachmentToDownloads(fileName, bytes);

        return {
          filePath: fallbackPath,
          status: "saved"
        };
      } catch (error) {
        throw new Error(
          `DOWNLOADS_FALLBACK_FAILED ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (filePath === null) {
      return { status: "cancelled" };
    }

    try {
      await writeFile(filePath, bytes);
      return {
        filePath,
        status: "saved"
      };
    } catch (error) {
      console.warn("[attachment-download] save dialog write failed, using downloads fallback", {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    try {
      const fallbackPath = await saveAttachmentToDownloads(fileName, bytes);

      return {
        filePath: fallbackPath,
        status: "saved"
      };
    } catch (error) {
      throw new Error(
        `DOWNLOADS_FALLBACK_FAILED ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  triggerBrowserDownload(
    new Blob([bytes], {
      type: response.headers.get("Content-Type") || undefined
    }),
    fileName
  );
  return { status: "saved" };
}

export async function openDownloadedFileLocation(filePath: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("TAURI_UNAVAILABLE");
  }

  await invoke("open_file_location", {
    path: filePath
  });
}

export async function createOrderFromDraft(
  draftOrder: unknown,
  token?: string
): Promise<CreateOrderResult> {
  const response = await fetch(`${apiBaseUrl}/orders`, {
    body: JSON.stringify(createOrderDraftPayload(draftOrder)),
    headers: token ? createJsonBearerHeaders(token) : createJsonApiHeaders(apiWriteKey),
    method: "POST"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<CreateOrderResult>;
}

export async function updateOrderFromDraft(
  orderId: number,
  draftOrder: unknown,
  token: string
): Promise<UpdateOrderResult> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}`, {
    body: JSON.stringify(createOrderDraftPayload(draftOrder)),
    headers: createJsonBearerHeaders(token),
    method: "PATCH"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const message = getOrderMutationErrorMessage(responseBody);

    if (message) {
      throw new Error(message);
    }

    throw new Error(
      `/orders/${orderId} ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<UpdateOrderResult>;
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderWorkflowStatus,
  comment: string,
  token: string
): Promise<UpdateOrderStatusResult> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/status`, {
    body: JSON.stringify({
      comment: comment.trim() || undefined,
      status
    }),
    headers: createJsonBearerHeaders(token),
    method: "PATCH"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/status ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<UpdateOrderStatusResult>;
}

export async function addOrderManagerComment(
  orderId: number,
  comment: string,
  token: string
): Promise<AddOrderManagerCommentResult> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/comments`, {
    body: JSON.stringify({
      comment
    }),
    headers: createJsonBearerHeaders(token),
    method: "POST"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/comments ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<AddOrderManagerCommentResult>;
}

export async function getCdekStatus(token: string): Promise<CdekStatus> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/cdek/status`, {
      headers: createBearerHeaders(token),
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/cdek/status ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<CdekStatus>;
}

export async function searchCdekCities(
  params: {
    countryCode?: string;
    name: string;
  },
  token: string
): Promise<CdekCitySearchResult> {
  const query = new URLSearchParams({
    name: params.name
  });

  if (params.countryCode) {
    query.set("countryCode", params.countryCode);
  }

  const response = await fetch(`${apiBaseUrl}/cdek/cities?${query.toString()}`, {
    headers: createBearerHeaders(token)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/cdek/cities ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<CdekCitySearchResult>;
}

export async function getCdekDeliveryPoints(
  params: CdekDeliveryPointSearchParams,
  token: string
): Promise<CdekDeliveryPointSearchResult> {
  const query = new URLSearchParams({
    cityCode: String(params.cityCode)
  });

  if (params.type) {
    query.set("type", params.type);
  }

  const response = await fetch(
    `${apiBaseUrl}/cdek/delivery-points?${query.toString()}`,
    {
      headers: createBearerHeaders(token)
    }
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/cdek/delivery-points ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<CdekDeliveryPointSearchResult>;
}

export async function calculateCdekDelivery(
  orderId: number,
  payload: CdekDeliveryCalculationRequest,
  token: string
): Promise<CdekDeliveryCalculationResult> {
  const response = await fetch(
    `${apiBaseUrl}/orders/${orderId}/delivery/cdek/calculate`,
    {
      body: JSON.stringify(payload),
      headers: createJsonBearerHeaders(token),
      method: "POST"
    }
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/delivery/cdek/calculate ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<CdekDeliveryCalculationResult>;
}

export async function saveCdekDelivery(
  orderId: number,
  payload: CdekSaveDeliveryRequest,
  token: string
): Promise<CdekSaveDeliveryResult> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/delivery/cdek`, {
    body: JSON.stringify(payload),
    headers: createJsonBearerHeaders(token),
    method: "PATCH"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/delivery/cdek ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  const result = (await response.json()) as {
    delivery: CdekSaveDeliveryResult["delivery"];
    id: number;
    orderNumber: string;
    payment?: CdekSaveDeliveryResult["payment"];
    totalPriceMinor: number;
    updated: boolean;
  };
  const payment = result.payment ?? {
    activePaymentsCanceled: false,
    canceledPaymentIds: [],
    financialChanged: false
  };

  return {
    delivery: result.delivery,
    order: {
      id: result.id,
      orderNumber: result.orderNumber
    },
    payment,
    saved: result.updated,
    totals: {
      deliveryTotalMinor: result.delivery.priceMinor,
      totalPriceMinor: result.totalPriceMinor
    }
  };
}

export async function getOrderPayments(
  orderId: number,
  token: string
): Promise<OrderPayment[]> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/payments`, {
    headers: createBearerHeaders(token)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/payments ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<OrderPayment[]>;
}

export async function createOzonOrderPayment(
  orderId: number,
  token: string
): Promise<OrderPaymentResult> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/payments/ozon`, {
    body: "{}",
    headers: createJsonBearerHeaders(token),
    method: "POST"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/payments/ozon ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<OrderPaymentResult>;
}

export async function syncOrderPayment(
  orderId: number,
  paymentId: number,
  token: string
): Promise<OrderPaymentResult> {
  const response = await fetch(
    `${apiBaseUrl}/orders/${orderId}/payments/${paymentId}/sync`,
    {
      body: "{}",
      headers: createJsonBearerHeaders(token),
      method: "POST"
    }
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `/orders/${orderId}/payments/${paymentId}/sync ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<OrderPaymentResult>;
}

export async function cancelOrderPayment(
  orderId: number,
  paymentId: number,
  token: string
): Promise<OrderPaymentResult> {
  const response = await fetch(
    `${apiBaseUrl}/orders/${orderId}/payments/${paymentId}/cancel`,
    {
      body: "{}",
      headers: createJsonBearerHeaders(token),
      method: "POST"
    }
  );

  if (!response.ok) {
    const responseBody = await response.text();
    const message = getOrderMutationErrorMessage(responseBody);

    if (message) {
      throw new Error(message);
    }

    throw new Error(
      `/orders/${orderId}/payments/${paymentId}/cancel ${response.status}${
        responseBody ? ` ${responseBody}` : ""
      }`
    );
  }

  return response.json() as Promise<OrderPaymentResult>;
}

export async function deleteOrder(
  orderId: number,
  token?: string
): Promise<DeleteOrderResult> {
  let response: Response;
  const url = `${apiBaseUrl}/orders/${orderId}`;

  try {
    response = await fetch(url, {
      headers: token ? createBearerHeaders(token) : createApiHeaders(apiWriteKey),
      method: "DELETE"
    });
  } catch (error) {
    console.error("Order delete API request failed", error);
    throw new Error("Не удалось связаться с API удаления заказа");
  }

  if (!response.ok) {
    const responseBody = await response.text();
    const message = getOrderMutationErrorMessage(responseBody);

    if (message) {
      throw new Error(message);
    }

    throw new Error(
      `/orders/${orderId} ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<DeleteOrderResult>;
}
