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

export type OrderSummary = {
  createdAt: string;
  currencyCode: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
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
  id: number;
  orderNumber: string;
  updated: boolean;
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
    throw new Error(
      `/orders/${orderId} ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<UpdateOrderResult>;
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
    throw new Error(
      `/orders/${orderId} ${response.status}${responseBody ? ` ${responseBody}` : ""}`
    );
  }

  return response.json() as Promise<DeleteOrderResult>;
}
