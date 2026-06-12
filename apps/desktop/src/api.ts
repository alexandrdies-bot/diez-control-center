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

export type CreateOrderResult = {
  alreadyExists?: boolean;
  id: number;
  orderNumber: string;
};

export type DeleteOrderResult = {
  deleted: boolean;
  id: number;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";
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

export async function getOrders(): Promise<OrderSummary[]> {
  const response = await fetch(`${apiBaseUrl}/orders`);

  if (!response.ok) {
    throw new Error(`Orders request failed: ${response.status}`);
  }

  return response.json() as Promise<OrderSummary[]>;
}

export async function getOrder(orderId: number): Promise<OrderDetail> {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}`);

  if (!response.ok) {
    throw new Error(`Order request failed: ${response.status}`);
  }

  return response.json() as Promise<OrderDetail>;
}

export async function createOrderFromDraft(
  draftOrder: unknown
): Promise<CreateOrderResult> {
  const response = await fetch(`${apiBaseUrl}/orders`, {
    body: JSON.stringify(createOrderDraftPayload(draftOrder)),
    headers: createJsonApiHeaders(apiWriteKey),
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

export async function deleteOrder(orderId: number): Promise<DeleteOrderResult> {
  let response: Response;
  const url = `${apiBaseUrl}/orders/${orderId}`;

  try {
    response = await fetch(url, {
      headers: createApiHeaders(apiWriteKey),
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
