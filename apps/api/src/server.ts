import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { PoolClient } from "pg";
import { checkCalculationCoreImport } from "./calculation-core-import-check.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, "../../..");

dotenv.config({
  path: path.join(repoRoot, ".env")
});

const {
  checkDatabaseConnection,
  queryDatabase,
  withDatabaseTransaction
} = await import("./db.js");

const apiHost = process.env.API_HOST ?? "127.0.0.1";
const apiPort = Number(process.env.API_PORT ?? "3001");
const isProduction = process.env.NODE_ENV === "production";
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const apiWriteKey = process.env.API_WRITE_KEY?.trim();
const adminApiKey = process.env.ADMIN_API_KEY?.trim();
const debugEndpointsEnabled =
  process.env.DEBUG_ENDPOINTS_ENABLED === "true" || !isProduction;

const app = Fastify({
  logger: true
});

await app.register(cors, {
  allowedHeaders: ["Authorization", "Content-Type", "x-api-key"],
  methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  origin: isProduction ? corsAllowedOrigins : true
});

type AuthLoginPayload = {
  clientName?: unknown;
  login?: unknown;
  password?: unknown;
};

type PublicAuthUser = {
  displayName: string;
  email: string | null;
  id: number;
  login: string;
  role: AuthUserRole;
};

type AuthUserRole = "manager" | "admin";

type AuthPublicUserRow = {
  displayName: string;
  email: string | null;
  id: string;
  login: string;
  role: AuthUserRole;
};

type AuthUserRow = AuthPublicUserRow & {
  passwordHash: string;
};

type AuthSessionRow = AuthPublicUserRow & {
  expiresAt: string;
  sessionId: string;
};

type AuthenticatedUser = PublicAuthUser;

type AuthSessionContext = {
  session: {
    expiresAt: string;
    id: number;
  };
  user: AuthenticatedUser;
};

type DesktopDraftOrderCustomer = {
  comment?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
};

type DesktopDraftOrderDelivery = {
  address?: unknown;
  comment?: unknown;
  contactName?: unknown;
  mode?: unknown;
  phone?: unknown;
};

type DesktopDraftOrderItem = {
  areaM2?: unknown;
  baselineStatus?: unknown;
  boardTapeColorName?: unknown;
  boardThicknessMm?: unknown;
  boardWidthMm?: unknown;
  calculationId?: unknown;
  calculationSnapshot?: unknown;
  calculationSource?: unknown;
  checkMode?: unknown;
  faceFilmColorCode?: unknown;
  faceFilmLabel?: unknown;
  formattedPrice?: unknown;
  heightCm?: unknown;
  heightMm?: unknown;
  id?: unknown;
  ledCount?: unknown;
  lightingMode?: unknown;
  priceMinor?: unknown;
  params?: unknown;
  quantity?: unknown;
  resolvedBoardTapeMaterialName?: unknown;
  resolvedBoardTapeThicknessMm?: unknown;
  serviceType?: unknown;
  text?: unknown;
  title?: unknown;
  totalPriceMinor?: unknown;
  type?: unknown;
  widthCm?: unknown;
};

type DesktopDraftOrderPayload = {
  createdAt?: unknown;
  customer?: DesktopDraftOrderCustomer;
  delivery?: DesktopDraftOrderDelivery;
  id?: unknown;
  items?: unknown;
  totalPriceMinor?: unknown;
  updatedAt?: unknown;
};

type CheckoutOrderCustomer = {
  comment?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
};

type CheckoutOrderDelivery = DesktopDraftOrderDelivery;

type CheckoutOrderItem = {
  calculationSnapshot?: unknown;
  params?: unknown;
  priceMinor?: unknown;
  quantity?: unknown;
  serviceType?: unknown;
  title?: unknown;
  totalPriceMinor?: unknown;
};

type CheckoutOrderPayload = {
  checkoutDraftId?: unknown;
  comment?: unknown;
  customer?: CheckoutOrderCustomer;
  delivery?: CheckoutOrderDelivery;
  items?: unknown;
  totalPriceMinor?: unknown;
};

type ApiOrderSummaryRow = {
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

type ApiOrderDetailRow = ApiOrderSummaryRow & {
  customerComment: string | null;
  customerId: number | null;
};

type ApiOrderDeliveryRow = {
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
};

type ApiOrderItemRow = {
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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequestApiKey(request: FastifyRequest) {
  const headerValue = request.headers["x-api-key"];

  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}

function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
  expectedKey: string | undefined
) {
  if (!isProduction) {
    return null;
  }

  const requestApiKey = getRequestApiKey(request);

  if (!requestApiKey) {
    return reply.code(401).send({
      error: "UNAUTHORIZED"
    });
  }

  if (!expectedKey || requestApiKey !== expectedKey) {
    return reply.code(403).send({
      error: "INVALID_API_KEY"
    });
  }

  return null;
}

function requireWriteKey(request: FastifyRequest, reply: FastifyReply) {
  return requireApiKey(request, reply, apiWriteKey);
}

function requireAdminKey(request: FastifyRequest, reply: FastifyReply) {
  return requireApiKey(request, reply, adminApiKey);
}

function getBearerToken(request: FastifyRequest) {
  const headerValue = request.headers.authorization;
  const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!normalizedHeader) {
    return null;
  }

  const [scheme, token] = normalizedHeader.trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function hashSessionToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

function normalizeLogin(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhoneLogin(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

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

function buildPublicAuthUser(row: AuthPublicUserRow): PublicAuthUser {
  return {
    displayName: row.displayName,
    email: row.email,
    id: Number(row.id),
    login: row.login,
    role: row.role
  };
}

function verifyPassword(password: string, passwordHash: string) {
  const [format, saltHex, keyHex] = passwordHash.split(":");

  if (format !== "scrypt" || !saltHex || !keyHex) {
    return false;
  }

  try {
    const expectedKey = Buffer.from(keyHex, "hex");
    const salt = Buffer.from(saltHex, "hex");

    if (expectedKey.length === 0 || salt.length === 0) {
      return false;
    }

    const derivedKey = scryptSync(password, salt, expectedKey.length);

    return (
      derivedKey.length === expectedKey.length &&
      timingSafeEqual(derivedKey, expectedKey)
    );
  } catch {
    return false;
  }
}

async function getAuthSession(
  request: FastifyRequest
): Promise<AuthSessionContext | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const sessions = await queryDatabase<AuthSessionRow>(
    `
      select
        s.id::text as "sessionId",
        s.expires_at::text as "expiresAt",
        u.id::text as id,
        u.login,
        u.email,
        u.display_name as "displayName",
        u.role
      from app.user_sessions s
      join app.users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and u.is_active = true
      limit 1
    `,
    [tokenHash]
  );
  const session = sessions[0];

  if (!session) {
    return null;
  }

  await queryDatabase(
    `
      update app.user_sessions
      set last_seen_at = now()
      where id = $1
    `,
    [session.sessionId]
  );

  return {
    session: {
      expiresAt: session.expiresAt,
      id: Number(session.sessionId)
    },
    user: buildPublicAuthUser(session)
  };
}

async function requireAuthSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authSession = await getAuthSession(request);

  if (!authSession) {
    reply.code(401).send({
      error: "UNAUTHORIZED"
    });
    return null;
  }

  return authSession;
}

async function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly AuthUserRole[]
) {
  const authSession = await requireAuthSession(request, reply);

  if (!authSession) {
    return null;
  }

  if (!allowedRoles.includes(authSession.user.role)) {
    reply.code(403).send({
      error: "FORBIDDEN"
    });
    return null;
  }

  return authSession;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRequiredString(value: unknown) {
  const normalizedValue = getOptionalString(value);
  return normalizedValue ?? "";
}

function getMinorPrice(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function getPositiveQuantity(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
}

function mapServiceType(serviceType: string) {
  switch (serviceType) {
    case "light-letter":
    case "light_letters":
      return "light_letters";
    case "dtf-print":
    case "dtf_print":
      return "dtf_print";
    case "wide-format-print":
    case "wide_format_print":
      return "wide_format_print";
    case "ready-product":
    case "ready_product":
      return "ready_product";
    case "manual":
      return "manual";
    default:
      return "other";
  }
}

function normalizeDeliveryMode(mode: unknown) {
  if (
    mode === "not-required" ||
    mode === "manual" ||
    mode === "pickup" ||
    mode === "cdek"
  ) {
    return mode;
  }

  if (mode === "required") {
    return "manual";
  }

  return "not-required";
}

function getDeliveryStatus(mode: string) {
  return mode === "not-required" ? "not_required" : "pending";
}

function getOrderItemPriceMinor(item: DesktopDraftOrderItem) {
  return getMinorPrice(item.totalPriceMinor) ?? getMinorPrice(item.priceMinor);
}

function getOrderItemParams(item: DesktopDraftOrderItem) {
  if (isRecord(item.params)) {
    return item.params;
  }

  const serviceType = getRequiredString(item.serviceType);

  if (serviceType === "light-letter") {
    return {
      boardTapeColorName: getOptionalString(item.boardTapeColorName),
      boardThicknessMm: item.boardThicknessMm ?? null,
      boardWidthMm: item.boardWidthMm ?? null,
      faceFilmColorCode: getOptionalString(item.faceFilmColorCode),
      faceFilmLabel: getOptionalString(item.faceFilmLabel),
      heightMm: getOptionalString(item.heightMm),
      lightingMode: getOptionalString(item.lightingMode),
      resolvedBoardTapeMaterialName: getOptionalString(
        item.resolvedBoardTapeMaterialName
      ),
      resolvedBoardTapeThicknessMm: item.resolvedBoardTapeThicknessMm ?? null,
      text: getOptionalString(item.text)
    };
  }

  if (serviceType === "dtf-print") {
    return {
      areaM2: item.areaM2 ?? null,
      heightCm: item.heightCm ?? null,
      quantity: item.quantity ?? null,
      widthCm: item.widthCm ?? null
    };
  }

  return {
    id: getOptionalString(item.id),
    type: getOptionalString(item.type)
  };
}

function getOrderItemCalculationSnapshot(item: DesktopDraftOrderItem) {
  if (isRecord(item.calculationSnapshot)) {
    return item.calculationSnapshot;
  }

  return {
    baselineStatus: getOptionalString(item.baselineStatus),
    calculationId: getOptionalString(item.calculationId),
    calculationSource: getOptionalString(item.calculationSource),
    checkMode: getOptionalString(item.checkMode),
    formattedPrice: getOptionalString(item.formattedPrice),
    ledCount: item.ledCount ?? null
  };
}

type DesktopDraftOrderValidationOptions = {
  requireItems: boolean;
  requireSourceRef: boolean;
};

type ValidDesktopDraftOrderPayload = {
  customer: Record<string, unknown>;
  customerComment: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerSnapshot: {
    comment: string | null;
    email: string | null;
    name: string | null;
    phone: string | null;
  };
  delivery: Record<string, unknown>;
  normalizedItems: DesktopDraftOrderItem[];
  sourceRef: string | null;
  totalPriceMinor: number;
};

type DesktopDraftOrderValidationResult =
  | {
      ok: true;
      payload: ValidDesktopDraftOrderPayload;
    }
  | {
      ok: false;
      body: {
        error: string;
        itemIndex?: number;
        reason: string;
      };
      statusCode: 400;
    };

type ValidCheckoutOrderPayload = {
  customerComment: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerSnapshot: {
    comment: string | null;
    email: string | null;
    name: string | null;
    phone: string | null;
  };
  delivery: Record<string, unknown>;
  normalizedItems: DesktopDraftOrderItem[];
  sourceRef: string;
  totalPriceMinor: number;
};

type CheckoutOrderValidationResult =
  | {
      ok: true;
      payload: ValidCheckoutOrderPayload;
    }
  | {
      ok: false;
      body: {
        error: string;
        itemIndex?: number;
        reason: string;
      };
      statusCode: 400;
    };

function validateDesktopDraftOrderPayload(
  draftOrder: unknown,
  options: DesktopDraftOrderValidationOptions
): DesktopDraftOrderValidationResult {
  if (!isRecord(draftOrder)) {
    return {
      body: {
        error: "INVALID_ORDER_PAYLOAD",
        reason: "payload is not an object"
      },
      ok: false,
      statusCode: 400
    };
  }

  const sourceRef = getRequiredString(draftOrder.id);
  const totalPriceMinor = getMinorPrice(draftOrder.totalPriceMinor);
  const items = Array.isArray(draftOrder.items)
    ? draftOrder.items.filter(isRecord)
    : [];

  if (options.requireSourceRef && !sourceRef) {
    return {
      body: {
        error: "INVALID_ORDER_PAYLOAD",
        reason: "missing id"
      },
      ok: false,
      statusCode: 400
    };
  }

  if (totalPriceMinor === null) {
    return {
      body: {
        error: "INVALID_ORDER_PAYLOAD",
        reason: "invalid totalPriceMinor"
      },
      ok: false,
      statusCode: 400
    };
  }

  if (options.requireItems && items.length === 0) {
    return {
      body: {
        error: "INVALID_ORDER_PAYLOAD",
        reason: "items is empty"
      },
      ok: false,
      statusCode: 400
    };
  }

  const normalizedItems = items.map((item) => item as DesktopDraftOrderItem);

  for (const [itemIndex, item] of normalizedItems.entries()) {
    if (!getRequiredString(item.title)) {
      return {
        body: {
          error: "INVALID_ORDER_ITEM",
          itemIndex,
          reason: "missing title"
        },
        ok: false,
        statusCode: 400
      };
    }

    if (!getRequiredString(item.serviceType)) {
      return {
        body: {
          error: "INVALID_ORDER_ITEM",
          itemIndex,
          reason: "missing serviceType"
        },
        ok: false,
        statusCode: 400
      };
    }

    if (getOrderItemPriceMinor(item) === null) {
      return {
        body: {
          error: "INVALID_ORDER_ITEM",
          itemIndex,
          reason: "missing totalPriceMinor / invalid item price"
        },
        ok: false,
        statusCode: 400
      };
    }
  }

  const customer = isRecord(draftOrder.customer) ? draftOrder.customer : {};
  const delivery = isRecord(draftOrder.delivery) ? draftOrder.delivery : {};
  const customerName = getOptionalString(customer.name);
  const customerPhone = getOptionalString(customer.phone);
  const customerEmail = getOptionalString(customer.email);
  const customerComment = getOptionalString(customer.comment);

  return {
    ok: true,
    payload: {
      customer,
      customerComment,
      customerEmail,
      customerName,
      customerPhone,
      customerSnapshot: {
        comment: customerComment,
        email: customerEmail,
        name: customerName,
        phone: customerPhone
      },
      delivery,
      normalizedItems,
      sourceRef: sourceRef || null,
      totalPriceMinor
    }
  };
}

function getSafeCheckoutSourceRef(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const sourceRef = value.trim();

  return /^[a-zA-Z0-9:_-]{1,120}$/.test(sourceRef) ? sourceRef : null;
}

function generateCheckoutSourceRef() {
  return `checkout_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

function validateCheckoutOrderPayload(
  checkoutOrder: unknown
): CheckoutOrderValidationResult {
  if (!isRecord(checkoutOrder)) {
    return {
      body: {
        error: "INVALID_CHECKOUT_ORDER_PAYLOAD",
        reason: "payload is not an object"
      },
      ok: false,
      statusCode: 400
    };
  }

  const totalPriceMinor = getMinorPrice(checkoutOrder.totalPriceMinor);
  const items = Array.isArray(checkoutOrder.items)
    ? checkoutOrder.items.filter(isRecord)
    : [];

  if (totalPriceMinor === null) {
    return {
      body: {
        error: "INVALID_CHECKOUT_ORDER_PAYLOAD",
        reason: "invalid totalPriceMinor"
      },
      ok: false,
      statusCode: 400
    };
  }

  if (items.length === 0) {
    return {
      body: {
        error: "INVALID_CHECKOUT_ORDER_PAYLOAD",
        reason: "items is empty"
      },
      ok: false,
      statusCode: 400
    };
  }

  const normalizedItems = items.map((item) => item as CheckoutOrderItem);

  for (const [itemIndex, item] of normalizedItems.entries()) {
    if (!getRequiredString(item.title)) {
      return {
        body: {
          error: "INVALID_CHECKOUT_ORDER_ITEM",
          itemIndex,
          reason: "missing title"
        },
        ok: false,
        statusCode: 400
      };
    }

    if (getMinorPrice(item.totalPriceMinor) === null) {
      return {
        body: {
          error: "INVALID_CHECKOUT_ORDER_ITEM",
          itemIndex,
          reason: "invalid totalPriceMinor"
        },
        ok: false,
        statusCode: 400
      };
    }
  }

  const customer = isRecord(checkoutOrder.customer)
    ? checkoutOrder.customer
    : {};
  const delivery = isRecord(checkoutOrder.delivery)
    ? checkoutOrder.delivery
    : {};
  const customerName = getOptionalString(customer.name);
  const customerPhone = getOptionalString(customer.phone);
  const customerEmail = getOptionalString(customer.email);
  const customerComment =
    getOptionalString(customer.comment) ?? getOptionalString(checkoutOrder.comment);

  if (!customerPhone && !customerEmail) {
    return {
      body: {
        error: "INVALID_CHECKOUT_ORDER_PAYLOAD",
        reason: "customer phone or email is required"
      },
      ok: false,
      statusCode: 400
    };
  }

  return {
    ok: true,
    payload: {
      customerComment,
      customerEmail,
      customerName,
      customerPhone,
      customerSnapshot: {
        comment: customerComment,
        email: customerEmail,
        name: customerName,
        phone: customerPhone
      },
      delivery,
      normalizedItems: normalizedItems.map((item) => ({
        calculationSnapshot: item.calculationSnapshot,
        params: item.params,
        priceMinor: item.priceMinor,
        quantity: item.quantity,
        serviceType: getOptionalString(item.serviceType) ?? "other",
        title: item.title,
        totalPriceMinor: item.totalPriceMinor
      })),
      sourceRef:
        getSafeCheckoutSourceRef(checkoutOrder.checkoutDraftId) ??
        generateCheckoutSourceRef(),
      totalPriceMinor
    }
  };
}

async function insertOrderItems(
  client: PoolClient,
  orderId: number,
  normalizedItems: DesktopDraftOrderItem[]
) {
  for (const [index, item] of normalizedItems.entries()) {
    const itemTotalPriceMinor = getOrderItemPriceMinor(item) ?? 0;
    const quantity = getPositiveQuantity(item.quantity);

    await client.query(
      `
        insert into app.order_items (
          order_id,
          service_type,
          title,
          quantity,
          unit_price_minor,
          total_price_minor,
          currency_code,
          params_json,
          calculation_snapshot_json,
          sort_order
        )
        values (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'RUB',
          $7::jsonb,
          $8::jsonb,
          $9
        )
      `,
      [
        orderId,
        mapServiceType(getRequiredString(item.serviceType)),
        getRequiredString(item.title),
        quantity,
        Math.round(itemTotalPriceMinor / quantity),
        itemTotalPriceMinor,
        JSON.stringify(getOrderItemParams(item)),
        JSON.stringify(getOrderItemCalculationSnapshot(item)),
        index + 1
      ]
    );
  }
}

async function upsertOrderDelivery(
  client: PoolClient,
  orderId: number,
  delivery: Record<string, unknown>,
  customerName: string | null,
  customerPhone: string | null
) {
  const deliveryMode = normalizeDeliveryMode(delivery.mode);
  const values = [
    orderId,
    deliveryMode,
    getDeliveryStatus(deliveryMode),
    getOptionalString(delivery.contactName) ?? customerName,
    getOptionalString(delivery.phone) ?? customerPhone,
    getOptionalString(delivery.address),
    getOptionalString(delivery.comment)
  ];
  const existingDelivery = await client.query<{ id: number }>(
    `
      select id
      from app.order_delivery
      where order_id = $1
      limit 1
    `,
    [orderId]
  );

  if (existingDelivery.rows[0]) {
    await client.query(
      `
        update app.order_delivery
        set
          delivery_mode = $2,
          delivery_status = $3,
          recipient_name = $4,
          recipient_phone = $5,
          address_text = $6,
          comment = $7,
          price_minor = 0,
          currency_code = 'RUB'
        where order_id = $1
      `,
      values
    );
    return;
  }

  await client.query(
    `
      insert into app.order_delivery (
        order_id,
        delivery_mode,
        delivery_status,
        recipient_name,
        recipient_phone,
        address_text,
        comment,
        price_minor,
        currency_code,
        provider_payload_json
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        0,
        'RUB',
        '{}'::jsonb
      )
    `,
    values
  );
}

app.get("/health", async () => {
  return {
    ok: true,
    service: "diez-control-center-api",
    version: "0.0.0"
  };
});

app.get("/health/calculation-core", async () => {
  return checkCalculationCoreImport();
});

if (debugEndpointsEnabled) {
  const {
    checkCalculationFixture,
    checkSimpleLightTextDiez300Fixture
  } = await import("./debug-calculation-fixture.js");

  app.get("/debug/calculation/simple-light-text-diez-300", async () => {
    return checkSimpleLightTextDiez300Fixture();
  });

  app.get<{ Params: { fixtureId: string } }>(
    "/debug/calculation/fixtures/:fixtureId",
    async (request, reply) => {
      const result = await checkCalculationFixture(request.params.fixtureId);

      if (!result.ok) {
        return reply.code(404).send(result);
      }

      return result;
    }
  );
}

app.get("/health/db", async (_request, reply) => {
  const result = await checkDatabaseConnection();

  if (!result.ok) {
    return reply.code(503).send(result);
  }

  return result;
});

app.post<{ Body: AuthLoginPayload }>("/auth/login", async (request, reply) => {
  const login = normalizeLogin(request.body?.login);
  const phoneLogin = normalizePhoneLogin(request.body?.login);
  const password = request.body?.password;

  if (!login || typeof password !== "string" || password.length === 0) {
    return reply.code(400).send({
      error: "INVALID_AUTH_PAYLOAD"
    });
  }

  const users = await queryDatabase<AuthUserRow>(
    `
      select
        id::text as id,
        login,
        email,
        display_name as "displayName",
        password_hash as "passwordHash",
        role
      from app.users
      where (lower(login) = lower($1) or ($2::text is not null and login = $2))
        and is_active = true
      limit 1
    `,
    [login, phoneLogin]
  );
  const user = users[0];

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return reply.code(401).send({
      error: "INVALID_LOGIN_OR_PASSWORD"
    });
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const clientName = getOptionalString(request.body?.clientName);
  const userAgent = getOptionalString(request.headers["user-agent"]);

  const session = await withDatabaseTransaction(async (client) => {
    const sessionResult = await client.query<{ expiresAt: string }>(
      `
        insert into app.user_sessions (
          user_id,
          token_hash,
          expires_at,
          user_agent,
          client_name
        )
        values ($1, $2, now() + interval '7 days', $3, $4)
        returning expires_at::text as "expiresAt"
      `,
      [user.id, tokenHash, userAgent, clientName]
    );

    await client.query(
      `
        update app.users
        set last_login_at = now()
        where id = $1
      `,
      [user.id]
    );

    return sessionResult.rows[0];
  });

  return {
    expiresAt: session.expiresAt,
    token,
    user: buildPublicAuthUser(user)
  };
});

app.post("/auth/logout", async (request) => {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: true
    };
  }

  await queryDatabase(
    `
      update app.user_sessions
      set revoked_at = now()
      where token_hash = $1
        and revoked_at is null
    `,
    [hashSessionToken(token)]
  );

  return {
    ok: true
  };
});

app.get("/auth/me", async (request, reply) => {
  const authSession = await requireAuthSession(request, reply);

  if (!authSession) {
    return null;
  }

  return {
    session: {
      expiresAt: authSession.session.expiresAt
    },
    user: authSession.user
  };
});

app.post<{ Body: CheckoutOrderPayload }>(
  "/checkout/orders",
  async (request, reply) => {
    const validation = validateCheckoutOrderPayload(request.body);

    if (!validation.ok) {
      return reply.code(validation.statusCode).send(validation.body);
    }

    const {
      customerComment,
      customerEmail,
      customerName,
      customerPhone,
      customerSnapshot,
      delivery,
      normalizedItems,
      sourceRef,
      totalPriceMinor
    } = validation.payload;

    const result = await withDatabaseTransaction(async (client) => {
      const existingOrder = await client.query<{
        id: number;
        order_number: string;
      }>(
        `
          select id, order_number
          from app.orders
          where source = 'checkout'
            and source_ref = $1
          limit 1
        `,
        [sourceRef]
      );

      if (existingOrder.rows[0]) {
        return {
          alreadyExists: true,
          id: existingOrder.rows[0].id,
          orderNumber: existingOrder.rows[0].order_number
        };
      }

      const customerResult = await client.query<{ id: number }>(
        `
          insert into app.customers (
            customer_type,
            name,
            phone,
            email,
            comment
          )
          values ('person', $1, $2, $3, $4)
          returning id
        `,
        [customerName, customerPhone, customerEmail, customerComment]
      );
      const customerId = customerResult.rows[0]?.id ?? null;

      const orderResult = await client.query<{
        id: number;
        order_number: string;
      }>(
        `
          insert into app.orders (
            source,
            source_ref,
            status,
            customer_id,
            customer_snapshot_json,
            items_total_minor,
            delivery_total_minor,
            discount_total_minor,
            total_price_minor,
            currency_code,
            customer_comment,
            manager_comment
          )
          values (
            'checkout',
            $1,
            'new',
            $2,
            $3::jsonb,
            $4,
            0,
            0,
            $5,
            'RUB',
            $6,
            null
          )
          returning id, order_number
        `,
        [
          sourceRef,
          customerId,
          JSON.stringify(customerSnapshot),
          totalPriceMinor,
          totalPriceMinor,
          customerComment
        ]
      );
      const orderId = orderResult.rows[0].id;
      const orderNumber = orderResult.rows[0].order_number;

      await insertOrderItems(client, orderId, normalizedItems);
      await upsertOrderDelivery(
        client,
        orderId,
        delivery,
        customerName,
        customerPhone
      );

      await client.query(
        `
          insert into app.order_events (
            order_id,
            event_type,
            actor_type,
            payload_json
          )
          values ($1, 'order_created', 'site', $2::jsonb)
        `,
        [
          orderId,
          JSON.stringify({
            source: "checkout",
            sourceRef
          })
        ]
      );

      return {
        alreadyExists: false,
        id: orderId,
        orderNumber
      };
    });

    return result;
  }
);

app.get("/orders", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return null;
  }

  return queryDatabase<ApiOrderSummaryRow>(
    `
      select
        o.id,
        o.order_number as "orderNumber",
        o.status,
        o.source,
        o.source_ref as "sourceRef",
        o.total_price_minor as "totalPriceMinor",
        o.currency_code as "currencyCode",
        o.created_at::text as "createdAt",
        o.updated_at::text as "updatedAt",
        c.name as "customerName",
        c.phone as "customerPhone",
        c.email as "customerEmail",
        item_stats.items_count as "itemsCount",
        first_item.title as "firstItemTitle"
      from app.orders o
      left join app.customers c on c.id = o.customer_id
      left join lateral (
        select count(*)::int as items_count
        from app.order_items oi
        where oi.order_id = o.id
      ) item_stats on true
      left join lateral (
        select oi.title
        from app.order_items oi
        where oi.order_id = o.id
        order by oi.sort_order, oi.id
        limit 1
      ) first_item on true
      order by o.created_at desc, o.id desc
    `
  );
});

app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return null;
  }

  const orderId = Number(request.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return reply.code(400).send({
      error: "INVALID_ORDER_ID"
    });
  }

  const orders = await queryDatabase<ApiOrderDetailRow>(
    `
      select
        o.id,
        o.order_number as "orderNumber",
        o.status,
        o.source,
        o.source_ref as "sourceRef",
        o.customer_id as "customerId",
        o.total_price_minor as "totalPriceMinor",
        o.currency_code as "currencyCode",
        o.customer_comment as "customerComment",
        o.created_at::text as "createdAt",
        o.updated_at::text as "updatedAt",
        c.name as "customerName",
        c.phone as "customerPhone",
        c.email as "customerEmail",
        item_stats.items_count as "itemsCount",
        first_item.title as "firstItemTitle"
      from app.orders o
      left join app.customers c on c.id = o.customer_id
      left join lateral (
        select count(*)::int as items_count
        from app.order_items oi
        where oi.order_id = o.id
      ) item_stats on true
      left join lateral (
        select oi.title
        from app.order_items oi
        where oi.order_id = o.id
        order by oi.sort_order, oi.id
        limit 1
      ) first_item on true
      where o.id = $1
      limit 1
    `,
    [orderId]
  );
  const order = orders[0];

  if (!order) {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  const [delivery, items] = await Promise.all([
    queryDatabase<ApiOrderDeliveryRow>(
      `
        select
          id,
          delivery_mode as "deliveryMode",
          delivery_status as "deliveryStatus",
          recipient_name as "recipientName",
          recipient_phone as "recipientPhone",
          address_text as "addressText",
          comment,
          price_minor as "priceMinor",
          currency_code as "currencyCode",
          tracking_number as "trackingNumber"
        from app.order_delivery
        where order_id = $1
        limit 1
      `,
      [orderId]
    ),
    queryDatabase<ApiOrderItemRow>(
      `
        select
          id,
          service_type as "serviceType",
          title,
          quantity::text as quantity,
          unit_price_minor as "unitPriceMinor",
          total_price_minor as "totalPriceMinor",
          currency_code as "currencyCode",
          params_json as params,
          calculation_snapshot_json as "calculationSnapshot",
          sort_order as "sortOrder"
        from app.order_items
        where order_id = $1
        order by sort_order, id
      `,
      [orderId]
    )
  ]);

  return {
    ...order,
    customer: {
      comment: order.customerComment,
      email: order.customerEmail,
      id: order.customerId,
      name: order.customerName,
      phone: order.customerPhone
    },
    delivery: delivery[0] ?? null,
    items
  };
});

app.post<{ Body: DesktopDraftOrderPayload }>("/orders", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return null;
  }

  const validation = validateDesktopDraftOrderPayload(request.body, {
    requireItems: true,
    requireSourceRef: true
  });

  if (!validation.ok) {
    return reply.code(validation.statusCode).send(validation.body);
  }

  const {
    customerComment,
    customerEmail,
    customerName,
    customerPhone,
    customerSnapshot,
    delivery,
    normalizedItems,
    sourceRef,
    totalPriceMinor
  } = validation.payload;

  const result = await withDatabaseTransaction(async (client) => {
    const existingOrder = await client.query<{
      id: number;
      order_number: string;
    }>(
      `
        select id, order_number
        from app.orders
        where source = 'desktop'
          and source_ref = $1
        limit 1
      `,
      [sourceRef]
    );

    if (existingOrder.rows[0]) {
      return {
        alreadyExists: true,
        id: existingOrder.rows[0].id,
        orderNumber: existingOrder.rows[0].order_number
      };
    }

    const customerResult = await client.query<{ id: number }>(
      `
        insert into app.customers (
          customer_type,
          name,
          phone,
          email,
          comment
        )
        values ('person', $1, $2, $3, $4)
        returning id
      `,
      [customerName, customerPhone, customerEmail, customerComment]
    );
    const customerId = customerResult.rows[0]?.id ?? null;

    const orderResult = await client.query<{
      id: number;
      order_number: string;
    }>(
      `
        insert into app.orders (
          source,
          source_ref,
          status,
          customer_id,
          customer_snapshot_json,
          items_total_minor,
          delivery_total_minor,
          discount_total_minor,
          total_price_minor,
          currency_code,
          customer_comment,
          manager_comment
        )
        values (
          'desktop',
          $1,
          'new',
          $2,
          $3::jsonb,
          $4,
          0,
          0,
          $5,
          'RUB',
          $6,
          null
        )
        returning id, order_number
      `,
      [
        sourceRef,
        customerId,
        JSON.stringify(customerSnapshot),
        totalPriceMinor,
        totalPriceMinor,
        customerComment
      ]
    );
    const orderId = orderResult.rows[0].id;
    const orderNumber = orderResult.rows[0].order_number;

    await insertOrderItems(client, orderId, normalizedItems);
    await upsertOrderDelivery(client, orderId, delivery, customerName, customerPhone);

    await client.query(
      `
        insert into app.order_events (
          order_id,
          event_type,
          actor_type,
          payload_json
        )
        values ($1, 'order_created', 'desktop', $2::jsonb)
      `,
      [
        orderId,
        JSON.stringify({
          sourceRef
        })
      ]
    );

    return {
      alreadyExists: false,
      id: orderId,
      orderNumber
    };
  });

  return result;
});

app.patch<{ Body: DesktopDraftOrderPayload; Params: { id: string } }>(
  "/orders/:id",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return null;
    }

    const orderId = Number(request.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_ID"
      });
    }

    const validation = validateDesktopDraftOrderPayload(request.body, {
      requireItems: false,
      requireSourceRef: false
    });

    if (!validation.ok) {
      return reply.code(validation.statusCode).send(validation.body);
    }

    const {
      customerComment,
      customerEmail,
      customerName,
      customerPhone,
      customerSnapshot,
      delivery,
      normalizedItems,
      totalPriceMinor
    } = validation.payload;

    const result = await withDatabaseTransaction(async (client) => {
      const existingOrder = await client.query<{
        customer_id: number | null;
        id: number;
        order_number: string;
      }>(
        `
          select id, order_number, customer_id
          from app.orders
          where id = $1
          for update
        `,
        [orderId]
      );
      const order = existingOrder.rows[0];

      if (!order) {
        return null;
      }

      let customerId = order.customer_id;

      if (customerId) {
        await client.query(
          `
            update app.customers
            set
              name = $2,
              phone = $3,
              email = $4,
              comment = $5,
              updated_at = now()
            where id = $1
          `,
          [customerId, customerName, customerPhone, customerEmail, customerComment]
        );
      } else {
        const customerResult = await client.query<{ id: number }>(
          `
            insert into app.customers (
              customer_type,
              name,
              phone,
              email,
              comment
            )
            values ('person', $1, $2, $3, $4)
            returning id
          `,
          [customerName, customerPhone, customerEmail, customerComment]
        );

        customerId = customerResult.rows[0]?.id ?? null;
      }

      await client.query(
        `
          update app.orders
          set
            customer_id = $2,
            customer_snapshot_json = $3::jsonb,
            items_total_minor = $4,
            delivery_total_minor = 0,
            discount_total_minor = 0,
            total_price_minor = $5,
            customer_comment = $6,
            updated_at = now()
          where id = $1
        `,
        [
          orderId,
          customerId,
          JSON.stringify(customerSnapshot),
          totalPriceMinor,
          totalPriceMinor,
          customerComment
        ]
      );

      await client.query("delete from app.order_items where order_id = $1", [
        orderId
      ]);
      await insertOrderItems(client, orderId, normalizedItems);
      await upsertOrderDelivery(
        client,
        orderId,
        delivery,
        customerName,
        customerPhone
      );

      await client.query(
        `
          insert into app.order_events (
            order_id,
            event_type,
            actor_type,
            actor_user_id,
            payload_json
          )
          values ($1, 'order_updated', 'desktop', $2, $3::jsonb)
        `,
        [
          orderId,
          authSession.user.id,
          JSON.stringify({
            source: "desktop_patch"
          })
        ]
      );

      return {
        id: order.id,
        orderNumber: order.order_number,
        updated: true
      };
    });

    if (!result) {
      return reply.code(404).send({
        error: "ORDER_NOT_FOUND"
      });
    }

    return result;
  }
);

app.delete<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return null;
  }

  const orderId = Number(request.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return reply.code(400).send({
      error: "INVALID_ORDER_ID"
    });
  }

  const result = await withDatabaseTransaction(async (client) => {
    const deletedOrder = await client.query<{ id: number }>(
      `
        delete from app.orders
        where id = $1
        returning id
      `,
      [orderId]
    );

    return deletedOrder.rows[0] ?? null;
  });

  if (!result) {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  return {
    deleted: true,
    id: result.id
  };
});

app.get("/units", async () => {
  return queryDatabase<{
    id: number;
    code: string;
    name: string;
  }>(
    `
      select
        id,
        code,
        name
      from app.units
      order by code
    `
  );
});

app.get("/material-categories", async () => {
  return queryDatabase<{
    id: number;
    name: string;
    description: string | null;
  }>(
    `
      select
        id,
        name,
        description
      from app.material_categories
      order by name
    `
  );
});

app.get("/materials", async () => {
  return queryDatabase<{
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    category_id: number | null;
    category_name: string | null;
    unit_id: number;
    unit_code: string;
    unit_name: string;
  }>(
    `
      select
        m.id,
        m.name,
        m.description,
        m.is_active,
        m.category_id,
        c.name as category_name,
        m.unit_id,
        u.code as unit_code,
        u.name as unit_name
      from app.materials m
      left join app.material_categories c on c.id = m.category_id
      join app.units u on u.id = m.unit_id
      order by c.name nulls last, m.name
    `
  );
});

app.get<{ Params: { id: string } }>("/materials/:id/pricing-inputs", async (request, reply) => {
  const materialId = Number(request.params.id);

  if (!Number.isInteger(materialId) || materialId <= 0) {
    return reply.code(400).send({
      ok: false,
      reason: "INVALID_MATERIAL_ID"
    });
  }

  return queryDatabase<{
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
  }>(
    `
      select
        mpi.id,
        mpi.material_id,
        mpi.supplier_name,
        mpi.purchase_unit_id,
        pu.code as purchase_unit_code,
        mpi.calculation_unit_id,
        cu.code as calculation_unit_code,
        mpi.purchase_price_minor,
        mpi.markup_percent::text as markup_percent,
        mpi.delivery_price_minor,
        mpi.work_amount::text as work_amount,
        mpi.currency_code,
        mpi.source_note,
        mpi.valid_from::text as valid_from,
        mpi.valid_to::text as valid_to
      from app.material_pricing_inputs mpi
      join app.units pu on pu.id = mpi.purchase_unit_id
      join app.units cu on cu.id = mpi.calculation_unit_id
      where mpi.material_id = $1
      order by mpi.valid_to nulls first, mpi.valid_from desc
    `,
    [materialId]
  );
});

app.patch<{
  Body: { purchasePriceMinor?: unknown };
  Params: { id: string };
}>("/materials/:id/pricing-inputs", async (request, reply) => {
  const authError = requireAdminKey(request, reply);

  if (authError) {
    return authError;
  }

  const materialId = Number(request.params.id);

  if (!Number.isInteger(materialId) || materialId <= 0) {
    return reply.code(400).send({
      ok: false,
      reason: "INVALID_MATERIAL_ID"
    });
  }

  const purchasePriceMinor = request.body.purchasePriceMinor;

  if (
    !Number.isInteger(purchasePriceMinor) ||
    Number(purchasePriceMinor) < 0
  ) {
    return reply.code(400).send({
      ok: false,
      reason: "INVALID_PURCHASE_PRICE_MINOR"
    });
  }

  const updatedPricingInputs = await queryDatabase<{
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
  }>(
    `
      update app.material_pricing_inputs mpi
      set purchase_price_minor = $2
      from app.units pu, app.units cu
      where mpi.material_id = $1
        and mpi.valid_to is null
        and pu.id = mpi.purchase_unit_id
        and cu.id = mpi.calculation_unit_id
      returning
        mpi.id,
        mpi.material_id,
        mpi.supplier_name,
        mpi.purchase_unit_id,
        pu.code as purchase_unit_code,
        mpi.calculation_unit_id,
        cu.code as calculation_unit_code,
        mpi.purchase_price_minor,
        mpi.markup_percent::text as markup_percent,
        mpi.delivery_price_minor,
        mpi.work_amount::text as work_amount,
        mpi.currency_code,
        mpi.source_note,
        mpi.valid_from::text as valid_from,
        mpi.valid_to::text as valid_to
    `,
    [materialId, purchasePriceMinor]
  );

  if (updatedPricingInputs.length === 0) {
    return reply.code(404).send({
      ok: false,
      reason: "MATERIAL_PRICING_INPUT_NOT_FOUND",
      message: "Закупочная цена для материала ещё не заведена"
    });
  }

  return updatedPricingInputs;
});

app.get("/materials/specs/roll", async () => {
  return queryDatabase<{
    id: number;
    material_id: number;
    material_name: string;
    material_type: string;
    usage_role: string | null;
    alternative_for_series: string | null;
    series_name: string | null;
    color_name: string | null;
    color_code: string | null;
    roll_width_m: string;
    roll_length_m: string;
    roll_area_m2: string;
  }>(
    `
      select
        s.id,
        s.material_id,
        m.name as material_name,
        s.material_type,
        s.usage_role,
        s.alternative_for_series,
        s.series_name,
        s.color_name,
        s.color_code,
        s.roll_width_m::text as roll_width_m,
        s.roll_length_m::text as roll_length_m,
        s.roll_area_m2::text as roll_area_m2
      from app.material_roll_specs s
      join app.materials m on m.id = s.material_id
      order by s.material_type, s.series_name, s.color_name, m.name
    `
  );
});

app.get("/materials/specs/sheet", async () => {
  return queryDatabase<{
    id: number;
    material_id: number;
    material_name: string;
    material_type: string;
    brand_or_series: string | null;
    color_name: string | null;
    thickness_mm: string;
    sheet_width_mm: string;
    sheet_height_mm: string;
    working_area_m2: string;
  }>(
    `
      select
        s.id,
        s.material_id,
        m.name as material_name,
        s.material_type,
        s.brand_or_series,
        s.color_name,
        s.thickness_mm::text as thickness_mm,
        s.sheet_width_mm::text as sheet_width_mm,
        s.sheet_height_mm::text as sheet_height_mm,
        s.working_area_m2::text as working_area_m2
      from app.material_sheet_specs s
      join app.materials m on m.id = s.material_id
      order by s.material_type, s.brand_or_series, s.thickness_mm, m.name
    `
  );
});

app.get("/materials/specs/liquid", async () => {
  return queryDatabase<{
    id: number;
    material_id: number;
    material_name: string;
    material_type: string;
    technology: string | null;
    brand_or_series: string | null;
    color_name: string | null;
    color_code: string | null;
    volume_l: string;
  }>(
    `
      select
        s.id,
        s.material_id,
        m.name as material_name,
        s.material_type,
        s.technology,
        s.brand_or_series,
        s.color_name,
        s.color_code,
        s.volume_l::text as volume_l
      from app.material_liquid_specs s
      join app.materials m on m.id = s.material_id
      order by s.technology, s.brand_or_series, s.color_name, m.name
    `
  );
});

app.get("/materials/specs/bulk", async () => {
  return queryDatabase<{
    id: number;
    material_id: number;
    material_name: string;
    material_type: string;
    technology: string | null;
    brand_or_series: string | null;
    weight_kg: string;
  }>(
    `
      select
        s.id,
        s.material_id,
        m.name as material_name,
        s.material_type,
        s.technology,
        s.brand_or_series,
        s.weight_kg::text as weight_kg
      from app.material_bulk_specs s
      join app.materials m on m.id = s.material_id
      order by s.technology, s.brand_or_series, m.name
    `
  );
});

app.get("/light-letter-specs", async () => {
  return queryDatabase<{
    id: number;
    symbol: string;
    symbol_type: string;
    nominal_height_mm: number;
    height_mm: number;
    width_mm: number;
    perimeter_mm: number;
    led_count: number;
  }>(
    `
      select
        id,
        symbol,
        symbol_type,
        nominal_height_mm,
        height_mm,
        width_mm,
        perimeter_mm,
        led_count
      from app.light_letter_specs
      order by nominal_height_mm, symbol_type, symbol
    `
  );
});

app.get("/products", async () => {
  return queryDatabase<{
    id: number;
    sku: string;
    name: string;
    description: string | null;
    is_active: boolean;
    category_id: number | null;
    category_name: string | null;
    unit_id: number;
    unit_code: string;
    price_minor: number | null;
    currency_code: string | null;
  }>(
    `
      select
        p.id,
        p.sku,
        p.name,
        p.description,
        p.is_active,
        p.category_id,
        c.name as category_name,
        p.unit_id,
        u.code as unit_code,
        pp.price_minor,
        pp.currency_code
      from app.products p
      left join app.product_categories c on c.id = p.category_id
      join app.units u on u.id = p.unit_id
      left join app.product_prices pp
        on pp.product_id = p.id
       and pp.valid_to is null
      order by c.name nulls last, p.name
    `
  );
});

app.get("/services", async () => {
  return queryDatabase<{
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    category_id: number | null;
    category_name: string | null;
    unit_id: number;
    unit_code: string;
    price_minor: number | null;
    currency_code: string | null;
  }>(
    `
      select
        s.id,
        s.name,
        s.description,
        s.is_active,
        s.category_id,
        c.name as category_name,
        s.unit_id,
        u.code as unit_code,
        sp.price_minor,
        sp.currency_code
      from app.services s
      left join app.service_categories c on c.id = s.category_id
      join app.units u on u.id = s.unit_id
      left join app.service_prices sp
        on sp.service_id = s.id
       and sp.valid_to is null
      order by c.name nulls last, s.name
    `
  );
});

try {
  await app.listen({
    host: apiHost,
    port: apiPort
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
