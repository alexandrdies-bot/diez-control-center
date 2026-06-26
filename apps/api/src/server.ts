import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import dotenv from "dotenv";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { MultipartFile, MultipartValue } from "@fastify/multipart";
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
const checkoutUploadTokenSecret =
  process.env.CHECKOUT_UPLOAD_TOKEN_SECRET?.trim() ?? apiWriteKey ?? adminApiKey;
const debugEndpointsEnabled =
  process.env.DEBUG_ENDPOINTS_ENABLED === "true" || !isProduction;
const orderAttachmentsDir = path.isAbsolute(
  process.env.ORDER_ATTACHMENTS_DIR ?? ""
)
  ? process.env.ORDER_ATTACHMENTS_DIR!
  : path.join(
      repoRoot,
      process.env.ORDER_ATTACHMENTS_DIR ?? "uploads/order-attachments"
    );
const maxOrderAttachmentFileSize = 50 * 1024 * 1024;

const app = Fastify({
  logger: true
});

const resolvedOrderAttachmentsDir = path.resolve(orderAttachmentsDir);

await app.register(cors, {
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "x-api-key",
    "X-Checkout-Upload-Token"
  ],
  methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  origin: isProduction ? corsAllowedOrigins : true
});

await app.register(multipart, {
  limits: {
    fileSize: maxOrderAttachmentFileSize,
    files: 1
  }
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

type CustomerAuthPayload = {
  clientName?: unknown;
  phone?: unknown;
  pin?: unknown;
};

type CustomerRegisterPayload = CustomerAuthPayload & {
  displayName?: unknown;
  email?: unknown;
  pinRepeat?: unknown;
};

type CustomerProfilePayload = {
  displayName?: unknown;
  email?: unknown;
};

type PublicCustomerAccount = {
  customerId: number | null;
  displayName: string | null;
  email: string | null;
  id: number;
  phone: string;
  phoneNormalized: string;
};

type CustomerAccountRow = {
  customerId: string | null;
  displayName: string | null;
  email: string | null;
  id: string;
  phone: string;
  phoneNormalized: string;
};

type CustomerAccountWithPinRow = CustomerAccountRow & {
  failedLoginAttempts: number;
  lockedUntil: string | null;
  pinHash: string;
};

type CustomerSessionRow = CustomerAccountRow & {
  expiresAt: string;
  sessionId: string;
};

type CustomerAuthSessionContext = {
  customer: PublicCustomerAccount;
  session: {
    expiresAt: string;
    id: number;
  };
};

type CustomerRetentionPayload = {
  retentionLocked?: unknown;
  retentionLockReason?: unknown;
  retentionLockUntil?: unknown;
};

type ApiCustomerAccountRetentionRow = {
  customerId: string | null;
  displayName: string | null;
  email: string | null;
  id: string;
  lastActivityAt: string;
  phone: string;
  phoneNormalized: string;
  retentionLocked: boolean;
  retentionLockReason: string | null;
  retentionLockedAt: string | null;
  retentionLockedByUserId: string | null;
  retentionLockUntil: string | null;
};

type ApiCustomerAccountRetentionResponse = {
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

type ApiCustomerAccountListRow = ApiCustomerAccountRetentionRow & {
  activeOrdersCount: number;
  createdAt: string;
  isActive: boolean;
  lastLoginAt: string | null;
  totalOrdersCount: number;
  updatedAt: string;
};

type ApiCustomerAccountListItem = ApiCustomerAccountRetentionResponse & {
  activeOrdersCount: number;
  createdAt: string;
  isActive: boolean;
  lastLoginAt: string | null;
  totalOrdersCount: number;
  updatedAt: string;
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

type CheckoutUploadTokenPayload = {
  exp: number;
  orderId: number;
  orderNumber: string;
};

type ApiOrderSummaryRow = {
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

type ApiCustomerOrderSummaryRow = {
  createdAt: string;
  currencyCode: string;
  deliveryMode: string;
  deliveryStatus: string;
  firstItemTitle: string | null;
  id: number;
  itemsCount: number;
  orderNumber: string;
  source: string;
  status: string;
  totalPriceMinor: number;
  updatedAt: string;
};

type ApiOrderDetailRow = ApiOrderSummaryRow & {
  customerAccountDisplayName: string | null;
  customerAccountEmail: string | null;
  customerAccountId: string | null;
  customerAccountLastActivityAt: string | null;
  customerAccountPhone: string | null;
  customerAccountPhoneNormalized: string | null;
  customerAccountRetentionLockReason: string | null;
  customerAccountRetentionLockUntil: string | null;
  customerAccountRetentionLocked: boolean | null;
  customerAccountRetentionLockedAt: string | null;
  customerAccountRetentionLockedByUserId: string | null;
  customerComment: string | null;
  customerId: number | null;
};

type ApiOrderEventRow = {
  actorName: string | null;
  actorType: string;
  createdAt: string;
  eventType: string;
  id: number;
  payload: unknown;
};

type OrderAttachmentSource = "site" | "desktop" | "manager";

type OrderAttachmentType =
  | "design_file"
  | "drawing"
  | "reference"
  | "placement_photo"
  | "print_file"
  | "other";

type UpdateOrderStatusPayload = {
  comment?: unknown;
  status?: unknown;
};

type CreateOrderCommentPayload = {
  comment?: unknown;
};

type DiezPaymentStatus =
  | "created"
  | "pending"
  | "paid"
  | "authorized"
  | "failed"
  | "canceled"
  | "expired"
  | "refunded"
  | "partial_refund"
  | "disputed"
  | "unknown";

type OzonAcquiringConfig = {
  accessKey: string;
  baseUrl: string;
  failUrl: string;
  mode: string;
  notificationSecretKey: string;
  notificationUrl: string;
  secretKey: string;
  successUrl: string;
};

type CdekEnvironment = "test" | "prod";

type CdekTokenStatus = "cached" | "not_requested";

type CdekConfig = {
  baseUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  configured: boolean;
  enabled: boolean;
  env: CdekEnvironment;
  missing: string[];
  requestTimeoutMs: number;
  tokenCacheTtlSkewSeconds: number;
};

type CdekStatusResponse = {
  baseUrl: string;
  configured: boolean;
  enabled: boolean;
  env: CdekEnvironment;
  features: {
    calculation: boolean;
    cities: boolean;
    deliveryPoints: boolean;
    printForms: boolean;
    shipments: boolean;
    webhooks: boolean;
  };
  missing: string[];
  tokenStatus: CdekTokenStatus;
};

type CdekCityResponseItem = {
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

type CdekDeliveryPointResponseItem = {
  address: string | null;
  addressFull: string | null;
  allowedCod: boolean | null;
  code: string | null;
  haveCash: boolean | null;
  haveCashless: boolean | null;
  heightMax: number | null;
  latitude: number | null;
  lengthMax: number | null;
  longitude: number | null;
  phones: string[];
  type: string | null;
  uuid: string | null;
  weightMax: number | null;
  weightMin: number | null;
  widthMax: number | null;
  workTime: string | null;
};

type CdekCalculationLocationPayload = {
  code?: unknown;
};

type CdekCalculationPackagePayload = {
  heightCm?: unknown;
  lengthCm?: unknown;
  weightGrams?: unknown;
  widthCm?: unknown;
};

type CdekCalculationRequestPayload = {
  currencyCode?: unknown;
  deliveryPointCode?: unknown;
  fromLocation?: CdekCalculationLocationPayload;
  packages?: unknown;
  shipmentPointCode?: unknown;
  tariffCode?: unknown;
  toLocation?: CdekCalculationLocationPayload;
};

type CdekTariffListRequestPayload = {
  currencyCode?: unknown;
  deliveryPointCode?: unknown;
  fromLocation?: CdekCalculationLocationPayload;
  packages?: unknown;
  shipmentPointCode?: unknown;
  toLocation?: CdekCalculationLocationPayload;
};

type NormalizedCdekCalculationRequest = {
  currencyCode: "RUB";
  deliveryPointCode: string | null;
  fromLocation: {
    code: number;
  };
  packages: {
    heightCm: number;
    lengthCm: number;
    weightGrams: number;
    widthCm: number;
  }[];
  shipmentPointCode: string | null;
  tariffCode: number;
  toLocation: {
    code: number;
  };
};

type NormalizedCdekTariffListRequest = Omit<
  NormalizedCdekCalculationRequest,
  "tariffCode"
>;

type CdekDeliveryCalculationResponse = {
  calendarMax: number | null;
  calendarMin: number | null;
  currencyCode: string;
  deliverySum: number | null;
  deliverySumMinor: number | null;
  errors: unknown[];
  notSaved: true;
  periodMax: number | null;
  periodMin: number | null;
  priceMinor: number | null;
  provider: "cdek";
  services: unknown[];
  tariffCode: number;
  totalSum: number | null;
  totalSumMinor: number | null;
  warnings: unknown[];
  weightCalc: number | null;
};

type CdekTariffListResponseItem = {
  deliveryMode: string | null;
  deliverySum: number | null;
  deliverySumMinor: number | null;
  errors: unknown[];
  periodMax: number | null;
  periodMin: number | null;
  tariffCode: number | null;
  tariffName: string | null;
  totalSum: number | null;
  totalSumMinor: number | null;
  warnings: unknown[];
};

type CdekDeliveryPackagePayload = {
  heightCm?: unknown;
  lengthCm?: unknown;
  weightGrams?: unknown;
  widthCm?: unknown;
};

type SaveCdekDeliveryPayload = {
  calculation?: unknown;
  calendarMax?: unknown;
  calendarMin?: unknown;
  city?: unknown;
  cityCode?: unknown;
  cityUuid?: unknown;
  comment?: unknown;
  countryCode?: unknown;
  currencyCode?: unknown;
  deliveryPointAddress?: unknown;
  deliveryPointCode?: unknown;
  deliveryPointType?: unknown;
  deliveryPointUuid?: unknown;
  packages?: unknown;
  periodMax?: unknown;
  periodMin?: unknown;
  priceMinor?: unknown;
  recipientName?: unknown;
  recipientPhone?: unknown;
  region?: unknown;
  senderCity?: unknown;
  senderCityCode?: unknown;
  senderCountryCode?: unknown;
  senderRegion?: unknown;
  shipmentPointAddress?: unknown;
  shipmentPointCode?: unknown;
  shipmentPointName?: unknown;
  shipmentPointType?: unknown;
  shipmentPointUuid?: unknown;
  tariffCode?: unknown;
  tariffName?: unknown;
};

type NormalizedCdekDeliverySelection = {
  calculation: unknown;
  calendarMax: string | null;
  calendarMin: string | null;
  city: string;
  cityCode: number;
  cityUuid: string | null;
  comment: string | null;
  countryCode: string;
  currencyCode: "RUB";
  deliveryPointAddress: string;
  deliveryPointCode: string;
  deliveryPointType: string | null;
  deliveryPointUuid: string | null;
  packages: {
    heightCm: number;
    lengthCm: number;
    weightGrams: number;
    widthCm: number;
  }[];
  periodMax: number | null;
  periodMin: number | null;
  priceMinor: number;
  recipientName: string | null;
  recipientPhone: string | null;
  region: string | null;
  senderCity: string | null;
  senderCityCode: number | null;
  senderCountryCode: string | null;
  senderRegion: string | null;
  shipmentPointAddress: string | null;
  shipmentPointCode: string | null;
  shipmentPointName: string | null;
  shipmentPointType: string | null;
  shipmentPointUuid: string | null;
  tariffCode: number;
  tariffName: string | null;
};

type ApiOrderPaymentRow = {
  amountMinor: number | string;
  canceledAt: string | null;
  createdAt: string;
  currencyCode: string;
  expiresAt: string | null;
  id: number | string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  ozonStatus: string | null;
  paidAt: string | null;
  payLink: string | null;
  paymentMethod: string | null;
  provider: string;
  providerExtId?: string | null;
  providerOrderId?: string | null;
  refundedAt: string | null;
  status: DiezPaymentStatus;
  testMode: boolean | null;
  updatedAt: string;
};

type ApiOrderPaymentResponse = {
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
  status: DiezPaymentStatus;
  testMode: boolean | null;
  updatedAt: string;
};

type OzonOrderPaymentOrderRow = {
  currencyCode: string;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryNeedsReview?: boolean;
  id: number;
  isDtf: boolean;
  orderNumber: string;
  source: string;
  totalPriceMinor: number;
};

type OrderFinancialItemRow = {
  calculationSnapshotJson: unknown;
  paramsJson: unknown;
  quantity: number | string;
  serviceType: string;
  sortOrder: number;
  title: string;
  totalPriceMinor: number | string;
  unitPriceMinor: number | string;
};

const editableOrderStatuses = new Set([
  "new",
  "confirmed",
  "in_work",
  "ready",
  "completed",
  "canceled"
]);

const activeOzonPaymentStatuses = new Set<DiezPaymentStatus>([
  "created",
  "pending"
]);

const finalOzonPaymentStatuses = new Set<DiezPaymentStatus>([
  "authorized",
  "paid",
  "partial_refund",
  "refunded",
  "disputed",
  "unknown"
]);

const terminalOzonPaymentStatuses = new Set<DiezPaymentStatus>([
  "failed",
  "canceled",
  "expired"
]);

type ApiOrderAttachmentRow = {
  attachmentType: OrderAttachmentType;
  comment: string | null;
  createdAt: string;
  fileSize: number | null;
  id: number;
  mimeType: string | null;
  orderId: number;
  originalFileName: string;
  source: OrderAttachmentSource;
  storagePath: string;
};

type ApiOrderAttachmentResponse = {
  attachmentType: OrderAttachmentType;
  comment?: string | null;
  createdAt: string;
  downloadUrl: string;
  fileSize: number | null;
  id: number;
  mimeType: string | null;
  orderId: number;
  originalFileName: string;
  previewUrl: string | null;
};

type ApiOrderDeliveryRow = {
  addressText: string | null;
  comment: string | null;
  currencyCode: string;
  deliveryMode: string;
  deliveryStatus: string;
  id: number;
  priceMinor: number;
  providerPayload: unknown;
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

function signCheckoutUploadTokenPayload(payloadBase64: string) {
  if (!checkoutUploadTokenSecret) {
    return null;
  }

  return createHmac("sha256", checkoutUploadTokenSecret)
    .update(payloadBase64)
    .digest("base64url");
}

function generateCheckoutUploadToken(orderId: number, orderNumber: string) {
  if (!checkoutUploadTokenSecret) {
    return null;
  }

  const payload: CheckoutUploadTokenPayload = {
    exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
    orderId,
    orderNumber
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signCheckoutUploadTokenPayload(payloadBase64);

  return signature ? `${payloadBase64}.${signature}` : null;
}

function verifyCheckoutUploadToken(token: string) {
  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signCheckoutUploadTokenPayload(payloadBase64);

  if (!expectedSignature) {
    return null;
  }

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8")
    ) as Partial<CheckoutUploadTokenPayload>;
    const exp = payload.exp;
    const orderId = payload.orderId;
    const orderNumber = payload.orderNumber;

    if (
      typeof orderId !== "number" ||
      !Number.isInteger(orderId) ||
      typeof orderNumber !== "string" ||
      typeof exp !== "number" ||
      !Number.isInteger(exp) ||
      exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      exp,
      orderId,
      orderNumber
    };
  } catch {
    return null;
  }
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

function normalizeCustomerPin(value: unknown) {
  return typeof value === "string" && /^\d{4}$/.test(value) ? value : null;
}

function normalizeCustomerEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    return null;
  }

  if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
    return null;
  }

  return email;
}

function normalizeCustomerDisplayName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const displayName = value.trim();

  return displayName ? displayName : null;
}

function normalizeCustomerProfileDisplayName(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const displayName = value.trim();

  return displayName ? displayName : null;
}

function normalizeCustomerProfileEmail(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    return null;
  }

  if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
    return undefined;
  }

  return email;
}

function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);

  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

function buildPublicCustomerAccount(
  row: CustomerAccountRow
): PublicCustomerAccount {
  return {
    customerId: row.customerId === null ? null : Number(row.customerId),
    displayName: row.displayName,
    email: row.email,
    id: Number(row.id),
    phone: row.phone,
    phoneNormalized: row.phoneNormalized
  };
}

function buildCustomerAccountRetentionResponse(
  row: ApiCustomerAccountRetentionRow
): ApiCustomerAccountRetentionResponse {
  return {
    customerId: row.customerId === null ? null : Number(row.customerId),
    displayName: row.displayName,
    email: row.email,
    id: Number(row.id),
    lastActivityAt: row.lastActivityAt,
    phone: row.phone,
    phoneNormalized: row.phoneNormalized,
    retentionLocked: row.retentionLocked,
    retentionLockReason: row.retentionLockReason,
    retentionLockedAt: row.retentionLockedAt,
    retentionLockedByUserId:
      row.retentionLockedByUserId === null
        ? null
        : Number(row.retentionLockedByUserId),
    retentionLockUntil: row.retentionLockUntil
  };
}

function buildCustomerAccountListItem(
  row: ApiCustomerAccountListRow
): ApiCustomerAccountListItem {
  return {
    ...buildCustomerAccountRetentionResponse(row),
    activeOrdersCount: Number(row.activeOrdersCount) || 0,
    createdAt: row.createdAt,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt,
    totalOrdersCount: Number(row.totalOrdersCount) || 0,
    updatedAt: row.updatedAt
  };
}

function normalizeRetentionLockReason(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const reason = value.trim();

  return reason ? reason : null;
}

function normalizeRetentionLockUntil(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
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

async function getCustomerAuthSession(
  request: FastifyRequest
): Promise<CustomerAuthSessionContext | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const sessions = await queryDatabase<CustomerSessionRow>(
    `
      select
        s.id::text as "sessionId",
        s.expires_at::text as "expiresAt",
        a.id::text as id,
        a.customer_id::text as "customerId",
        a.phone,
        a.phone_normalized as "phoneNormalized",
        a.email,
        a.display_name as "displayName"
      from app.customer_sessions s
      join app.customer_accounts a on a.id = s.customer_account_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and a.is_active = true
      limit 1
    `,
    [tokenHash]
  );
  const session = sessions[0];

  if (!session) {
    return null;
  }

  await withDatabaseTransaction(async (client) => {
    await client.query(
      `
        update app.customer_sessions
        set last_seen_at = now()
        where id = $1
      `,
      [session.sessionId]
    );

    await client.query(
      `
        update app.customer_accounts
        set last_activity_at = now()
        where id = $1
      `,
      [session.id]
    );
  });

  return {
    customer: buildPublicCustomerAccount(session),
    session: {
      expiresAt: session.expiresAt,
      id: Number(session.sessionId)
    }
  };
}

async function requireCustomerAuthSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authSession = await getCustomerAuthSession(request);

  if (!authSession) {
    reply.code(401).send({
      error: "UNAUTHORIZED"
    });
    return null;
  }

  return authSession;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRequiredEnvString(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

function getOptionalEnvString(name: string) {
  return process.env[name]?.trim() || null;
}

function getBooleanEnvFlag(name: string) {
  const value = getOptionalEnvString(name)?.toLowerCase();

  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function getCdekEnvironment(): CdekEnvironment {
  return getOptionalEnvString("CDEK_ENV") === "prod" ? "prod" : "test";
}

function getDefaultCdekBaseUrl(env: CdekEnvironment) {
  return env === "prod" ? "https://api.cdek.ru" : "https://api.edu.cdek.ru";
}

function getPositiveIntegerEnv(name: string, defaultValue: number) {
  const value = Number(getOptionalEnvString(name));

  return Number.isInteger(value) && value > 0 ? value : defaultValue;
}

function getCdekConfig(): CdekConfig {
  const env = getCdekEnvironment();
  const baseUrl =
    getOptionalEnvString("CDEK_API_BASE_URL")?.replace(/\/+$/, "") ||
    getDefaultCdekBaseUrl(env);
  const requiredEnvNames = ["CDEK_CLIENT_ID", "CDEK_CLIENT_SECRET"];
  const clientId = getRequiredEnvString("CDEK_CLIENT_ID");
  const clientSecret = getRequiredEnvString("CDEK_CLIENT_SECRET");
  const missing = requiredEnvNames.filter((name) => !getRequiredEnvString(name));
  const enabled = getBooleanEnvFlag("CDEK_ENABLED");

  return {
    baseUrl,
    clientId,
    clientSecret,
    configured: missing.length === 0,
    enabled,
    env,
    missing,
    requestTimeoutMs: getPositiveIntegerEnv("CDEK_REQUEST_TIMEOUT_MS", 10000),
    tokenCacheTtlSkewSeconds: getPositiveIntegerEnv(
      "CDEK_TOKEN_CACHE_TTL_SKEW_SECONDS",
      60
    )
  };
}

let cdekTokenCache: {
  accessToken: string;
  baseUrl: string;
  env: CdekEnvironment;
  expiresAtMs: number;
} | null = null;

function isCdekTokenCacheValid(config: CdekConfig) {
  return Boolean(
    cdekTokenCache &&
      cdekTokenCache.baseUrl === config.baseUrl &&
      cdekTokenCache.env === config.env &&
      cdekTokenCache.expiresAtMs > Date.now() + 5000
  );
}

function getCdekTokenStatus(config: CdekConfig): CdekTokenStatus {
  return isCdekTokenCacheValid(config) ? "cached" : "not_requested";
}

function getCdekStatus(config = getCdekConfig()): CdekStatusResponse {
  const featuresEnabled = config.enabled && config.configured;

  return {
    baseUrl: config.baseUrl,
    configured: config.configured,
    enabled: config.enabled,
    env: config.env,
    features: {
      calculation: featuresEnabled,
      cities: featuresEnabled,
      deliveryPoints: featuresEnabled,
      printForms: false,
      shipments: false,
      webhooks: false
    },
    missing: config.missing,
    tokenStatus: getCdekTokenStatus(config)
  };
}

function getOzonAcquiringConfig(): OzonAcquiringConfig | null {
  const baseUrl = getRequiredEnvString("OZON_ACQUIRING_BASE_URL");
  const accessKey = getRequiredEnvString("OZON_ACQUIRING_ACCESS_KEY");
  const secretKey = getRequiredEnvString("OZON_ACQUIRING_SECRET_KEY");
  const notificationSecretKey = getRequiredEnvString(
    "OZON_ACQUIRING_NOTIFICATION_SECRET_KEY"
  );
  const successUrl = getRequiredEnvString("OZON_ACQUIRING_SUCCESS_URL");
  const failUrl = getRequiredEnvString("OZON_ACQUIRING_FAIL_URL");
  const notificationUrl = getRequiredEnvString(
    "OZON_ACQUIRING_NOTIFICATION_URL"
  );
  const mode = getRequiredEnvString("OZON_ACQUIRING_MODE");

  if (
    !baseUrl ||
    !accessKey ||
    !secretKey ||
    !notificationSecretKey ||
    !successUrl ||
    !failUrl ||
    !notificationUrl ||
    !mode
  ) {
    return null;
  }

  return {
    accessKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    failUrl,
    mode,
    notificationSecretKey,
    notificationUrl,
    secretKey,
    successUrl
  };
}

function sendOzonAcquiringNotConfigured(reply: FastifyReply) {
  return reply.code(503).send({
    error: "OZON_ACQUIRING_NOT_CONFIGURED"
  });
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signOzonCreateOrderRequest(
  config: OzonAcquiringConfig,
  request: {
    amount: {
      currencyCode: string;
      value: string;
    };
    expiresAt: string;
    extId: string;
    fiscalizationType: string;
    paymentAlgorithm: string;
  }
) {
  return sha256Hex(
    [
      config.accessKey,
      request.expiresAt,
      request.extId,
      request.fiscalizationType,
      request.paymentAlgorithm,
      request.amount.currencyCode,
      request.amount.value,
      config.secretKey
    ].join("")
  );
}

function signOzonGetOrderStatusRequest(
  config: OzonAcquiringConfig,
  request: {
    extId: string;
    id: string;
  }
) {
  return sha256Hex(
    [request.id, request.extId, config.accessKey, config.secretKey].join("")
  );
}

function signOzonCancelOrderRequest(
  config: OzonAcquiringConfig,
  request: {
    id: string;
  }
) {
  return sha256Hex([request.id, config.accessKey, config.secretKey].join(""));
}

function signOzonWebhookPayload(
  config: Pick<OzonAcquiringConfig, "accessKey" | "notificationSecretKey">,
  payload: {
    amount: string;
    currencyCode: string;
    extOrderID: string;
    orderID: string;
    transactionID: string;
  }
) {
  return sha256Hex(
    [
      config.accessKey,
      payload.orderID,
      payload.transactionID,
      payload.extOrderID,
      payload.amount,
      payload.currencyCode,
      config.notificationSecretKey
    ].join("|")
  );
}

function safeCompareSignature(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual.toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expected.toLowerCase(), "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function sanitizeOzonPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeOzonPayload(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  const secretKeys = new Set([
    "accessKey",
    "access_key",
    "requestSign",
    "request_sign",
    "secretKey",
    "secret_key",
    "notificationSecretKey",
    "notification_secret_key",
    "token"
  ]);

  for (const [key, nestedValue] of Object.entries(value)) {
    if (secretKeys.has(key)) {
      continue;
    }

    sanitized[key] = sanitizeOzonPayload(nestedValue);
  }

  return sanitized;
}

function sanitizeOzonText(value: string) {
  return value
    .replace(
      /("(?:accessKey|access_key|requestSign|request_sign|secretKey|secret_key|notificationSecretKey|notification_secret_key|token)"\s*:\s*")[^"]*(")/gi,
      "$1[redacted]$2"
    )
    .replace(
      /((?:accessKey|access_key|requestSign|request_sign|secretKey|secret_key|notificationSecretKey|notification_secret_key|token)=)[^&\s]+/gi,
      "$1[redacted]"
    )
    .slice(0, 500);
}

function stringifyOzonDiagnosticValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return sanitizeOzonText(value.trim());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (value !== null && value !== undefined) {
    try {
      return sanitizeOzonText(JSON.stringify(sanitizeOzonPayload(value)));
    } catch {
      return null;
    }
  }

  return null;
}

function getOzonDiagnosticString(
  value: unknown,
  paths: readonly (readonly string[])[]
) {
  for (const path of paths) {
    const nestedValue = getNestedValue(value, [path]);
    const diagnosticValue = stringifyOzonDiagnosticValue(nestedValue);

    if (diagnosticValue) {
      return diagnosticValue;
    }
  }

  return null;
}

function buildOzonErrorDiagnostic(
  statusCode: number,
  responseBody: unknown,
  responseText: string
) {
  const ozonCode = getOzonDiagnosticString(responseBody, [
    ["code"],
    ["errorCode"],
    ["error_code"],
    ["error", "code"],
    ["error", "errorCode"],
    ["error", "error_code"]
  ]);
  const ozonMessage = getOzonDiagnosticString(responseBody, [
    ["message"],
    ["errorMessage"],
    ["error_message"],
    ["description"],
    ["error", "message"],
    ["error", "description"]
  ]);
  const ozonDetails =
    getOzonDiagnosticString(responseBody, [
      ["details"],
      ["detail"],
      ["error", "details"],
      ["error", "detail"],
      ["raw"]
    ]) ?? (responseText ? sanitizeOzonText(responseText.trim()) : null);

  return {
    ozonCode,
    ozonDetails,
    ozonMessage,
    ozonStatus: statusCode
  };
}

class CdekProxyError extends Error {
  cdekCode: string | null;
  cdekMessage: string | null;
  cdekStatus: number | null;
  publicError: string;
  statusCode: number;

  constructor(input: {
    cdekCode?: string | null;
    cdekMessage?: string | null;
    cdekStatus?: number | null;
    message: string;
    publicError: string;
    statusCode: number;
  }) {
    super(input.message);
    this.cdekCode = input.cdekCode ?? null;
    this.cdekMessage = input.cdekMessage ?? null;
    this.cdekStatus = input.cdekStatus ?? null;
    this.publicError = input.publicError;
    this.statusCode = input.statusCode;
  }
}

function sanitizeCdekPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCdekPayload(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const secretKeys = new Set([
    "access_token",
    "accessToken",
    "authorization",
    "Authorization",
    "bearer",
    "client_id",
    "clientId",
    "client_secret",
    "clientSecret",
    "password",
    "secret",
    "token"
  ]);
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (secretKeys.has(key)) {
      continue;
    }

    sanitized[key] = sanitizeCdekPayload(nestedValue);
  }

  return sanitized;
}

function sanitizeCdekText(value: string) {
  return value
    .replace(
      /("(?:access_token|accessToken|authorization|bearer|client_id|clientId|client_secret|clientSecret|password|secret|token)"\s*:\s*")[^"]*(")/gi,
      "$1[redacted]$2"
    )
    .replace(
      /((?:access_token|accessToken|authorization|bearer|client_id|clientId|client_secret|clientSecret|password|secret|token)=)[^&\s]+/gi,
      "$1[redacted]"
    )
    .slice(0, 500);
}

function getCdekDiagnosticString(
  value: unknown,
  paths: readonly (readonly string[])[],
  fallbackText: string
) {
  const diagnosticValue = getOzonDiagnosticString(value, paths);

  if (diagnosticValue) {
    return diagnosticValue;
  }

  return fallbackText ? sanitizeCdekText(fallbackText) : null;
}

function buildCdekError(
  publicError: string,
  statusCode: number,
  cdekStatus: number | null,
  responseBody: unknown,
  responseText: string,
  fallbackMessage: string
) {
  return new CdekProxyError({
    cdekCode: getCdekDiagnosticString(
      responseBody,
      [
        ["code"],
        ["error"],
        ["error_code"],
        ["errors", "0", "code"],
        ["requests", "0", "errors", "0", "code"]
      ],
      ""
    ),
    cdekMessage:
      getCdekDiagnosticString(
        responseBody,
        [
          ["message"],
          ["error_description"],
          ["error_message"],
          ["errors", "0", "message"],
          ["requests", "0", "errors", "0", "message"]
        ],
        responseText
      ) ?? fallbackMessage,
    cdekStatus,
    message: fallbackMessage,
    publicError,
    statusCode
  });
}

async function fetchCdekWithTimeout(
  config: CdekConfig,
  url: URL,
  init: RequestInit
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    throw new CdekProxyError({
      cdekMessage:
        error instanceof Error ? sanitizeCdekText(error.message) : "fetch failed",
      message: "CDEK request failed",
      publicError: "CDEK_REQUEST_FAILED",
      statusCode: 502
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readCdekResponseBody(
  response: Response,
  options: { sanitize?: boolean } = {}
) {
  const responseText = await response.text();
  const shouldSanitize = options.sanitize !== false;

  if (!responseText.trim()) {
    return {
      responseBody: null,
      responseText
    };
  }

  try {
    const responseBody = JSON.parse(responseText);

    return {
      responseBody: shouldSanitize ? sanitizeCdekPayload(responseBody) : responseBody,
      responseText
    };
  } catch {
    return {
      responseBody: null,
      responseText: sanitizeCdekText(responseText)
    };
  }
}

async function getCdekAccessToken(config: CdekConfig) {
  if (isCdekTokenCacheValid(config) && cdekTokenCache) {
    return cdekTokenCache.accessToken;
  }

  if (!config.clientId || !config.clientSecret) {
    throw new CdekProxyError({
      message: "CDEK is not configured",
      publicError: "CDEK_NOT_CONFIGURED",
      statusCode: 503
    });
  }

  const url = new URL(`${config.baseUrl}/v2/oauth/token`);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials"
  });
  const response = await fetchCdekWithTimeout(config, url, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });
  const { responseBody, responseText } = await readCdekResponseBody(response, {
    sanitize: false
  });

  if (!response.ok) {
    throw buildCdekError(
      "CDEK_AUTH_FAILED",
      502,
      response.status,
      sanitizeCdekPayload(responseBody),
      responseText,
      "CDEK auth failed"
    );
  }

  const accessToken = getNestedString(responseBody, [["access_token"]]);
  const expiresIn = getNestedNumber(responseBody, [["expires_in"]]) ?? 3600;

  if (!accessToken) {
    throw buildCdekError(
      "CDEK_AUTH_RESPONSE_INVALID",
      502,
      response.status,
      sanitizeCdekPayload(responseBody),
      responseText,
      "CDEK auth response did not contain access token"
    );
  }

  cdekTokenCache = {
    accessToken,
    baseUrl: config.baseUrl,
    env: config.env,
    expiresAtMs:
      Date.now() +
      Math.max(0, expiresIn - config.tokenCacheTtlSkewSeconds) * 1000
  };

  return accessToken;
}

async function requestCdekJson(
  config: CdekConfig,
  pathName: string,
  query: Record<string, string>
) {
  const accessToken = await getCdekAccessToken(config);
  const url = new URL(`${config.baseUrl}${pathName}`);

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetchCdekWithTimeout(config, url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    method: "GET"
  });
  const { responseBody, responseText } = await readCdekResponseBody(response);

  if (!response.ok) {
    throw buildCdekError(
      "CDEK_REQUEST_FAILED",
      502,
      response.status,
      responseBody,
      responseText,
      "CDEK request failed"
    );
  }

  return responseBody;
}

async function postCdekJson(
  config: CdekConfig,
  pathName: string,
  payload: Record<string, unknown>
) {
  const accessToken = await getCdekAccessToken(config);
  const url = new URL(`${config.baseUrl}${pathName}`);
  const response = await fetchCdekWithTimeout(config, url, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const { responseBody, responseText } = await readCdekResponseBody(response);

  if (!response.ok) {
    throw buildCdekError(
      "CDEK_REQUEST_FAILED",
      502,
      response.status,
      responseBody,
      responseText,
      "CDEK request failed"
    );
  }

  return responseBody;
}

function sendCdekProxyError(reply: FastifyReply, error: unknown) {
  if (error instanceof CdekProxyError) {
    return reply.code(error.statusCode).send({
      cdekCode: error.cdekCode,
      cdekMessage: error.cdekMessage,
      cdekStatus: error.cdekStatus,
      error: error.publicError
    });
  }

  return reply.code(502).send({
    error: "CDEK_REQUEST_FAILED"
  });
}

function requireCdekProxyConfig(reply: FastifyReply) {
  const config = getCdekConfig();

  if (!config.enabled) {
    reply.code(503).send({
      error: "CDEK_DISABLED",
      status: getCdekStatus(config)
    });
    return null;
  }

  if (!config.configured) {
    reply.code(503).send({
      error: "CDEK_NOT_CONFIGURED",
      status: getCdekStatus(config)
    });
    return null;
  }

  return config;
}

function getNestedValue(value: unknown, paths: readonly (readonly string[])[]) {
  for (const pathParts of paths) {
    let current = value;

    for (const part of pathParts) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }

      current = current[part];
    }

    if (current !== undefined && current !== null) {
      return current;
    }
  }

  return null;
}

function getNestedString(
  value: unknown,
  paths: readonly (readonly string[])[]
) {
  const nestedValue = getNestedValue(value, paths);

  if (typeof nestedValue === "string" && nestedValue.trim()) {
    return nestedValue.trim();
  }

  if (typeof nestedValue === "number" && Number.isFinite(nestedValue)) {
    return String(nestedValue);
  }

  return null;
}

function getNestedBoolean(
  value: unknown,
  paths: readonly (readonly string[])[]
) {
  const nestedValue = getNestedValue(value, paths);

  return typeof nestedValue === "boolean" ? nestedValue : null;
}

function getNestedNumber(value: unknown, paths: readonly (readonly string[])[]) {
  const nestedValue = getNestedValue(value, paths);

  if (typeof nestedValue === "number" && Number.isFinite(nestedValue)) {
    return nestedValue;
  }

  if (typeof nestedValue === "string" && nestedValue.trim()) {
    const numberValue = Number(nestedValue);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function getCdekResponseItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items.filter(isRecord);
  }

  return [];
}

function getCityNameFromFullName(fullName: string | null) {
  return fullName?.split(",")[0]?.trim() || null;
}

function normalizeCdekCity(value: Record<string, unknown>): CdekCityResponseItem {
  const fullName = getNestedString(value, [["full_name"], ["fullName"]]);

  return {
    city:
      getNestedString(value, [["city"], ["name"]]) ??
      getCityNameFromFullName(fullName),
    cityUuid: getNestedString(value, [["city_uuid"], ["cityUuid"]]),
    code: getNestedNumber(value, [["code"]]),
    countryCode: getNestedString(value, [["country_code"], ["countryCode"]]),
    fiasGuid: getNestedString(value, [["fias_guid"], ["fiasGuid"]]),
    fullName,
    latitude: getNestedNumber(value, [["latitude"], ["location", "latitude"]]),
    longitude: getNestedNumber(value, [["longitude"], ["location", "longitude"]]),
    region: getNestedString(value, [["region"], ["region_name"], ["regionName"]]),
    regionCode: getNestedNumber(value, [["region_code"], ["regionCode"]])
  };
}

function normalizeCdekDeliveryPoint(
  value: Record<string, unknown>
): CdekDeliveryPointResponseItem {
  const phones = Array.isArray(value.phones)
    ? value.phones
        .map((phone) =>
          typeof phone === "string"
            ? phone.trim()
            : getNestedString(phone, [["number"], ["phone"]])
        )
        .filter((phone): phone is string => Boolean(phone))
    : [];

  return {
    address: getNestedString(value, [["location", "address"], ["address"]]),
    addressFull: getNestedString(value, [
      ["location", "address_full"],
      ["location", "addressFull"],
      ["address_full"],
      ["addressFull"]
    ]),
    allowedCod: getNestedBoolean(value, [["allowed_cod"], ["allowedCod"]]),
    code: getNestedString(value, [["code"]]),
    haveCash: getNestedBoolean(value, [["have_cash"], ["haveCash"]]),
    haveCashless: getNestedBoolean(value, [
      ["have_cashless"],
      ["haveCashless"]
    ]),
    heightMax: getNestedNumber(value, [["height_max"], ["heightMax"]]),
    latitude: getNestedNumber(value, [
      ["location", "latitude"],
      ["latitude"]
    ]),
    lengthMax: getNestedNumber(value, [["length_max"], ["lengthMax"]]),
    longitude: getNestedNumber(value, [
      ["location", "longitude"],
      ["longitude"]
    ]),
    phones,
    type: getNestedString(value, [["type"]]),
    uuid: getNestedString(value, [["uuid"]]),
    weightMax: getNestedNumber(value, [["weight_max"], ["weightMax"]]),
    weightMin: getNestedNumber(value, [["weight_min"], ["weightMin"]]),
    widthMax: getNestedNumber(value, [["width_max"], ["widthMax"]]),
    workTime: getNestedString(value, [["work_time"], ["workTime"]])
  };
}

function getPositiveInteger(value: unknown) {
  const numberValue = typeof value === "string" ? Number(value) : value;

  return typeof numberValue === "number" &&
    Number.isInteger(numberValue) &&
    numberValue > 0
    ? numberValue
    : null;
}

function getOptionalCdekPointCode(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeCdekCalculationRequestPayload(
  value: unknown
):
  | { error: string; message: string; ok: false }
  | { ok: true; value: NormalizedCdekCalculationRequest } {
  if (!isRecord(value)) {
    return {
      error: "INVALID_CDEK_CALCULATION_PAYLOAD",
      message: "Request body must be a JSON object.",
      ok: false
    };
  }

  const payload = value as CdekCalculationRequestPayload;
  const tariffCode = getPositiveInteger(payload.tariffCode);
  const fromLocationCode = getPositiveInteger(payload.fromLocation?.code);
  const toLocationCode = getPositiveInteger(payload.toLocation?.code);
  const currencyCode =
    typeof payload.currencyCode === "string" && payload.currencyCode.trim()
      ? payload.currencyCode.trim().toUpperCase()
      : "RUB";

  if (!tariffCode) {
    return {
      error: "INVALID_CDEK_TARIFF_CODE",
      message: "tariffCode must be a positive integer.",
      ok: false
    };
  }

  if (!fromLocationCode) {
    return {
      error: "INVALID_CDEK_FROM_LOCATION",
      message: "fromLocation.code must be a positive CDEK city code.",
      ok: false
    };
  }

  if (!toLocationCode) {
    return {
      error: "INVALID_CDEK_TO_LOCATION",
      message: "toLocation.code must be a positive CDEK city code.",
      ok: false
    };
  }

  if (currencyCode !== "RUB") {
    return {
      error: "INVALID_CDEK_CURRENCY",
      message: "Only RUB is supported for CDEK calculation.",
      ok: false
    };
  }

  if (!Array.isArray(payload.packages) || payload.packages.length === 0) {
    return {
      error: "INVALID_CDEK_PACKAGES",
      message: "packages must contain at least one package.",
      ok: false
    };
  }

  const packages = payload.packages.map((packagePayload) => {
    if (!isRecord(packagePayload)) {
      return null;
    }

    const typedPackage = packagePayload as CdekCalculationPackagePayload;
    const weightGrams = getPositiveInteger(typedPackage.weightGrams);
    const lengthCm = getPositiveInteger(typedPackage.lengthCm);
    const widthCm = getPositiveInteger(typedPackage.widthCm);
    const heightCm = getPositiveInteger(typedPackage.heightCm);

    if (!weightGrams || !lengthCm || !widthCm || !heightCm) {
      return null;
    }

    return {
      heightCm,
      lengthCm,
      weightGrams,
      widthCm
    };
  });

  if (packages.some((packagePayload) => packagePayload === null)) {
    return {
      error: "INVALID_CDEK_PACKAGES",
      message:
        "Each package must include positive integer weightGrams, lengthCm, widthCm, and heightCm.",
      ok: false
    };
  }

  return {
    ok: true,
    value: {
      currencyCode,
      deliveryPointCode: getOptionalCdekPointCode(payload.deliveryPointCode),
      fromLocation: {
        code: fromLocationCode
      },
      packages: packages as NormalizedCdekCalculationRequest["packages"],
      shipmentPointCode: getOptionalCdekPointCode(payload.shipmentPointCode),
      tariffCode,
      toLocation: {
        code: toLocationCode
      }
    }
  };
}

function normalizeCdekTariffListRequestPayload(
  value: unknown
):
  | { error: string; message: string; ok: false }
  | { ok: true; value: NormalizedCdekTariffListRequest } {
  if (!isRecord(value)) {
    return {
      error: "INVALID_CDEK_TARIFFS_PAYLOAD",
      message: "Request body must be a JSON object.",
      ok: false
    };
  }

  const payload = value as CdekTariffListRequestPayload;
  const fromLocationCode = getPositiveInteger(payload.fromLocation?.code);
  const toLocationCode = getPositiveInteger(payload.toLocation?.code);
  const currencyCode =
    typeof payload.currencyCode === "string" && payload.currencyCode.trim()
      ? payload.currencyCode.trim().toUpperCase()
      : "RUB";

  if (!fromLocationCode) {
    return {
      error: "INVALID_CDEK_FROM_LOCATION",
      message: "fromLocation.code must be a positive CDEK city code.",
      ok: false
    };
  }

  if (!toLocationCode) {
    return {
      error: "INVALID_CDEK_TO_LOCATION",
      message: "toLocation.code must be a positive CDEK city code.",
      ok: false
    };
  }

  if (currencyCode !== "RUB") {
    return {
      error: "INVALID_CDEK_CURRENCY",
      message: "Only RUB is supported for CDEK tariffs.",
      ok: false
    };
  }

  if (!Array.isArray(payload.packages) || payload.packages.length === 0) {
    return {
      error: "INVALID_CDEK_PACKAGES",
      message: "packages must contain at least one package.",
      ok: false
    };
  }

  const packages = payload.packages.map((packagePayload) => {
    if (!isRecord(packagePayload)) {
      return null;
    }

    const typedPackage = packagePayload as CdekCalculationPackagePayload;
    const weightGrams = getPositiveInteger(typedPackage.weightGrams);
    const lengthCm = getPositiveInteger(typedPackage.lengthCm);
    const widthCm = getPositiveInteger(typedPackage.widthCm);
    const heightCm = getPositiveInteger(typedPackage.heightCm);

    if (!weightGrams || !lengthCm || !widthCm || !heightCm) {
      return null;
    }

    return {
      heightCm,
      lengthCm,
      weightGrams,
      widthCm
    };
  });

  if (packages.some((packagePayload) => packagePayload === null)) {
    return {
      error: "INVALID_CDEK_PACKAGES",
      message:
        "Each package must include positive integer weightGrams, lengthCm, widthCm, and heightCm.",
      ok: false
    };
  }

  return {
    ok: true,
    value: {
      currencyCode,
      deliveryPointCode: getOptionalCdekPointCode(payload.deliveryPointCode),
      fromLocation: {
        code: fromLocationCode
      },
      packages: packages as NormalizedCdekTariffListRequest["packages"],
      shipmentPointCode: getOptionalCdekPointCode(payload.shipmentPointCode),
      toLocation: {
        code: toLocationCode
      }
    }
  };
}

function buildCdekCalculationProviderPayload(
  payload: NormalizedCdekCalculationRequest
) {
  const providerPayload: Record<string, unknown> = {
    currency: 1,
    from_location: {
      code: payload.fromLocation.code
    },
    packages: payload.packages.map((packagePayload) => ({
      height: packagePayload.heightCm,
      length: packagePayload.lengthCm,
      weight: packagePayload.weightGrams,
      width: packagePayload.widthCm
    })),
    tariff_code: payload.tariffCode,
    to_location: {
      code: payload.toLocation.code
    }
  };

  if (payload.deliveryPointCode) {
    providerPayload.delivery_point = payload.deliveryPointCode;
  }

  if (payload.shipmentPointCode) {
    providerPayload.shipment_point = payload.shipmentPointCode;
  }

  return providerPayload;
}

function buildCdekTariffListProviderPayload(
  payload: NormalizedCdekTariffListRequest
) {
  const providerPayload: Record<string, unknown> = {
    currency: 1,
    from_location: {
      code: payload.fromLocation.code
    },
    packages: payload.packages.map((packagePayload) => ({
      height: packagePayload.heightCm,
      length: packagePayload.lengthCm,
      weight: packagePayload.weightGrams,
      width: packagePayload.widthCm
    })),
    to_location: {
      code: payload.toLocation.code
    }
  };

  if (payload.deliveryPointCode) {
    providerPayload.delivery_point = payload.deliveryPointCode;
  }

  if (payload.shipmentPointCode) {
    providerPayload.shipment_point = payload.shipmentPointCode;
  }

  return providerPayload;
}

function moneyToMinor(value: number | null) {
  return value === null ? null : Math.round(value * 100);
}

function getCdekDiagnosticArray(value: unknown, paths: readonly (readonly string[])[]) {
  const nestedValue = getNestedValue(value, paths);

  if (Array.isArray(nestedValue)) {
    return sanitizeCdekPayload(nestedValue) as unknown[];
  }

  return [];
}

function getCdekTariffItems(value: unknown) {
  if (isRecord(value) && Array.isArray(value.tariff_codes)) {
    return value.tariff_codes.filter(isRecord);
  }

  if (isRecord(value) && Array.isArray(value.tariffCodes)) {
    return value.tariffCodes.filter(isRecord);
  }

  return getCdekResponseItems(value);
}

function normalizeCdekTariffItem(
  value: Record<string, unknown>
): CdekTariffListResponseItem {
  const deliverySum = getNestedNumber(value, [
    ["delivery_sum"],
    ["deliverySum"]
  ]);
  const totalSum = getNestedNumber(value, [["total_sum"], ["totalSum"]]);

  return {
    deliveryMode: getNestedString(value, [["delivery_mode"], ["deliveryMode"]]),
    deliverySum,
    deliverySumMinor: moneyToMinor(deliverySum),
    errors: getCdekDiagnosticArray(value, [["errors"]]),
    periodMax: getNestedNumber(value, [["period_max"], ["periodMax"]]),
    periodMin: getNestedNumber(value, [["period_min"], ["periodMin"]]),
    tariffCode: getNestedNumber(value, [["tariff_code"], ["tariffCode"], ["code"]]),
    tariffName: getNestedString(value, [
      ["tariff_name"],
      ["tariffName"],
      ["name"]
    ]),
    totalSum,
    totalSumMinor: moneyToMinor(totalSum),
    warnings: getCdekDiagnosticArray(value, [["warnings"]])
  };
}

function getCdekTariffDiagnosticDetails(tariff: CdekTariffListResponseItem | null) {
  if (!tariff) {
    return {
      deliveryMode: null,
      errorCodes: [],
      errorMessages: [],
      hasErrors: false,
      present: false,
      tariffCode: null,
      tariffName: null
    };
  }

  return {
    deliveryMode: tariff.deliveryMode,
    errorCodes: tariff.errors
      .map((error) =>
        getCdekDiagnosticString(
          error,
          [
            ["code"],
            ["error"],
            ["errorCode"],
            ["error_code"]
          ],
          ""
        )
      )
      .filter((value): value is string => Boolean(value)),
    errorMessages: tariff.errors
      .map((error) =>
        getCdekDiagnosticString(
          error,
          [
            ["message"],
            ["msg"],
            ["description"],
            ["text"]
          ],
          ""
        )
      )
      .filter((value): value is string => Boolean(value)),
    hasErrors: tariff.errors.length > 0,
    present: true,
    tariffCode: tariff.tariffCode,
    tariffName: tariff.tariffName
  };
}

function isCdekWarehouseWarehouseTariff(tariff: CdekTariffListResponseItem) {
  const mode = tariff.deliveryMode?.toLocaleLowerCase("ru-RU") ?? "";
  const name = tariff.tariffName?.toLocaleLowerCase("ru-RU") ?? "";

  return (
    tariff.deliveryMode === "4" ||
    mode === "4" ||
    name.includes("склад-склад") ||
    mode.includes("склад-склад") ||
    mode.includes("pvz-pvz")
  );
}

function buildCdekTariffDiagnosticSummary(items: CdekTariffListResponseItem[]) {
  const parcelTariff136 =
    items.find((tariff) => tariff.tariffCode === 136) ?? null;
  const parcelNameTariffs = items.filter((tariff) =>
    (tariff.tariffName ?? "").toLocaleLowerCase("ru-RU").includes("посылка")
  );
  const warehouseWarehouseCount = items.filter(
    isCdekWarehouseWarehouseTariff
  ).length;

  return {
    erroredItems: items.filter((tariff) => tariff.errors.length > 0).length,
    hasParcelName: parcelNameTariffs.length > 0,
    hasParcelTariff136: Boolean(parcelTariff136),
    order: "safe diagnostic only",
    otherVariantsCount: items.length - warehouseWarehouseCount,
    parcelNameTariffs: parcelNameTariffs.map(getCdekTariffDiagnosticDetails),
    parcelTariff136: getCdekTariffDiagnosticDetails(parcelTariff136),
    pvzToPvzCount: warehouseWarehouseCount,
    tariffCodes: items.map((tariff) => ({
      deliveryMode: tariff.deliveryMode,
      hasErrors: tariff.errors.length > 0,
      tariffCode: tariff.tariffCode,
      tariffName: tariff.tariffName
    })),
    totalItems: items.length,
    validItems: items.filter(
      (tariff) => tariff.tariffCode !== null && tariff.errors.length === 0
    ).length,
    warehouseWarehouseCount
  };
}

function normalizeCdekCalculationResponse(
  value: unknown,
  requestPayload: NormalizedCdekCalculationRequest
): CdekDeliveryCalculationResponse {
  const deliverySum = getNestedNumber(value, [
    ["delivery_sum"],
    ["deliverySum"]
  ]);
  const totalSum = getNestedNumber(value, [["total_sum"], ["totalSum"]]);
  const deliverySumMinor = moneyToMinor(deliverySum);
  const totalSumMinor = moneyToMinor(totalSum);

  return {
    calendarMax: getNestedNumber(value, [["calendar_max"], ["calendarMax"]]),
    calendarMin: getNestedNumber(value, [["calendar_min"], ["calendarMin"]]),
    currencyCode: requestPayload.currencyCode,
    deliverySum,
    deliverySumMinor,
    errors: getCdekDiagnosticArray(value, [["errors"]]),
    notSaved: true,
    periodMax: getNestedNumber(value, [["period_max"], ["periodMax"]]),
    periodMin: getNestedNumber(value, [["period_min"], ["periodMin"]]),
    priceMinor: totalSumMinor ?? deliverySumMinor,
    provider: "cdek",
    services: getCdekDiagnosticArray(value, [["services"]]),
    tariffCode:
      getNestedNumber(value, [["tariff_code"], ["tariffCode"]]) ??
      requestPayload.tariffCode,
    totalSum,
    totalSumMinor,
    warnings: getCdekDiagnosticArray(value, [["warnings"]]),
    weightCalc: getNestedNumber(value, [["weight_calc"], ["weightCalc"]])
  };
}

function getOptionalDateString(value: unknown) {
  const dateValue = getOptionalString(value);

  return dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : null;
}

function normalizeCdekPackages(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const packages = value.map((packagePayload) => {
    if (!isRecord(packagePayload)) {
      return null;
    }

    const typedPackage = packagePayload as CdekDeliveryPackagePayload;
    const weightGrams = getPositiveInteger(typedPackage.weightGrams);
    const lengthCm = getPositiveInteger(typedPackage.lengthCm);
    const widthCm = getPositiveInteger(typedPackage.widthCm);
    const heightCm = getPositiveInteger(typedPackage.heightCm);

    if (!weightGrams || !lengthCm || !widthCm || !heightCm) {
      return null;
    }

    return {
      heightCm,
      lengthCm,
      weightGrams,
      widthCm
    };
  });

  return packages.some((packagePayload) => packagePayload === null)
    ? null
    : (packages as NormalizedCdekDeliverySelection["packages"]);
}

function normalizeSaveCdekDeliveryPayload(
  value: unknown
):
  | { error: string; message: string; ok: false }
  | { ok: true; value: NormalizedCdekDeliverySelection } {
  if (!isRecord(value)) {
    return {
      error: "INVALID_CDEK_DELIVERY_PAYLOAD",
      message: "Request body must be a JSON object.",
      ok: false
    };
  }

  const payload = value as SaveCdekDeliveryPayload;
  const cityCode = getPositiveInteger(payload.cityCode);
  const city = getOptionalString(payload.city);
  const deliveryPointCode = getOptionalString(payload.deliveryPointCode);
  const deliveryPointAddress = getOptionalString(payload.deliveryPointAddress);
  const tariffCode = getPositiveInteger(payload.tariffCode);
  const priceMinor = getMinorPrice(payload.priceMinor);
  const currencyCode = getOptionalString(payload.currencyCode)?.toUpperCase() ?? "RUB";
  const packages = normalizeCdekPackages(payload.packages);

  if (!cityCode) {
    return {
      error: "INVALID_CDEK_CITY_CODE",
      message: "cityCode must be a positive CDEK city code.",
      ok: false
    };
  }

  if (!city) {
    return {
      error: "INVALID_CDEK_CITY",
      message: "city is required.",
      ok: false
    };
  }

  if (!deliveryPointCode) {
    return {
      error: "INVALID_CDEK_DELIVERY_POINT",
      message: "deliveryPointCode is required.",
      ok: false
    };
  }

  if (!deliveryPointAddress) {
    return {
      error: "INVALID_CDEK_DELIVERY_POINT_ADDRESS",
      message: "deliveryPointAddress is required.",
      ok: false
    };
  }

  if (!tariffCode) {
    return {
      error: "INVALID_CDEK_TARIFF_CODE",
      message: "tariffCode must be a positive integer.",
      ok: false
    };
  }

  if (priceMinor === null || priceMinor <= 0) {
    return {
      error: "INVALID_CDEK_DELIVERY_PRICE",
      message: "priceMinor must be a positive integer minor amount.",
      ok: false
    };
  }

  if (currencyCode !== "RUB") {
    return {
      error: "INVALID_CDEK_CURRENCY",
      message: "Only RUB is supported for CDEK delivery.",
      ok: false
    };
  }

  if (!packages) {
    return {
      error: "INVALID_CDEK_PACKAGES",
      message:
        "packages must include positive integer weightGrams, lengthCm, widthCm, and heightCm.",
      ok: false
    };
  }

  return {
    ok: true,
    value: {
      calculation: sanitizeCdekPayload(payload.calculation ?? null),
      calendarMax: getOptionalDateString(payload.calendarMax),
      calendarMin: getOptionalDateString(payload.calendarMin),
      city,
      cityCode,
      cityUuid: getOptionalString(payload.cityUuid),
      comment: getOptionalString(payload.comment),
      countryCode: getOptionalString(payload.countryCode)?.toUpperCase() ?? "RU",
      currencyCode,
      deliveryPointAddress,
      deliveryPointCode,
      deliveryPointType: getOptionalString(payload.deliveryPointType),
      deliveryPointUuid: getOptionalString(payload.deliveryPointUuid),
      packages,
      periodMax: getPositiveInteger(payload.periodMax),
      periodMin: getPositiveInteger(payload.periodMin),
      priceMinor,
      recipientName: getOptionalString(payload.recipientName),
      recipientPhone: getOptionalString(payload.recipientPhone),
      region: getOptionalString(payload.region),
      senderCity: getOptionalString(payload.senderCity),
      senderCityCode: getPositiveInteger(payload.senderCityCode),
      senderCountryCode: getOptionalString(payload.senderCountryCode)?.toUpperCase() ?? null,
      senderRegion: getOptionalString(payload.senderRegion),
      shipmentPointAddress: getOptionalString(payload.shipmentPointAddress),
      shipmentPointCode: getOptionalString(payload.shipmentPointCode),
      shipmentPointName: getOptionalString(payload.shipmentPointName),
      shipmentPointType: getOptionalString(payload.shipmentPointType),
      shipmentPointUuid: getOptionalString(payload.shipmentPointUuid),
      tariffCode,
      tariffName: getOptionalString(payload.tariffName)
    }
  };
}

function buildCdekDeliveryProviderPayload(
  payload: NormalizedCdekDeliverySelection
) {
  return {
    calculation: payload.calculation,
    city: {
      city: payload.city,
      code: payload.cityCode,
      countryCode: payload.countryCode,
      region: payload.region,
      uuid: payload.cityUuid
    },
    deliveryPoint: {
      address: payload.deliveryPointAddress,
      code: payload.deliveryPointCode,
      type: payload.deliveryPointType,
      uuid: payload.deliveryPointUuid
    },
    package: {
      items: payload.packages
    },
    pricing: {
      currencyCode: payload.currencyCode,
      priceMinor: payload.priceMinor
    },
    provider: "cdek",
    senderCity: {
      city: payload.senderCity,
      code: payload.senderCityCode,
      countryCode: payload.senderCountryCode,
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

function parseOzonAmountMinor(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function getOzonTimestamp(value: unknown, paths: readonly (readonly string[])[]) {
  const timestampValue = getNestedString(value, paths);

  if (!timestampValue) {
    return null;
  }

  const timestamp = Date.parse(timestampValue);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

async function requestOzonCancelOrder(
  config: OzonAcquiringConfig,
  providerOrderId: string
) {
  const cancelRequest = {
    id: providerOrderId
  };
  const requestSign = signOzonCancelOrderRequest(config, cancelRequest);
  const requestBody = {
    ...cancelRequest,
    accessKey: config.accessKey,
    requestSign
  };
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/v1/cancelOrder`, {
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    return {
      diagnostic: {
        ozonCode: "FETCH_FAILED",
        ozonDetails: error instanceof Error ? sanitizeOzonText(error.message) : null,
        ozonMessage: "Не удалось вызвать Ozon cancelOrder",
        ozonStatus: 0
      },
      ok: false as const
    };
  }

  const responseText = await response.text();
  let responseBody: unknown = {};

  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = {
      raw: responseText
    };
  }

  if (!response.ok) {
    return {
      diagnostic: buildOzonErrorDiagnostic(
        response.status,
        responseBody,
        responseText
      ),
      ok: false as const
    };
  }

  return {
    ok: true as const,
    responseBody
  };
}

function buildOzonProviderExtId(
  orderNumber: string,
  existingPayments: ApiOrderPaymentRow[]
) {
  const existingExtIds = new Set(
    existingPayments
      .map((payment) => payment.providerExtId)
      .filter((value): value is string => Boolean(value))
  );

  if (!existingExtIds.has(orderNumber)) {
    return orderNumber;
  }

  let sequence = existingPayments.length + 1;
  let providerExtId = `${orderNumber}-PAY-${sequence}`;

  while (existingExtIds.has(providerExtId)) {
    sequence += 1;
    providerExtId = `${orderNumber}-PAY-${sequence}`;
  }

  return providerExtId;
}

function buildOzonCreateOrderRequest(
  config: OzonAcquiringConfig,
  order: OzonOrderPaymentOrderRow,
  providerExtId: string
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const amountMinor = String(order.totalPriceMinor);
  const itemName = order.isDtf
    ? `DTF-печать по заявке ${order.orderNumber}`
    : `Оплата заказа ${order.orderNumber}`;

  return {
    amount: {
      currencyCode: "643",
      value: amountMinor
    },
    expiresAt,
    extId: providerExtId,
    failUrl: config.failUrl,
    fiscalizationPhone: order.customerPhone ?? undefined,
    fiscalizationType: "FISCAL_TYPE_SINGLE",
    items: [
      {
        extId: providerExtId,
        name: itemName,
        needMark: false,
        price: {
          currencyCode: "643",
          value: amountMinor
        },
        quantity: 1,
        type: "TYPE_PRODUCT",
        vat: "VAT_0"
      }
    ],
    mode: "MODE_FULL",
    notificationUrl: config.notificationUrl,
    paymentAlgorithm: "PAY_ALGO_SMS",
    receiptEmail: order.customerEmail ?? undefined,
    successUrl: config.successUrl
  };
}

async function requestOzonCreateOrder(
  config: OzonAcquiringConfig,
  order: OzonOrderPaymentOrderRow,
  providerExtId: string
) {
  const createOrderRequest = buildOzonCreateOrderRequest(
    config,
    order,
    providerExtId
  );
  const requestSign = signOzonCreateOrderRequest(config, createOrderRequest);
  const requestBody = {
    ...createOrderRequest,
    accessKey: config.accessKey,
    requestSign
  };
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/v1/createOrder`, {
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    return {
      createOrderRequest,
      diagnostic: {
        ozonCode: "FETCH_FAILED",
        ozonDetails: error instanceof Error ? sanitizeOzonText(error.message) : null,
        ozonMessage: "Не удалось вызвать Ozon createOrder",
        ozonStatus: 0
      },
      ok: false as const
    };
  }

  const responseText = await response.text();
  let responseBody: unknown = {};

  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = {
      raw: responseText
    };
  }

  if (!response.ok) {
    return {
      createOrderRequest,
      diagnostic: buildOzonErrorDiagnostic(
        response.status,
        responseBody,
        responseText
      ),
      ok: false as const
    };
  }

  return {
    createOrderRequest,
    ok: true as const,
    responseBody
  };
}

async function insertOzonCreatedPayment(input: {
  actorName: string;
  actorUserId: number;
  client: PoolClient;
  createOrderRequest: unknown;
  order: OzonOrderPaymentOrderRow;
  orderId: number;
  providerExtId: string;
  responseBody: unknown;
}) {
  const providerOrderId = getNestedString(input.responseBody, [
    ["order", "id"],
    ["order", "orderId"],
    ["orderID"],
    ["id"]
  ]);
  const ozonStatus = getNestedString(input.responseBody, [
    ["order", "status"],
    ["status"]
  ]);
  const payLink = getNestedString(input.responseBody, [
    ["order", "payLink"],
    ["payLink"],
    ["paymentUrl"]
  ]);
  const testMode = getNestedBoolean(input.responseBody, [
    ["order", "testMode"],
    ["testMode"]
  ]);
  const mappedStatus = mapOzonOrderStatus(ozonStatus);
  const expiresAt = getNestedString(input.createOrderRequest, [["expiresAt"]]);
  const paymentResult = await input.client.query<ApiOrderPaymentRow>(
    `
      insert into app.order_payments (
        order_id,
        provider,
        provider_ext_id,
        provider_order_id,
        amount_minor,
        currency_code,
        status,
        ozon_status,
        pay_link,
        test_mode,
        expires_at,
        create_request_json,
        create_response_json,
        created_by_user_id
      )
      values (
        $1,
        'ozon_pay_checkout',
        $2,
        $3,
        $4,
        'RUB',
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::jsonb,
        $11::jsonb,
        $12
      )
      on conflict (provider, provider_ext_id) do update
      set updated_at = app.order_payments.updated_at
      returning
        id::text as id,
        provider,
        provider_order_id as "providerOrderId",
        provider_ext_id as "providerExtId",
        amount_minor::text as "amountMinor",
        currency_code as "currencyCode",
        status,
        ozon_status as "ozonStatus",
        pay_link as "payLink",
        payment_method as "paymentMethod",
        test_mode as "testMode",
        paid_at::text as "paidAt",
        canceled_at::text as "canceledAt",
        refunded_at::text as "refundedAt",
        expires_at::text as "expiresAt",
        last_error_code as "lastErrorCode",
        last_error_message as "lastErrorMessage",
        created_at::text as "createdAt",
        updated_at::text as "updatedAt"
    `,
    [
      input.orderId,
      input.providerExtId,
      providerOrderId,
      input.order.totalPriceMinor,
      mappedStatus === "unknown" ? "created" : mappedStatus,
      ozonStatus,
      payLink,
      testMode,
      expiresAt,
      JSON.stringify(sanitizeOzonPayload(input.createOrderRequest)),
      JSON.stringify(sanitizeOzonPayload(input.responseBody)),
      input.actorUserId
    ]
  );
  const payment = paymentResult.rows[0];

  await input.client.query(
    `
      insert into app.order_events (
        order_id,
        event_type,
        actor_type,
        actor_user_id,
        actor_name,
        payload_json
      )
      values ($1, 'payment_created', 'manager', $2, $3, $4::jsonb)
    `,
    [
      input.orderId,
      input.actorUserId,
      input.actorName,
      JSON.stringify({
        amountMinor: input.order.totalPriceMinor,
        paymentId: Number(payment.id),
        provider: "ozon_pay_checkout",
        providerExtId: input.providerExtId,
        providerOrderId,
        status: payment.status
      })
    ]
  );

  return payment;
}

function mapOzonOrderStatus(status: string | null): DiezPaymentStatus {
  switch (status) {
    case "STATUS_NEW":
      return "created";
    case "STATUS_PAYMENT_PENDING":
      return "pending";
    case "STATUS_PAID":
      return "paid";
    case "STATUS_AUTHORIZED":
      return "authorized";
    case "STATUS_CANCELED":
    case "STATUS_PARTITION_CANCELED":
      return "canceled";
    case "STATUS_EXPIRED":
      return "expired";
    case "STATUS_REFUNDED":
      return "refunded";
    case "STATUS_PARTITIONAL_REFUND":
      return "partial_refund";
    case "STATUS_DISPUTED":
    case "STATUS_DISPUTING":
      return "disputed";
    default:
      return "unknown";
  }
}

function mapOzonWebhookStatus(status: string | null): DiezPaymentStatus {
  switch (status) {
    case "Completed":
      return "paid";
    case "Authorized":
      return "authorized";
    case "Rejected":
      return "failed";
    default:
      return mapOzonOrderStatus(status);
  }
}

function buildOrderPaymentResponse(
  row: ApiOrderPaymentRow
): ApiOrderPaymentResponse {
  return {
    amountMinor: Number(row.amountMinor),
    canceledAt: row.canceledAt,
    createdAt: row.createdAt,
    currencyCode: row.currencyCode,
    expiresAt: row.expiresAt,
    id: Number(row.id),
    lastErrorCode: row.lastErrorCode,
    lastErrorMessage: row.lastErrorMessage,
    ozonStatus: row.ozonStatus,
    paidAt: row.paidAt,
    payLink: row.payLink,
    paymentMethod: row.paymentMethod,
    provider: row.provider,
    refundedAt: row.refundedAt,
    status: row.status,
    testMode: row.testMode,
    updatedAt: row.updatedAt
  };
}

function getOrderPaymentSelectSql() {
  return `
    select
      id::text as id,
      provider,
      provider_order_id as "providerOrderId",
      provider_ext_id as "providerExtId",
      amount_minor::text as "amountMinor",
      currency_code as "currencyCode",
      status,
      ozon_status as "ozonStatus",
      pay_link as "payLink",
      payment_method as "paymentMethod",
      test_mode as "testMode",
      paid_at::text as "paidAt",
      canceled_at::text as "canceledAt",
      refunded_at::text as "refundedAt",
      expires_at::text as "expiresAt",
      last_error_code as "lastErrorCode",
      last_error_message as "lastErrorMessage",
      created_at::text as "createdAt",
      updated_at::text as "updatedAt"
    from app.order_payments
  `;
}

function normalizeManagerWorkflowComment(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const comment = value.trim();

  return comment ? comment.slice(0, 5000) : null;
}

function getMultipartFieldString(
  fields: MultipartFile["fields"],
  name: string
) {
  const field = fields[name] as MultipartValue<string> | undefined;

  return typeof field?.value === "string" && field.value.trim()
    ? field.value.trim()
    : null;
}

function normalizeAttachmentSource(value: unknown): OrderAttachmentSource {
  return value === "site" || value === "manager" || value === "desktop"
    ? value
    : "desktop";
}

function normalizeAttachmentType(value: unknown): OrderAttachmentType {
  return value === "design_file" ||
    value === "drawing" ||
    value === "reference" ||
    value === "placement_photo" ||
    value === "print_file" ||
    value === "other"
    ? value
    : "other";
}

function sanitizeOriginalFileName(value: string) {
  const baseName = path.basename(value).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_");
  const normalized = baseName.replace(/\s+/g, " ").trim();

  return normalized || "attachment";
}

function getSafeFileExtension(fileName: string, mimeType: string | null) {
  const extension = path
    .extname(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 16);

  if (extension) {
    return extension;
  }

  if (mimeType === "application/pdf") {
    return ".pdf";
  }

  if (mimeType === "text/plain") {
    return ".txt";
  }

  if (mimeType?.startsWith("image/")) {
    return `.${mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "img"}`;
  }

  return "";
}

function isAllowedAttachmentMime(mimeType: string | null) {
  if (!mimeType) {
    return true;
  }

  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/postscript" ||
    mimeType === "application/illustrator" ||
    mimeType === "application/octet-stream" ||
    mimeType === "text/plain"
  );
}

function isPreviewableAttachmentMime(mimeType: string | null) {
  return Boolean(
    mimeType && (mimeType.startsWith("image/") || mimeType === "application/pdf")
  );
}

function getOrderAttachmentUrls(orderId: number, attachmentId: number) {
  const baseUrl = `/orders/${orderId}/attachments/${attachmentId}`;

  return {
    downloadUrl: `${baseUrl}/download`,
    previewUrl: `${baseUrl}/preview`
  };
}

function buildOrderAttachmentResponse(
  attachment: ApiOrderAttachmentRow
): ApiOrderAttachmentResponse {
  const urls = getOrderAttachmentUrls(attachment.orderId, attachment.id);

  return {
    attachmentType: attachment.attachmentType,
    comment: attachment.comment,
    createdAt: attachment.createdAt,
    downloadUrl: urls.downloadUrl,
    fileSize: attachment.fileSize,
    id: attachment.id,
    mimeType: attachment.mimeType,
    orderId: attachment.orderId,
    originalFileName: attachment.originalFileName,
    previewUrl: isPreviewableAttachmentMime(attachment.mimeType)
      ? urls.previewUrl
      : null
  };
}

function createContentDisposition(
  mode: "attachment" | "inline",
  fileName: string
) {
  const asciiFileName = fileName.replace(/[^\x20-\x7e]+/g, "_").replace(/"/g, "'");
  const encodedFileName = encodeURIComponent(fileName);

  return `${mode}; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
}

async function getOrderAttachment(
  orderId: number,
  attachmentId: number
) {
  const attachments = await queryDatabase<ApiOrderAttachmentRow>(
    `
      select
        id,
        order_id as "orderId",
        source,
        attachment_type as "attachmentType",
        original_file_name as "originalFileName",
        mime_type as "mimeType",
        file_size as "fileSize",
        storage_path as "storagePath",
        comment,
        created_at::text as "createdAt"
      from app.order_attachments
      where order_id = $1
        and id = $2
      limit 1
    `,
    [orderId, attachmentId]
  );

  return attachments[0] ?? null;
}

async function safeDeleteAttachmentFile(storagePath: string | null) {
  if (!storagePath) {
    return;
  }

  const resolvedStoragePath = path.resolve(
    path.isAbsolute(storagePath) ? storagePath : path.join(repoRoot, storagePath)
  );
  const allowedPrefix = `${resolvedOrderAttachmentsDir}${path.sep}`;

  if (
    resolvedStoragePath !== resolvedOrderAttachmentsDir &&
    !resolvedStoragePath.startsWith(allowedPrefix)
  ) {
    app.log.warn(
      {
        storagePath
      },
      "Skipped deleting order attachment outside allowed directory"
    );
    return;
  }

  try {
    await unlink(resolvedStoragePath);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    app.log.warn(
      {
        error,
        storagePath
      },
      "Failed to delete order attachment file"
    );
  }
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

function normalizeFinancialJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeFinancialJson);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeFinancialJson(value[key])])
    );
  }

  return value ?? null;
}

function buildOrderFinancialSignature(input: {
  deliveryTotalMinor: number;
  items: Array<{
    calculationSnapshotJson: unknown;
    paramsJson: unknown;
    quantity: number;
    serviceType: string;
    sortOrder: number;
    title: string;
    totalPriceMinor: number;
    unitPriceMinor: number;
  }>;
  totalPriceMinor: number;
}) {
  return JSON.stringify({
    deliveryTotalMinor: input.deliveryTotalMinor,
    items: input.items
      .map((item) => ({
        calculationSnapshotJson: normalizeFinancialJson(
          item.calculationSnapshotJson
        ),
        paramsJson: normalizeFinancialJson(item.paramsJson),
        quantity: item.quantity,
        serviceType: item.serviceType,
        sortOrder: item.sortOrder,
        title: item.title,
        totalPriceMinor: item.totalPriceMinor,
        unitPriceMinor: item.unitPriceMinor
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
    totalPriceMinor: input.totalPriceMinor
  });
}

function buildStoredOrderFinancialSignature(input: {
  deliveryTotalMinor: number;
  items: OrderFinancialItemRow[];
  totalPriceMinor: number;
}) {
  return buildOrderFinancialSignature({
    deliveryTotalMinor: input.deliveryTotalMinor,
    items: input.items.map((item) => ({
      calculationSnapshotJson: item.calculationSnapshotJson,
      paramsJson: item.paramsJson,
      quantity: Number(item.quantity),
      serviceType: item.serviceType,
      sortOrder: item.sortOrder,
      title: item.title,
      totalPriceMinor: Number(item.totalPriceMinor),
      unitPriceMinor: Number(item.unitPriceMinor)
    })),
    totalPriceMinor: input.totalPriceMinor
  });
}

function buildDraftOrderFinancialSignature(
  normalizedItems: DesktopDraftOrderItem[],
  deliveryTotalMinor: number,
  totalPriceMinor: number
) {
  return buildOrderFinancialSignature({
    deliveryTotalMinor,
    items: normalizedItems.map((item, index) => {
      const itemTotalPriceMinor = getOrderItemPriceMinor(item) ?? 0;
      const quantity = getPositiveQuantity(item.quantity);

      return {
        calculationSnapshotJson: getOrderItemCalculationSnapshot(item),
        paramsJson: getOrderItemParams(item),
        quantity,
        serviceType: mapServiceType(getRequiredString(item.serviceType)),
        sortOrder: index + 1,
        title: getRequiredString(item.title),
        totalPriceMinor: itemTotalPriceMinor,
        unitPriceMinor: Math.round(itemTotalPriceMinor / quantity)
      };
    }),
    totalPriceMinor
  });
}

function buildStoredOrderItemsSignature(items: OrderFinancialItemRow[]) {
  return JSON.stringify(
    items
      .map((item) => ({
        calculationSnapshotJson: normalizeFinancialJson(
          item.calculationSnapshotJson
        ),
        paramsJson: normalizeFinancialJson(item.paramsJson),
        quantity: Number(item.quantity),
        serviceType: item.serviceType,
        sortOrder: item.sortOrder,
        title: item.title,
        totalPriceMinor: Number(item.totalPriceMinor),
        unitPriceMinor: Number(item.unitPriceMinor)
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder)
  );
}

function buildDraftOrderItemsSignature(normalizedItems: DesktopDraftOrderItem[]) {
  return JSON.stringify(
    normalizedItems
      .map((item, index) => {
        const itemTotalPriceMinor = getOrderItemPriceMinor(item) ?? 0;
        const quantity = getPositiveQuantity(item.quantity);

        return {
          calculationSnapshotJson: normalizeFinancialJson(
            getOrderItemCalculationSnapshot(item)
          ),
          paramsJson: normalizeFinancialJson(getOrderItemParams(item)),
          quantity,
          serviceType: mapServiceType(getRequiredString(item.serviceType)),
          sortOrder: index + 1,
          title: getRequiredString(item.title),
          totalPriceMinor: itemTotalPriceMinor,
          unitPriceMinor: Math.round(itemTotalPriceMinor / quantity)
        };
      })
      .sort((left, right) => left.sortOrder - right.sortOrder)
  );
}

function getOrderItemsTotalMinor(normalizedItems: DesktopDraftOrderItem[]) {
  return normalizedItems.reduce(
    (total, item) => total + (getOrderItemPriceMinor(item) ?? 0),
    0
  );
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
  customerPhone: string | null,
  options: { clearNeedsReview?: boolean } = {}
) {
  const deliveryMode = normalizeDeliveryMode(delivery.mode);
  const clearNeedsReview = options.clearNeedsReview ?? true;
  const values = [
    orderId,
    deliveryMode,
    getDeliveryStatus(deliveryMode),
    getOptionalString(delivery.contactName) ?? customerName,
    getOptionalString(delivery.phone) ?? customerPhone,
    getOptionalString(delivery.address),
    getOptionalString(delivery.comment),
    clearNeedsReview
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
          delivery_status = case
            when delivery_mode = $2 then delivery_status
            else $3
          end,
          recipient_name = $4,
          recipient_phone = $5,
          address_text = $6,
          comment = $7,
          currency_code = 'RUB',
          provider_payload_json = case
            when $8::boolean then coalesce(provider_payload_json, '{}'::jsonb) - 'needsReview' - 'needsReviewReason'
            else provider_payload_json
          end
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
    values.slice(0, 7)
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

app.get("/cdek/status", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return reply;
  }

  return getCdekStatus();
});

app.get<{
  Querystring: {
    countryCode?: string;
    name?: string;
  };
}>("/cdek/cities", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return reply;
  }

  const name = request.query.name?.trim();

  if (!name || name.length < 2) {
    return reply.code(400).send({
      error: "INVALID_CDEK_CITY_NAME",
      message: "City search name must contain at least 2 characters."
    });
  }

  const countryCode = request.query.countryCode?.trim().toUpperCase() || "RU";

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return reply.code(400).send({
      error: "INVALID_CDEK_COUNTRY_CODE",
      message: "Country code must be a 2-letter ISO code."
    });
  }

  const config = requireCdekProxyConfig(reply);

  if (!config) {
    return reply;
  }

  try {
    const responseBody = await requestCdekJson(
      config,
      "/v2/location/suggest/cities",
      {
        country_code: countryCode,
        name
      }
    );

    return {
      items: getCdekResponseItems(responseBody).map(normalizeCdekCity)
    };
  } catch (error) {
    return sendCdekProxyError(reply, error);
  }
});

app.post<{
  Body: CdekTariffListRequestPayload;
}>("/cdek/tariffs", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return reply;
  }

  const normalizedPayload = normalizeCdekTariffListRequestPayload(request.body);

  if (!normalizedPayload.ok) {
    return reply.code(400).send({
      error: normalizedPayload.error,
      message: normalizedPayload.message
    });
  }

  const config = requireCdekProxyConfig(reply);

  if (!config) {
    return reply;
  }

  try {
    const responseBody = await postCdekJson(
      config,
      "/v2/calculator/tarifflist",
      buildCdekTariffListProviderPayload(normalizedPayload.value)
    );

    const items = getCdekTariffItems(responseBody).map(normalizeCdekTariffItem);

    request.log.info(
      buildCdekTariffDiagnosticSummary(items),
      "cdek tariffs normalized"
    );

    return {
      items
    };
  } catch (error) {
    return sendCdekProxyError(reply, error);
  }
});

app.get<{
  Querystring: {
    cityCode?: string;
    type?: string;
  };
}>("/cdek/delivery-points", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return reply;
  }

  const cityCode = Number(request.query.cityCode);

  if (!Number.isInteger(cityCode) || cityCode <= 0) {
    return reply.code(400).send({
      error: "INVALID_CDEK_CITY_CODE",
      message: "cityCode must be a positive CDEK city code."
    });
  }

  const requestedType = request.query.type?.trim().toUpperCase() || "ALL";

  if (!["ALL", "POSTAMAT", "PVZ"].includes(requestedType)) {
    return reply.code(400).send({
      error: "INVALID_CDEK_DELIVERY_POINT_TYPE",
      message: "type must be ALL, PVZ, or POSTAMAT."
    });
  }

  const config = requireCdekProxyConfig(reply);

  if (!config) {
    return reply;
  }

  try {
    const responseBody = await requestCdekJson(config, "/v2/deliverypoints", {
      city_code: String(cityCode),
      type: requestedType
    });

    return {
      items: getCdekResponseItems(responseBody).map(normalizeCdekDeliveryPoint)
    };
  } catch (error) {
    return sendCdekProxyError(reply, error);
  }
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

app.post<{ Body: CustomerRegisterPayload }>(
  "/customer/auth/register",
  async (request, reply) => {
    const phone = normalizeLogin(request.body?.phone);
    const phoneNormalized = normalizePhoneLogin(request.body?.phone);
    const pin = normalizeCustomerPin(request.body?.pin);
    const pinRepeat = normalizeCustomerPin(request.body?.pinRepeat);
    const email = normalizeCustomerEmail(request.body?.email);
    const displayName = normalizeCustomerDisplayName(request.body?.displayName);

    if (!phone || !phoneNormalized || !pin || !pinRepeat) {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_REGISTER_PAYLOAD"
      });
    }

    if (pin !== pinRepeat) {
      return reply.code(400).send({
        error: "CUSTOMER_PIN_MISMATCH"
      });
    }

    const existingAccounts = await queryDatabase<{ id: string }>(
      `
        select id::text as id
        from app.customer_accounts
        where phone_normalized = $1
        limit 1
      `,
      [phoneNormalized]
    );

    if (existingAccounts[0]) {
      return reply.code(409).send({
        error: "CUSTOMER_ACCOUNT_ALREADY_EXISTS"
      });
    }

    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const pinHash = createPasswordHash(pin);
    const clientName = getOptionalString(request.body?.clientName);
    const userAgent = getOptionalString(request.headers["user-agent"]);

    const result = await withDatabaseTransaction(async (client) => {
      const customerResult = await client.query<{ id: string }>(
        `
          insert into app.customers (
            customer_type,
            name,
            phone,
            email,
            comment
          )
          values ('person', $1, $2, $3, null)
          returning id::text as id
        `,
        [displayName, phone, email]
      );
      const customerId = customerResult.rows[0]?.id ?? null;

      const accountResult = await client.query<CustomerAccountRow>(
        `
          insert into app.customer_accounts (
            customer_id,
            phone,
            phone_normalized,
            email,
            display_name,
            pin_hash
          )
          values ($1, $2, $3, $4, $5, $6)
          returning
            id::text as id,
            customer_id::text as "customerId",
            phone,
            phone_normalized as "phoneNormalized",
            email,
            display_name as "displayName"
        `,
        [customerId, phone, phoneNormalized, email, displayName, pinHash]
      );
      const account = accountResult.rows[0];

      const sessionResult = await client.query<{ expiresAt: string }>(
        `
          insert into app.customer_sessions (
            customer_account_id,
            token_hash,
            expires_at,
            user_agent,
            client_name
          )
          values ($1, $2, now() + interval '30 days', $3, $4)
          returning expires_at::text as "expiresAt"
        `,
        [account.id, tokenHash, userAgent, clientName]
      );

      return {
        account,
        expiresAt: sessionResult.rows[0].expiresAt
      };
    });

    return reply.code(201).send({
      customer: buildPublicCustomerAccount(result.account),
      expiresAt: result.expiresAt,
      token
    });
  }
);

app.post<{ Body: CustomerAuthPayload }>(
  "/customer/auth/login",
  async (request, reply) => {
    const phoneNormalized = normalizePhoneLogin(request.body?.phone);
    const pin = normalizeCustomerPin(request.body?.pin);

    if (!phoneNormalized || !pin) {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_LOGIN_PAYLOAD"
      });
    }

    const accounts = await queryDatabase<CustomerAccountWithPinRow>(
      `
        select
          id::text as id,
          customer_id::text as "customerId",
          phone,
          phone_normalized as "phoneNormalized",
          email,
          display_name as "displayName",
          pin_hash as "pinHash",
          failed_login_attempts as "failedLoginAttempts",
          locked_until::text as "lockedUntil"
        from app.customer_accounts
        where phone_normalized = $1
          and is_active = true
        limit 1
      `,
      [phoneNormalized]
    );
    const account = accounts[0];

    if (!account) {
      return reply.code(401).send({
        error: "INVALID_CUSTOMER_PHONE_OR_PIN"
      });
    }

    if (account.lockedUntil && new Date(account.lockedUntil).getTime() > Date.now()) {
      return reply.code(429).send({
        error: "CUSTOMER_ACCOUNT_LOCKED"
      });
    }

    if (!verifyPassword(pin, account.pinHash)) {
      await queryDatabase(
        `
          update app.customer_accounts
          set
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = case
              when failed_login_attempts + 1 >= 5 then now() + interval '15 minutes'
              else locked_until
            end
          where id = $1
        `,
        [account.id]
      );

      return reply.code(401).send({
        error: "INVALID_CUSTOMER_PHONE_OR_PIN"
      });
    }

    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const clientName = getOptionalString(request.body?.clientName);
    const userAgent = getOptionalString(request.headers["user-agent"]);

    const session = await withDatabaseTransaction(async (client) => {
      const sessionResult = await client.query<{ expiresAt: string }>(
        `
          insert into app.customer_sessions (
            customer_account_id,
            token_hash,
            expires_at,
            user_agent,
            client_name
          )
          values ($1, $2, now() + interval '30 days', $3, $4)
          returning expires_at::text as "expiresAt"
        `,
        [account.id, tokenHash, userAgent, clientName]
      );

      await client.query(
        `
          update app.customer_accounts
          set
            failed_login_attempts = 0,
            locked_until = null,
            last_login_at = now(),
            last_activity_at = now()
          where id = $1
        `,
        [account.id]
      );

      return sessionResult.rows[0];
    });

    return {
      customer: buildPublicCustomerAccount(account),
      expiresAt: session.expiresAt,
      token
    };
  }
);

app.post("/customer/auth/logout", async (request) => {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: true
    };
  }

  const tokenHash = hashSessionToken(token);

  await withDatabaseTransaction(async (client) => {
    await client.query(
      `
        update app.customer_accounts a
        set last_activity_at = now()
        from app.customer_sessions s
        where s.customer_account_id = a.id
          and s.token_hash = $1
          and s.revoked_at is null
          and s.expires_at > now()
          and a.is_active = true
      `,
      [tokenHash]
    );

    await client.query(
      `
        update app.customer_sessions
        set revoked_at = now()
        where token_hash = $1
          and revoked_at is null
      `,
      [tokenHash]
    );
  });

  return {
    ok: true
  };
});

app.get("/customer/auth/me", async (request, reply) => {
  const authSession = await requireCustomerAuthSession(request, reply);

  if (!authSession) {
    return null;
  }

  return {
    customer: authSession.customer,
    session: {
      expiresAt: authSession.session.expiresAt
    }
  };
});

app.patch<{ Body: CustomerProfilePayload }>(
  "/customer/profile",
  async (request, reply) => {
    const authSession = await requireCustomerAuthSession(request, reply);

    if (!authSession) {
      return null;
    }

    if (
      !request.body ||
      typeof request.body !== "object" ||
      Array.isArray(request.body) ||
      "phone" in request.body ||
      "phoneNormalized" in request.body
    ) {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_PROFILE_PAYLOAD"
      });
    }

    const displayName = normalizeCustomerProfileDisplayName(
      request.body.displayName
    );
    const email = normalizeCustomerProfileEmail(request.body.email);

    if (email === undefined) {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_PROFILE_PAYLOAD"
      });
    }

    const customer = await withDatabaseTransaction(async (client) => {
      const accountResult = await client.query<CustomerAccountRow>(
        `
          update app.customer_accounts
          set
            display_name = $2,
            email = $3,
            last_activity_at = now(),
            updated_at = now()
          where id = $1
            and is_active = true
          returning
            id::text as id,
            customer_id::text as "customerId",
            phone,
            phone_normalized as "phoneNormalized",
            email,
            display_name as "displayName"
        `,
        [authSession.customer.id, displayName, email]
      );
      const account = accountResult.rows[0];

      if (!account) {
        return null;
      }

      if (account.customerId) {
        await client.query(
          `
            update app.customers
            set
              name = $2,
              email = $3,
              updated_at = now()
            where id = $1
          `,
          [account.customerId, displayName, email]
        );
      }

      return buildPublicCustomerAccount(account);
    });

    if (!customer) {
      return reply.code(404).send({
        error: "CUSTOMER_ACCOUNT_NOT_FOUND"
      });
    }

    return {
      customer
    };
  }
);

app.get("/customer/orders", async (request, reply) => {
  const authSession = await requireCustomerAuthSession(request, reply);

  if (!authSession) {
    return null;
  }

  return queryDatabase<ApiCustomerOrderSummaryRow>(
    `
      select
        o.id,
        o.order_number as "orderNumber",
        o.status,
        o.source,
        o.total_price_minor as "totalPriceMinor",
        o.currency_code as "currencyCode",
        o.created_at::text as "createdAt",
        o.updated_at::text as "updatedAt",
        coalesce(order_delivery.delivery_mode, 'not-required') as "deliveryMode",
        coalesce(order_delivery.delivery_status, 'not_required') as "deliveryStatus",
        item_stats.items_count as "itemsCount",
        first_item.title as "firstItemTitle"
      from app.orders o
      left join lateral (
        select
          od.delivery_mode,
          od.delivery_status
        from app.order_delivery od
        where od.order_id = o.id
        order by od.id desc
        limit 1
      ) order_delivery on true
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
      where o.customer_account_id = $1
      order by o.created_at desc, o.id desc
    `,
    [authSession.customer.id]
  );
});

app.get("/customer-accounts", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return null;
  }

  const rows = await queryDatabase<ApiCustomerAccountListRow>(
    `
      select
        ca.id::text as id,
        ca.customer_id::text as "customerId",
        ca.phone,
        ca.phone_normalized as "phoneNormalized",
        ca.email,
        ca.display_name as "displayName",
        ca.is_active as "isActive",
        ca.last_login_at::text as "lastLoginAt",
        ca.last_activity_at::text as "lastActivityAt",
        ca.retention_locked as "retentionLocked",
        ca.retention_lock_reason as "retentionLockReason",
        ca.retention_locked_at::text as "retentionLockedAt",
        ca.retention_locked_by_user_id::text as "retentionLockedByUserId",
        ca.retention_lock_until::text as "retentionLockUntil",
        ca.created_at::text as "createdAt",
        ca.updated_at::text as "updatedAt",
        order_stats.active_orders_count as "activeOrdersCount",
        order_stats.total_orders_count as "totalOrdersCount"
      from app.customer_accounts ca
      left join lateral (
        select
          count(*)::int as total_orders_count,
          count(*) filter (
            where o.status not in (
              'completed',
              'done',
              'cancelled',
              'canceled',
              'closed',
              'archived'
            )
          )::int as active_orders_count
        from app.orders o
        where o.customer_account_id = ca.id
      ) order_stats on true
      order by ca.last_activity_at desc nulls last, ca.created_at desc
    `
  );

  return {
    customerAccounts: rows.map(buildCustomerAccountListItem)
  };
});

app.patch<{ Body: CustomerRetentionPayload; Params: { id: string } }>(
  "/customer-accounts/:id/retention",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return reply;
    }

    const customerAccountId = Number(request.params.id);

    if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_ACCOUNT_ID"
      });
    }

    if (typeof request.body?.retentionLocked !== "boolean") {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_RETENTION_PAYLOAD"
      });
    }

    const retentionLocked = request.body.retentionLocked;
    const retentionLockReason = normalizeRetentionLockReason(
      request.body.retentionLockReason
    );
    const retentionLockUntil = normalizeRetentionLockUntil(
      request.body.retentionLockUntil
    );

    if (retentionLockUntil === undefined) {
      return reply.code(400).send({
        error: "INVALID_CUSTOMER_RETENTION_PAYLOAD"
      });
    }

    const rows = await queryDatabase<ApiCustomerAccountRetentionRow>(
      retentionLocked
        ? `
          update app.customer_accounts
          set
            retention_locked = true,
            retention_lock_reason = $2,
            retention_locked_at = now(),
            retention_locked_by_user_id = $3,
            retention_lock_until = $4,
            updated_at = now()
          where id = $1
          returning
            id::text as id,
            customer_id::text as "customerId",
            phone,
            phone_normalized as "phoneNormalized",
            email,
            display_name as "displayName",
            last_activity_at::text as "lastActivityAt",
            retention_locked as "retentionLocked",
            retention_lock_reason as "retentionLockReason",
            retention_locked_at::text as "retentionLockedAt",
            retention_locked_by_user_id::text as "retentionLockedByUserId",
            retention_lock_until::text as "retentionLockUntil"
        `
        : `
          update app.customer_accounts
          set
            retention_locked = false,
            retention_lock_reason = null,
            retention_locked_at = null,
            retention_locked_by_user_id = null,
            retention_lock_until = null,
            updated_at = now()
          where id = $1
          returning
            id::text as id,
            customer_id::text as "customerId",
            phone,
            phone_normalized as "phoneNormalized",
            email,
            display_name as "displayName",
            last_activity_at::text as "lastActivityAt",
            retention_locked as "retentionLocked",
            retention_lock_reason as "retentionLockReason",
            retention_locked_at::text as "retentionLockedAt",
            retention_locked_by_user_id::text as "retentionLockedByUserId",
            retention_lock_until::text as "retentionLockUntil"
        `,
      retentionLocked
        ? [
            customerAccountId,
            retentionLockReason,
            authSession.user.id,
            retentionLockUntil
          ]
        : [customerAccountId]
    );
    const customerAccount = rows[0];

    if (!customerAccount) {
      return reply.code(404).send({
        error: "CUSTOMER_ACCOUNT_NOT_FOUND"
      });
    }

    return {
      customerAccount: buildCustomerAccountRetentionResponse(customerAccount)
    };
  }
);

app.post<{ Body: CheckoutOrderPayload }>(
  "/checkout/orders",
  async (request, reply) => {
    const validation = validateCheckoutOrderPayload(request.body);

    if (!validation.ok) {
      return reply.code(validation.statusCode).send(validation.body);
    }

    const hasCustomerBearerToken = Boolean(getBearerToken(request));
    const customerAuthSession = hasCustomerBearerToken
      ? await requireCustomerAuthSession(request, reply)
      : null;

    if (hasCustomerBearerToken && !customerAuthSession) {
      return null;
    }

    const customerAccountId = customerAuthSession?.customer.id ?? null;

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
        const existingOrderId = Number(existingOrder.rows[0].id);

        if (!Number.isInteger(existingOrderId) || existingOrderId <= 0) {
          throw new Error("Invalid checkout order id");
        }

        return {
          alreadyExists: true,
          id: existingOrderId,
          orderNumber: existingOrder.rows[0].order_number,
          uploadToken:
            generateCheckoutUploadToken(
              existingOrderId,
              existingOrder.rows[0].order_number
            ) ?? undefined
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
            customer_account_id,
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
            $3,
            $4::jsonb,
            $5,
            0,
            0,
            $6,
            'RUB',
            $7,
            null
          )
          returning id, order_number
        `,
        [
          sourceRef,
          customerId,
          customerAccountId,
          JSON.stringify(customerSnapshot),
          totalPriceMinor,
          totalPriceMinor,
          customerComment
        ]
      );
      const orderId = Number(orderResult.rows[0].id);
      const orderNumber = orderResult.rows[0].order_number;

      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new Error("Invalid checkout order id");
      }

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
            actor_customer_account_id,
            payload_json
          )
          values ($1, 'order_created', 'site', $2, $3::jsonb)
        `,
        [
          orderId,
          customerAccountId,
          JSON.stringify({
            customerAccountId,
            source: "checkout",
            sourceRef
          })
        ]
      );

      return {
        alreadyExists: false,
        id: orderId,
        orderNumber,
        uploadToken: generateCheckoutUploadToken(orderId, orderNumber) ?? undefined
      };
    });

    return result;
  }
);

app.post<{ Params: { id: string } }>(
  "/checkout/orders/:id/attachments",
  async (request, reply) => {
    if (!checkoutUploadTokenSecret) {
      return reply.code(503).send({
        error: "CHECKOUT_UPLOAD_NOT_CONFIGURED"
      });
    }

    const orderId = Number(request.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_ID"
      });
    }

    const uploadTokenHeader = request.headers["x-checkout-upload-token"];
    const uploadToken =
      typeof uploadTokenHeader === "string" ? uploadTokenHeader.trim() : "";
    const uploadTokenPayload = uploadToken
      ? verifyCheckoutUploadToken(uploadToken)
      : null;

    if (!uploadTokenPayload || uploadTokenPayload.orderId !== orderId) {
      return reply.code(401).send({
        error: "UNAUTHORIZED"
      });
    }

    const orderExists = await queryDatabase<{ exists: boolean }>(
      `
        select exists(
          select 1
          from app.orders
          where id = $1
            and order_number = $2
            and source = 'checkout'
        ) as exists
      `,
      [orderId, uploadTokenPayload.orderNumber]
    );

    if (!orderExists[0]?.exists) {
      return reply.code(404).send({
        error: "ORDER_NOT_FOUND"
      });
    }

    let file: MultipartFile | undefined;

    try {
      file = await request.file();
    } catch {
      return reply.code(400).send({
        error: "INVALID_ATTACHMENT_UPLOAD"
      });
    }

    if (!file) {
      return reply.code(400).send({
        error: "ATTACHMENT_FILE_REQUIRED"
      });
    }

    const originalFileName = sanitizeOriginalFileName(file.filename);
    const mimeType = file.mimetype || null;

    if (!isAllowedAttachmentMime(mimeType)) {
      return reply.code(415).send({
        error: "UNSUPPORTED_ATTACHMENT_TYPE"
      });
    }

    let fileBuffer: Buffer;

    try {
      fileBuffer = await file.toBuffer();
    } catch {
      return reply.code(413).send({
        error: "ATTACHMENT_TOO_LARGE"
      });
    }

    if (fileBuffer.length > maxOrderAttachmentFileSize) {
      return reply.code(413).send({
        error: "ATTACHMENT_TOO_LARGE"
      });
    }

    const attachmentType = normalizeAttachmentType(
      getMultipartFieldString(file.fields, "attachmentType") ?? "print_file"
    );
    const comment = getMultipartFieldString(file.fields, "comment");
    const storedFileName = `order-${orderId}-${Date.now()}-${randomBytes(8).toString(
      "hex"
    )}${getSafeFileExtension(originalFileName, mimeType)}`;
    const storagePath = path.join(orderAttachmentsDir, storedFileName);

    await mkdir(orderAttachmentsDir, {
      recursive: true
    });
    await writeFile(storagePath, fileBuffer);

    let insertedAttachment: ApiOrderAttachmentRow | null = null;

    try {
      insertedAttachment = await withDatabaseTransaction(async (client) => {
        const attachmentResult = await client.query<ApiOrderAttachmentRow>(
          `
            insert into app.order_attachments (
              order_id,
              source,
              attachment_type,
              original_file_name,
              stored_file_name,
              mime_type,
              file_size,
              storage_path,
              comment
            )
            values ($1, 'site', $2, $3, $4, $5, $6, $7, $8)
            returning
              id,
              order_id as "orderId",
              source,
              attachment_type as "attachmentType",
              original_file_name as "originalFileName",
              mime_type as "mimeType",
              file_size as "fileSize",
              storage_path as "storagePath",
              comment,
              created_at::text as "createdAt"
          `,
          [
            orderId,
            attachmentType,
            originalFileName,
            storedFileName,
            mimeType,
            fileBuffer.length,
            storagePath,
            comment
          ]
        );
        const attachment = attachmentResult.rows[0];

        await client.query(
          `
            insert into app.order_events (
              order_id,
              event_type,
              actor_type,
              payload_json
            )
            values ($1, 'attachment_added', 'site', $2::jsonb)
          `,
          [
            orderId,
            JSON.stringify({
              attachmentId: attachment.id,
              attachmentType,
              originalFileName,
              source: "checkout_upload"
            })
          ]
        );

        return attachment;
      });
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    return reply.code(201).send(buildOrderAttachmentResponse(insertedAttachment));
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
        coalesce(order_delivery.delivery_mode, 'not-required') as "deliveryMode",
        coalesce(order_delivery.delivery_status, 'not_required') as "deliveryStatus",
        item_stats.items_count as "itemsCount",
        first_item.title as "firstItemTitle"
      from app.orders o
      left join app.customers c on c.id = o.customer_id
      left join lateral (
        select
          od.delivery_mode,
          od.delivery_status
        from app.order_delivery od
        where od.order_id = o.id
        order by od.id desc
        limit 1
      ) order_delivery on true
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

app.post<{
  Body: CdekCalculationRequestPayload;
  Params: { id: string };
}>("/orders/:id/delivery/cdek/calculate", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return reply;
  }

  const orderId = Number(request.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return reply.code(400).send({
      error: "INVALID_ORDER_ID"
    });
  }

  const normalizedPayload = normalizeCdekCalculationRequestPayload(request.body);

  if (!normalizedPayload.ok) {
    return reply.code(400).send({
      error: normalizedPayload.error,
      message: normalizedPayload.message
    });
  }

  const order = (
    await queryDatabase<{ id: number | string; orderNumber: string }>(
      `
        select
          id,
          order_number as "orderNumber"
        from app.orders
        where id = $1
        limit 1
      `,
      [orderId]
    )
  )[0];

  if (!order) {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  const config = requireCdekProxyConfig(reply);

  if (!config) {
    return reply;
  }

  try {
    const responseBody = await postCdekJson(
      config,
      "/v2/calculator/tariff",
      buildCdekCalculationProviderPayload(normalizedPayload.value)
    );

    return {
      calculation: normalizeCdekCalculationResponse(
        responseBody,
        normalizedPayload.value
      ),
      order: {
        id: Number(order.id),
        orderNumber: order.orderNumber
      }
    };
  } catch (error) {
    return sendCdekProxyError(reply, error);
  }
});

app.patch<{
  Body: SaveCdekDeliveryPayload;
  Params: { id: string };
}>("/orders/:id/delivery/cdek", async (request, reply) => {
  const authSession = await requireRole(request, reply, ["manager", "admin"]);

  if (!authSession) {
    return reply;
  }

  const orderId = Number(request.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return reply.code(400).send({
      error: "INVALID_ORDER_ID"
    });
  }

  const validation = normalizeSaveCdekDeliveryPayload(request.body);

  if (!validation.ok) {
    return reply.code(400).send({
      error: validation.error,
      message: validation.message
    });
  }

  const result = await withDatabaseTransaction(async (client) => {
    const existingOrder = await client.query<{
      customerName: string | null;
      customerPhone: string | null;
      deliveryTotalMinor: number | string | null;
      discountTotalMinor: number | string | null;
      id: number;
      itemsTotalMinor: number | string;
      orderNumber: string;
      totalPriceMinor: number | string;
    }>(
      `
        select
          o.id,
          o.order_number as "orderNumber",
          o.items_total_minor as "itemsTotalMinor",
          o.delivery_total_minor as "deliveryTotalMinor",
          o.discount_total_minor as "discountTotalMinor",
          o.total_price_minor as "totalPriceMinor",
          c.name as "customerName",
          c.phone as "customerPhone"
        from app.orders o
        left join app.customers c on c.id = o.customer_id
        where o.id = $1
        for update of o
      `,
      [orderId]
    );
    const order = existingOrder.rows[0];

    if (!order) {
      return {
        status: "not_found" as const
      };
    }

    const existingItems = await client.query<OrderFinancialItemRow>(
      `
        select
          service_type as "serviceType",
          title,
          quantity::text as quantity,
          unit_price_minor::text as "unitPriceMinor",
          total_price_minor::text as "totalPriceMinor",
          params_json as "paramsJson",
          calculation_snapshot_json as "calculationSnapshotJson",
          sort_order as "sortOrder"
        from app.order_items
        where order_id = $1
        order by sort_order, id
      `,
      [orderId]
    );
    const existingFinancialSignature = buildStoredOrderFinancialSignature({
      deliveryTotalMinor: Number(order.deliveryTotalMinor ?? 0),
      items: existingItems.rows,
      totalPriceMinor: Number(order.totalPriceMinor)
    });
    const itemsTotalMinor = Number(order.itemsTotalMinor);
    const discountTotalMinor = Number(order.discountTotalMinor ?? 0);
    const nextDeliveryTotalMinor = validation.value.priceMinor;
    const nextTotalPriceMinor = Math.max(
      0,
      itemsTotalMinor + nextDeliveryTotalMinor - discountTotalMinor
    );
    const nextFinancialSignature = buildStoredOrderFinancialSignature({
      deliveryTotalMinor: nextDeliveryTotalMinor,
      items: existingItems.rows,
      totalPriceMinor: nextTotalPriceMinor
    });
    const hasFinancialChanges =
      existingFinancialSignature !== nextFinancialSignature;
    const ozonPayments = await client.query<ApiOrderPaymentRow>(
      `
        ${getOrderPaymentSelectSql()}
        where order_id = $1
          and provider = 'ozon_pay_checkout'
        order by created_at desc, id desc
        for update
      `,
      [orderId]
    );
    const hasFinalOzonPayment = ozonPayments.rows.some((payment) =>
      finalOzonPaymentStatuses.has(payment.status)
    );

    if (hasFinancialChanges && hasFinalOzonPayment) {
      return {
        status: "has_final_ozon_payment" as const
      };
    }

    const activeOzonPayments = ozonPayments.rows.filter((payment) =>
      activeOzonPaymentStatuses.has(payment.status)
    );
    const canceledOzonPaymentIds: number[] = [];

    if (hasFinancialChanges && activeOzonPayments.length > 0) {
      const config = getOzonAcquiringConfig();

      if (!config) {
        return {
          status: "ozon_not_configured" as const
        };
      }

      for (const payment of activeOzonPayments) {
        if (!payment.providerOrderId) {
          return {
            status: "ozon_provider_order_id_required" as const
          };
        }

        const cancelResult = await requestOzonCancelOrder(
          config,
          payment.providerOrderId
        );

        if (!cancelResult.ok) {
          request.log.warn(
            {
              endpoint: "/v1/cancelOrder",
              ozonCode: cancelResult.diagnostic.ozonCode,
              ozonDetails: cancelResult.diagnostic.ozonDetails,
              ozonMessage: cancelResult.diagnostic.ozonMessage,
              ozonStatus: cancelResult.diagnostic.ozonStatus,
              paymentId: payment.id
            },
            "Ozon Pay Checkout cancelOrder failed before CDEK delivery update"
          );

          return {
            diagnostic: cancelResult.diagnostic,
            status: "ozon_cancel_failed" as const
          };
        }

        await client.query(
          `
            update app.order_payments
            set
              status = 'canceled',
              ozon_status = 'STATUS_CANCELED',
              canceled_at = now(),
              last_error_code = null,
              last_error_message = null,
              status_response_json = $3::jsonb,
              updated_at = now()
            where id = $1
              and order_id = $2
              and provider = 'ozon_pay_checkout'
          `,
          [
            payment.id,
            orderId,
            JSON.stringify(sanitizeOzonPayload(cancelResult.responseBody))
          ]
        );
        await client.query(
          `
            insert into app.order_events (
              order_id,
              event_type,
              actor_type,
              actor_user_id,
              actor_name,
              payload_json
            )
            values ($1, 'payment_canceled', 'manager', $2, $3, $4::jsonb)
          `,
          [
            orderId,
            authSession.user.id,
            authSession.user.displayName ?? authSession.user.login,
            JSON.stringify({
              newStatus: "canceled",
              oldStatus: payment.status,
              paymentId: Number(payment.id),
              provider: "ozon_pay_checkout",
              providerExtId: payment.providerExtId,
              providerOrderId: payment.providerOrderId,
              reason: "cdek_delivery_financial_change"
            })
          ]
        );
        canceledOzonPaymentIds.push(Number(payment.id));
      }
    }

    const providerPayload = buildCdekDeliveryProviderPayload(validation.value);
    const recipientName =
      validation.value.recipientName ?? order.customerName ?? null;
    const recipientPhone =
      validation.value.recipientPhone ?? order.customerPhone ?? null;
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
            delivery_mode = 'cdek',
            delivery_status = 'pending',
            recipient_name = $2,
            recipient_phone = $3,
            address_text = $4,
            comment = $5,
            price_minor = $6,
            currency_code = 'RUB',
            provider_payload_json = $7::jsonb
          where order_id = $1
        `,
        [
          orderId,
          recipientName,
          recipientPhone,
          validation.value.deliveryPointAddress,
          validation.value.comment,
          validation.value.priceMinor,
          JSON.stringify(providerPayload)
        ]
      );
    } else {
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
            'cdek',
            'pending',
            $2,
            $3,
            $4,
            $5,
            $6,
            'RUB',
            $7::jsonb
          )
        `,
        [
          orderId,
          recipientName,
          recipientPhone,
          validation.value.deliveryPointAddress,
          validation.value.comment,
          validation.value.priceMinor,
          JSON.stringify(providerPayload)
        ]
      );
    }

    await client.query(
      `
        update app.orders
        set
          delivery_total_minor = $2,
          total_price_minor = $3,
          updated_at = now()
        where id = $1
      `,
      [orderId, nextDeliveryTotalMinor, nextTotalPriceMinor]
    );

    await client.query(
      `
        insert into app.order_events (
          order_id,
          event_type,
          actor_type,
          actor_user_id,
          actor_name,
          payload_json
        )
        values ($1, 'order_updated', 'manager', $2, $3, $4::jsonb)
      `,
      [
        orderId,
        authSession.user.id,
        authSession.user.displayName ?? authSession.user.login,
        JSON.stringify({
          deliveryMode: "cdek",
          deliveryPointCode: validation.value.deliveryPointCode,
          hasFinancialChanges,
          payment: {
            activePaymentsCanceled: canceledOzonPaymentIds.length > 0,
            canceledPaymentIds: canceledOzonPaymentIds,
            financialChanged: hasFinancialChanges
          },
          priceMinor: validation.value.priceMinor,
          source: "cdek_delivery_patch",
          tariffCode: validation.value.tariffCode
        })
      ]
    );

    return {
      delivery: {
        addressText: validation.value.deliveryPointAddress,
        currencyCode: validation.value.currencyCode,
        deliveryMode: "cdek",
        deliveryStatus: "pending",
        priceMinor: validation.value.priceMinor,
        providerPayload,
        recipientName,
        recipientPhone
      },
      id: order.id,
      orderNumber: order.orderNumber,
      payment: {
        activePaymentsCanceled: canceledOzonPaymentIds.length > 0,
        canceledPaymentIds: canceledOzonPaymentIds,
        deliveryNeedsReview: false,
        financialChanged: hasFinancialChanges
      },
      status: "updated" as const,
      totalPriceMinor: nextTotalPriceMinor,
      updated: true
    };
  });

  if (result.status === "not_found") {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  if (result.status === "has_final_ozon_payment") {
    return reply.code(409).send({
      error: "ORDER_HAS_FINAL_OZON_PAYMENT",
      message: "Order has a final Ozon payment. CDEK delivery cannot change order total."
    });
  }

  if (result.status === "ozon_not_configured") {
    return sendOzonAcquiringNotConfigured(reply);
  }

  if (result.status === "ozon_provider_order_id_required") {
    return reply.code(409).send({
      error: "OZON_PAYMENT_PROVIDER_ORDER_ID_REQUIRED",
      message: "Ozon provider order id is required before payment cancellation."
    });
  }

  if (result.status === "ozon_cancel_failed") {
    return reply.code(502).send({
      error: "OZON_CANCEL_ORDER_FAILED",
      ozonCode: result.diagnostic.ozonCode,
      ozonDetails: result.diagnostic.ozonDetails,
      ozonMessage: result.diagnostic.ozonMessage,
      ozonStatus: result.diagnostic.ozonStatus
    });
  }

  return result;
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
        o.customer_account_id::text as "customerAccountId",
        ca.phone as "customerAccountPhone",
        ca.phone_normalized as "customerAccountPhoneNormalized",
        ca.email as "customerAccountEmail",
        ca.display_name as "customerAccountDisplayName",
        ca.last_activity_at::text as "customerAccountLastActivityAt",
        ca.retention_locked as "customerAccountRetentionLocked",
        ca.retention_lock_reason as "customerAccountRetentionLockReason",
        ca.retention_locked_at::text as "customerAccountRetentionLockedAt",
        ca.retention_locked_by_user_id::text as "customerAccountRetentionLockedByUserId",
        ca.retention_lock_until::text as "customerAccountRetentionLockUntil",
        o.total_price_minor as "totalPriceMinor",
        o.currency_code as "currencyCode",
        o.customer_comment as "customerComment",
        o.created_at::text as "createdAt",
        o.updated_at::text as "updatedAt",
        c.name as "customerName",
        c.phone as "customerPhone",
        c.email as "customerEmail",
        coalesce(order_delivery.delivery_mode, 'not-required') as "deliveryMode",
        coalesce(order_delivery.delivery_status, 'not_required') as "deliveryStatus",
        item_stats.items_count as "itemsCount",
        first_item.title as "firstItemTitle"
      from app.orders o
      left join app.customers c on c.id = o.customer_id
      left join app.customer_accounts ca on ca.id = o.customer_account_id
      left join lateral (
        select
          od.delivery_mode,
          od.delivery_status
        from app.order_delivery od
        where od.order_id = o.id
        order by od.id desc
        limit 1
      ) order_delivery on true
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

  const [delivery, items, events] = await Promise.all([
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
          provider_payload_json as "providerPayload",
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
    ),
    queryDatabase<ApiOrderEventRow>(
      `
        select
          id,
          event_type as "eventType",
          actor_type as "actorType",
          actor_name as "actorName",
          payload_json as payload,
          created_at::text as "createdAt"
        from app.order_events
        where order_id = $1
          and event_type in (
            'order_created',
            'attachment_added',
            'order_status_changed',
            'comment_added'
          )
        order by created_at desc, id desc
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
    customerAccount: order.customerAccountId
      ? {
          displayName: order.customerAccountDisplayName,
          email: order.customerAccountEmail,
          id: Number(order.customerAccountId),
          lastActivityAt: order.customerAccountLastActivityAt,
          phone: order.customerAccountPhone,
          phoneNormalized: order.customerAccountPhoneNormalized,
          retentionLocked: Boolean(order.customerAccountRetentionLocked),
          retentionLockReason: order.customerAccountRetentionLockReason,
          retentionLockedAt: order.customerAccountRetentionLockedAt,
          retentionLockedByUserId:
            order.customerAccountRetentionLockedByUserId === null
              ? null
              : Number(order.customerAccountRetentionLockedByUserId),
          retentionLockUntil: order.customerAccountRetentionLockUntil
        }
      : null,
    delivery: delivery[0] ?? null,
    events,
    items
  };
});

app.patch<{
  Body: UpdateOrderStatusPayload;
  Params: { id: string };
}>("/orders/:id/status", async (request, reply) => {
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

  if (!isRecord(request.body) || typeof request.body.status !== "string") {
    return reply.code(400).send({
      error: "INVALID_ORDER_STATUS_PAYLOAD"
    });
  }

  const nextStatus = request.body.status.trim();

  if (!editableOrderStatuses.has(nextStatus)) {
    return reply.code(400).send({
      error: "INVALID_ORDER_STATUS"
    });
  }

  const comment = normalizeManagerWorkflowComment(request.body.comment);

  if (comment === undefined) {
    return reply.code(400).send({
      error: "INVALID_ORDER_STATUS_PAYLOAD"
    });
  }

  const result = await withDatabaseTransaction(async (client) => {
    const existingOrder = await client.query<{
      id: number;
      order_number: string;
      status: string;
    }>(
      `
        select id, order_number, status
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

    await client.query(
      `
        update app.orders
        set
          status = $2,
          updated_at = now()
        where id = $1
      `,
      [orderId, nextStatus]
    );

    const eventResult = await client.query<ApiOrderEventRow>(
      `
        insert into app.order_events (
          order_id,
          event_type,
          actor_type,
          actor_user_id,
          actor_name,
          payload_json
        )
        values ($1, 'order_status_changed', 'manager', $2, $3, $4::jsonb)
        returning
          id,
          event_type as "eventType",
          actor_type as "actorType",
          actor_name as "actorName",
          payload_json as payload,
          created_at::text as "createdAt"
      `,
      [
        orderId,
        authSession.user.id,
        authSession.user.displayName ?? authSession.user.login,
        JSON.stringify({
          comment,
          newStatus: nextStatus,
          oldStatus: order.status
        })
      ]
    );

    return {
      event: eventResult.rows[0],
      id: order.id,
      orderNumber: order.order_number,
      status: nextStatus
    };
  });

  if (!result) {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  return result;
});

app.post<{
  Body: CreateOrderCommentPayload;
  Params: { id: string };
}>("/orders/:id/comments", async (request, reply) => {
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

  if (!isRecord(request.body)) {
    return reply.code(400).send({
      error: "INVALID_ORDER_COMMENT_PAYLOAD"
    });
  }

  const comment = normalizeManagerWorkflowComment(request.body.comment);

  if (!comment) {
    return reply.code(400).send({
      error: "INVALID_ORDER_COMMENT"
    });
  }

  const result = await withDatabaseTransaction(async (client) => {
    const existingOrder = await client.query<{
      id: number;
      order_number: string;
    }>(
      `
        select id, order_number
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

    await client.query(
      `
        update app.orders
        set
          manager_comment = $2,
          updated_at = now()
        where id = $1
      `,
      [orderId, comment]
    );

    const eventResult = await client.query<ApiOrderEventRow>(
      `
        insert into app.order_events (
          order_id,
          event_type,
          actor_type,
          actor_user_id,
          actor_name,
          payload_json
        )
        values ($1, 'comment_added', 'manager', $2, $3, $4::jsonb)
        returning
          id,
          event_type as "eventType",
          actor_type as "actorType",
          actor_name as "actorName",
          payload_json as payload,
          created_at::text as "createdAt"
      `,
      [
        orderId,
        authSession.user.id,
        authSession.user.displayName ?? authSession.user.login,
        JSON.stringify({
          comment
        })
      ]
    );

    return {
      event: eventResult.rows[0],
      id: order.id,
      orderNumber: order.order_number
    };
  });

  if (!result) {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  return result;
});

app.get<{ Params: { id: string } }>(
  "/orders/:id/payments",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return reply;
    }

    const orderId = Number(request.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_ID"
      });
    }

    const orderExists = await queryDatabase<{ exists: boolean }>(
      "select exists(select 1 from app.orders where id = $1) as exists",
      [orderId]
    );

    if (!orderExists[0]?.exists) {
      return reply.code(404).send({
        error: "ORDER_NOT_FOUND"
      });
    }

    const payments = await queryDatabase<ApiOrderPaymentRow>(
      `
        ${getOrderPaymentSelectSql()}
        where order_id = $1
        order by created_at desc, id desc
      `,
      [orderId]
    );

    return payments.map(buildOrderPaymentResponse);
  }
);

app.post<{ Params: { id: string } }>(
  "/orders/:id/payments/ozon",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return reply;
    }

    const config = getOzonAcquiringConfig();

    if (!config) {
      return sendOzonAcquiringNotConfigured(reply);
    }

    const orderId = Number(request.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_ID"
      });
    }

    const orders = await queryDatabase<OzonOrderPaymentOrderRow>(
      `
        select
          o.id,
          o.order_number as "orderNumber",
          o.source,
          o.total_price_minor as "totalPriceMinor",
          o.currency_code as "currencyCode",
          c.email as "customerEmail",
          c.phone as "customerPhone",
          coalesce(
            order_delivery.provider_payload_json->>'needsReview',
            'false'
          ) = 'true' as "deliveryNeedsReview",
          exists (
            select 1
            from app.order_items oi
            where oi.order_id = o.id
              and oi.service_type in ('dtf_print', 'dtf-print')
          ) as "isDtf"
        from app.orders o
        left join app.customers c on c.id = o.customer_id
        left join lateral (
          select od.provider_payload_json
          from app.order_delivery od
          where od.order_id = o.id
          order by od.id desc
          limit 1
        ) order_delivery on true
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

    if (!order.orderNumber) {
      return reply.code(400).send({
        error: "ORDER_NUMBER_REQUIRED"
      });
    }

    if (order.currencyCode !== "RUB" || order.totalPriceMinor <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_PAYMENT_AMOUNT"
      });
    }

    if (order.deliveryNeedsReview) {
      return reply.code(409).send({
        error: "DELIVERY_NEEDS_REVIEW",
        message: "Проверьте и сохраните доставку перед созданием оплаты."
      });
    }

    const existingPayments = await queryDatabase<ApiOrderPaymentRow>(
      `
        ${getOrderPaymentSelectSql()}
        where order_id = $1
          and provider = 'ozon_pay_checkout'
        order by created_at desc, id desc
      `,
      [orderId]
    );
    const existingBlockingPayment = existingPayments.find(
      (payment) =>
        activeOzonPaymentStatuses.has(payment.status) ||
        finalOzonPaymentStatuses.has(payment.status)
    );

    if (existingBlockingPayment) {
      return {
        payment: buildOrderPaymentResponse(existingBlockingPayment)
      };
    }

    const providerExtId = buildOzonProviderExtId(
      order.orderNumber,
      existingPayments
    );
    const existingExtIdPayments = await queryDatabase<ApiOrderPaymentRow>(
      `
        ${getOrderPaymentSelectSql()}
        where provider = 'ozon_pay_checkout'
          and provider_ext_id = $1
        limit 1
      `,
      [providerExtId]
    );
    const existingExtIdPayment = existingExtIdPayments[0];

    if (existingExtIdPayment) {
      return {
        payment: buildOrderPaymentResponse(existingExtIdPayment)
      };
    }

    const createResult = await requestOzonCreateOrder(
      config,
      order,
      providerExtId
    );

    if (!createResult.ok) {
      request.log.warn(
        {
          endpoint: "/v1/createOrder",
          orderNumber: order.orderNumber,
          ozonCode: createResult.diagnostic.ozonCode,
          ozonDetails: createResult.diagnostic.ozonDetails,
          ozonMessage: createResult.diagnostic.ozonMessage,
          ozonStatus: createResult.diagnostic.ozonStatus
        },
        "Ozon Pay Checkout createOrder failed"
      );
      return reply.code(502).send({
        error: "OZON_CREATE_ORDER_FAILED",
        ozonCode: createResult.diagnostic.ozonCode,
        ozonDetails: createResult.diagnostic.ozonDetails,
        ozonMessage: createResult.diagnostic.ozonMessage,
        ozonStatus: createResult.diagnostic.ozonStatus
      });
    }

    const insertedPayment = await withDatabaseTransaction(async (client) => {
      return insertOzonCreatedPayment({
        actorName: authSession.user.displayName ?? authSession.user.login,
        actorUserId: authSession.user.id,
        client,
        createOrderRequest: createResult.createOrderRequest,
        order,
        orderId,
        providerExtId,
        responseBody: createResult.responseBody
      });
    });

    return {
      payment: buildOrderPaymentResponse(insertedPayment)
    };
  }
);

app.post<{ Params: { id: string; paymentId: string } }>(
  "/orders/:id/payments/:paymentId/sync",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return reply;
    }

    const config = getOzonAcquiringConfig();

    if (!config) {
      return sendOzonAcquiringNotConfigured(reply);
    }

    const orderId = Number(request.params.id);
    const paymentId = Number(request.params.paymentId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_ID"
      });
    }

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return reply.code(400).send({
        error: "INVALID_PAYMENT_ID"
      });
    }

    const payments = await queryDatabase<ApiOrderPaymentRow>(
      `
        ${getOrderPaymentSelectSql()}
        where id = $1
          and order_id = $2
          and provider = 'ozon_pay_checkout'
        limit 1
      `,
      [paymentId, orderId]
    );
    const payment = payments[0];

    if (!payment) {
      return reply.code(404).send({
        error: "PAYMENT_NOT_FOUND"
      });
    }

    const statusRequest = {
      extId: payment.providerExtId ?? "",
      id: payment.providerOrderId ?? ""
    };
    const requestSign = signOzonGetOrderStatusRequest(config, statusRequest);
    const requestBody = {
      ...statusRequest,
      accessKey: config.accessKey,
      requestSign
    };
    const response = await fetch(`${config.baseUrl}/v1/getOrderStatus`, {
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const responseText = await response.text();
    let responseBody: unknown = {};

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = {
        raw: responseText
      };
    }

    if (!response.ok) {
      request.log.warn(
        {
          paymentId,
          statusCode: response.status
        },
        "Ozon Pay Checkout getOrderStatus failed"
      );
      return reply.code(502).send({
        error: "OZON_GET_ORDER_STATUS_FAILED"
      });
    }

    const ozonStatus = getNestedString(responseBody, [
      ["order", "status"],
      ["status"]
    ]);
    const mappedStatus = mapOzonOrderStatus(ozonStatus);
    const paidAt = getOzonTimestamp(responseBody, [
      ["order", "paidAt"],
      ["paidAt"],
      ["payment", "paidAt"]
    ]);
    const canceledAt = getOzonTimestamp(responseBody, [
      ["order", "canceledAt"],
      ["canceledAt"]
    ]);
    const refundedAt = getOzonTimestamp(responseBody, [
      ["order", "refundedAt"],
      ["refundedAt"]
    ]);
    const expiresAt = getOzonTimestamp(responseBody, [
      ["order", "expiresAt"],
      ["expiresAt"]
    ]);

    const updatedPayment = await withDatabaseTransaction(async (client) => {
      const paymentResult = await client.query<ApiOrderPaymentRow>(
        `
          update app.order_payments
          set
            status = $3,
            ozon_status = $4,
            status_response_json = $5::jsonb,
            paid_at = coalesce($6::timestamptz, paid_at),
            canceled_at = coalesce($7::timestamptz, canceled_at),
            refunded_at = coalesce($8::timestamptz, refunded_at),
            expires_at = coalesce($9::timestamptz, expires_at),
            updated_at = now()
          where id = $1
            and order_id = $2
            and provider = 'ozon_pay_checkout'
          returning
            id::text as id,
            provider,
            provider_order_id as "providerOrderId",
            provider_ext_id as "providerExtId",
            amount_minor::text as "amountMinor",
            currency_code as "currencyCode",
            status,
            ozon_status as "ozonStatus",
            pay_link as "payLink",
            payment_method as "paymentMethod",
            test_mode as "testMode",
            paid_at::text as "paidAt",
            canceled_at::text as "canceledAt",
            refunded_at::text as "refundedAt",
            expires_at::text as "expiresAt",
            last_error_code as "lastErrorCode",
            last_error_message as "lastErrorMessage",
            created_at::text as "createdAt",
            updated_at::text as "updatedAt"
        `,
        [
          paymentId,
          orderId,
          mappedStatus,
          ozonStatus,
          JSON.stringify(sanitizeOzonPayload(responseBody)),
          paidAt,
          canceledAt,
          refundedAt,
          expiresAt
        ]
      );
      const updated = paymentResult.rows[0];

      await client.query(
        `
          insert into app.order_events (
            order_id,
            event_type,
            actor_type,
            actor_user_id,
            actor_name,
            payload_json
          )
          values ($1, 'payment_status_updated', 'manager', $2, $3, $4::jsonb)
        `,
        [
          orderId,
          authSession.user.id,
          authSession.user.displayName ?? authSession.user.login,
          JSON.stringify({
            newStatus: updated.status,
            oldStatus: payment.status,
            paymentId,
            provider: "ozon_pay_checkout",
            providerExtId: payment.providerExtId,
            providerOrderId: payment.providerOrderId
          })
        ]
      );

      return updated;
    });

    return {
      payment: buildOrderPaymentResponse(updatedPayment)
    };
  }
);

app.post<{ Params: { id: string; paymentId: string } }>(
  "/orders/:id/payments/:paymentId/cancel",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return reply;
    }

    const config = getOzonAcquiringConfig();

    if (!config) {
      return sendOzonAcquiringNotConfigured(reply);
    }

    const orderId = Number(request.params.id);
    const paymentId = Number(request.params.paymentId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.code(400).send({
        error: "INVALID_ORDER_ID"
      });
    }

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return reply.code(400).send({
        error: "INVALID_PAYMENT_ID"
      });
    }

    const payments = await queryDatabase<ApiOrderPaymentRow>(
      `
        ${getOrderPaymentSelectSql()}
        where id = $1
          and order_id = $2
          and provider = 'ozon_pay_checkout'
        limit 1
      `,
      [paymentId, orderId]
    );
    const payment = payments[0];

    if (!payment) {
      return reply.code(404).send({
        error: "PAYMENT_NOT_FOUND"
      });
    }

    if (terminalOzonPaymentStatuses.has(payment.status)) {
      return {
        payment: buildOrderPaymentResponse(payment)
      };
    }

    if (!activeOzonPaymentStatuses.has(payment.status)) {
      return reply.code(409).send({
        error: "OZON_PAYMENT_NOT_CANCELABLE",
        message: "Эту Ozon-оплату нельзя отменить."
      });
    }

    if (!payment.providerOrderId) {
      return reply.code(409).send({
        error: "OZON_PAYMENT_PROVIDER_ORDER_ID_REQUIRED",
        message: "Не найден идентификатор заказа Ozon для отмены оплаты."
      });
    }

    const cancelRequest = {
      id: payment.providerOrderId
    };
    const requestSign = signOzonCancelOrderRequest(config, cancelRequest);
    const requestBody = {
      ...cancelRequest,
      accessKey: config.accessKey,
      requestSign
    };
    const response = await fetch(`${config.baseUrl}/v1/cancelOrder`, {
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const responseText = await response.text();
    let responseBody: unknown = {};

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = {
        raw: responseText
      };
    }

    if (!response.ok) {
      const ozonError = buildOzonErrorDiagnostic(
        response.status,
        responseBody,
        responseText
      );

      request.log.warn(
        {
          endpoint: "/v1/cancelOrder",
          ozonCode: ozonError.ozonCode,
          ozonDetails: ozonError.ozonDetails,
          ozonMessage: ozonError.ozonMessage,
          ozonStatus: ozonError.ozonStatus,
          paymentId
        },
        "Ozon Pay Checkout cancelOrder failed"
      );
      return reply.code(502).send({
        error: "OZON_CANCEL_ORDER_FAILED",
        ozonCode: ozonError.ozonCode,
        ozonDetails: ozonError.ozonDetails,
        ozonMessage: ozonError.ozonMessage,
        ozonStatus: ozonError.ozonStatus
      });
    }

    const updatedPayment = await withDatabaseTransaction(async (client) => {
      const paymentResult = await client.query<ApiOrderPaymentRow>(
        `
          update app.order_payments
          set
            status = 'canceled',
            ozon_status = 'STATUS_CANCELED',
            canceled_at = now(),
            last_error_code = null,
            last_error_message = null,
            status_response_json = $3::jsonb,
            updated_at = now()
          where id = $1
            and order_id = $2
            and provider = 'ozon_pay_checkout'
          returning
            id::text as id,
            provider,
            provider_order_id as "providerOrderId",
            provider_ext_id as "providerExtId",
            amount_minor::text as "amountMinor",
            currency_code as "currencyCode",
            status,
            ozon_status as "ozonStatus",
            pay_link as "payLink",
            payment_method as "paymentMethod",
            test_mode as "testMode",
            paid_at::text as "paidAt",
            canceled_at::text as "canceledAt",
            refunded_at::text as "refundedAt",
            expires_at::text as "expiresAt",
            last_error_code as "lastErrorCode",
            last_error_message as "lastErrorMessage",
            created_at::text as "createdAt",
            updated_at::text as "updatedAt"
        `,
        [
          paymentId,
          orderId,
          JSON.stringify(sanitizeOzonPayload(responseBody))
        ]
      );
      const updated = paymentResult.rows[0];

      await client.query(
        `
          insert into app.order_events (
            order_id,
            event_type,
            actor_type,
            actor_user_id,
            actor_name,
            payload_json
          )
          values ($1, 'payment_canceled', 'manager', $2, $3, $4::jsonb)
        `,
        [
          orderId,
          authSession.user.id,
          authSession.user.displayName ?? authSession.user.login,
          JSON.stringify({
            newStatus: updated.status,
            oldStatus: payment.status,
            paymentId,
            provider: "ozon_pay_checkout",
            providerExtId: payment.providerExtId,
            providerOrderId: payment.providerOrderId
          })
        ]
      );

      return updated;
    });

    return {
      payment: buildOrderPaymentResponse(updatedPayment)
    };
  }
);

app.post<{ Body: unknown }>("/payments/ozon/webhook", async (request, reply) => {
  const config = getOzonAcquiringConfig();

  if (!config) {
    return sendOzonAcquiringNotConfigured(reply);
  }

  if (!isRecord(request.body)) {
    return reply.code(400).send({
      error: "INVALID_OZON_WEBHOOK_PAYLOAD"
    });
  }

  const requestSign = getNestedString(request.body, [
    ["requestSign"],
    ["request_sign"]
  ]);
  const orderID = getNestedString(request.body, [
    ["orderID"],
    ["orderId"],
    ["order", "id"]
  ]);
  const transactionID = getNestedString(request.body, [
    ["transactionID"],
    ["transactionId"],
    ["transactionUID"],
    ["transactionUid"],
    ["transaction", "id"]
  ]);
  const extOrderID = getNestedString(request.body, [
    ["extOrderID"],
    ["extOrderId"],
    ["extId"],
    ["order", "extId"]
  ]);
  const amount = getNestedString(request.body, [
    ["amount", "value"],
    ["amount"],
    ["payment", "amount", "value"]
  ]);
  const currencyCode = getNestedString(request.body, [
    ["amount", "currencyCode"],
    ["currencyCode"],
    ["payment", "amount", "currencyCode"]
  ]);

  if (
    !requestSign ||
    !orderID ||
    !transactionID ||
    !extOrderID ||
    !amount ||
    !currencyCode
  ) {
    return reply.code(400).send({
      error: "INVALID_OZON_WEBHOOK_PAYLOAD"
    });
  }

  const expectedSign = signOzonWebhookPayload(config, {
    amount,
    currencyCode,
    extOrderID,
    orderID,
    transactionID
  });

  if (!safeCompareSignature(requestSign, expectedSign)) {
    return reply.code(401).send({
      error: "INVALID_OZON_WEBHOOK_SIGNATURE"
    });
  }

  const existingPayments = await queryDatabase<
    ApiOrderPaymentRow & { orderId: number | string }
  >(
    `
      select
        id::text as id,
        order_id::text as "orderId",
        provider,
        provider_order_id as "providerOrderId",
        provider_ext_id as "providerExtId",
        amount_minor::text as "amountMinor",
        currency_code as "currencyCode",
        status,
        ozon_status as "ozonStatus",
        pay_link as "payLink",
        payment_method as "paymentMethod",
        test_mode as "testMode",
        paid_at::text as "paidAt",
        canceled_at::text as "canceledAt",
        refunded_at::text as "refundedAt",
        expires_at::text as "expiresAt",
        last_error_code as "lastErrorCode",
        last_error_message as "lastErrorMessage",
        created_at::text as "createdAt",
        updated_at::text as "updatedAt"
      from app.order_payments
      where provider = 'ozon_pay_checkout'
        and provider_ext_id = $1
      limit 1
    `,
    [extOrderID]
  );
  const payment = existingPayments[0];

  if (!payment) {
    request.log.warn(
      {
        providerExtId: extOrderID
      },
      "Ozon webhook payment was not found"
    );
    return {
      ignored: true,
      ok: true
    };
  }

  const ozonStatus = getNestedString(request.body, [
    ["status"],
    ["paymentStatus"],
    ["transactionStatus"]
  ]);
  const mappedStatus = mapOzonWebhookStatus(ozonStatus);
  const paymentMethod = getNestedString(request.body, [
    ["paymentMethod"],
    ["payment", "method"]
  ]);
  const testMode = getNestedBoolean(request.body, [
    ["testMode"],
    ["payment", "testMode"]
  ]);
  const lastErrorCode = getNestedString(request.body, [
    ["errorCode"],
    ["payment", "errorCode"]
  ]);
  const lastErrorMessage = getNestedString(request.body, [
    ["errorMessage"],
    ["rejectionReason"],
    ["payment", "errorMessage"]
  ]);
  const amountMinor = parseOzonAmountMinor(amount);
  const paidAt =
    ozonStatus === "Completed" ? new Date().toISOString() : payment.paidAt;

  await withDatabaseTransaction(async (client) => {
    await client.query(
      `
        update app.order_payments
        set
          provider_order_id = coalesce(provider_order_id, $3),
          provider_transaction_id = $4,
          amount_minor = coalesce($5::bigint, amount_minor),
          status = $6,
          ozon_status = $7,
          payment_method = coalesce($8, payment_method),
          test_mode = coalesce($9::boolean, test_mode),
          paid_at = coalesce($10::timestamptz, paid_at),
          last_error_code = $11,
          last_error_message = $12,
          last_webhook_json = $13::jsonb,
          updated_at = now()
        where id = $1
          and order_id = $2
      `,
      [
        payment.id,
        payment.orderId,
        orderID,
        transactionID,
        amountMinor,
        mappedStatus,
        ozonStatus,
        paymentMethod,
        testMode,
        paidAt,
        lastErrorCode,
        lastErrorMessage,
        JSON.stringify(sanitizeOzonPayload(request.body))
      ]
    );

    await client.query(
      `
        insert into app.order_events (
          order_id,
          event_type,
          actor_type,
          payload_json
        )
        values ($1, 'payment_webhook_received', 'system', $2::jsonb)
      `,
      [
        payment.orderId,
        JSON.stringify({
          newStatus: mappedStatus,
          oldStatus: payment.status,
          paymentId: Number(payment.id),
          provider: "ozon_pay_checkout",
          providerExtId: extOrderID,
          providerOrderId: orderID,
          transactionID
        })
      ]
    );

    if (ozonStatus === "Rejected") {
      await client.query(
        `
          insert into app.order_events (
            order_id,
            event_type,
            actor_type,
            payload_json
          )
          values ($1, 'payment_failed', 'system', $2::jsonb)
        `,
        [
          payment.orderId,
          JSON.stringify({
            errorCode: lastErrorCode,
            errorMessage: lastErrorMessage,
            paymentId: Number(payment.id),
            provider: "ozon_pay_checkout",
            providerExtId: extOrderID,
            providerOrderId: orderID,
            transactionID
          })
        ]
      );
    }
  });

  return {
    ok: true
  };
});

app.get<{ Params: { id: string } }>(
  "/orders/:id/attachments",
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

    const orderExists = await queryDatabase<{ exists: boolean }>(
      "select exists(select 1 from app.orders where id = $1) as exists",
      [orderId]
    );

    if (!orderExists[0]?.exists) {
      return reply.code(404).send({
        error: "ORDER_NOT_FOUND"
      });
    }

    const attachments = await queryDatabase<ApiOrderAttachmentRow>(
      `
        select
          id,
          order_id as "orderId",
          source,
          attachment_type as "attachmentType",
          original_file_name as "originalFileName",
          mime_type as "mimeType",
          file_size as "fileSize",
          storage_path as "storagePath",
          comment,
          created_at::text as "createdAt"
        from app.order_attachments
        where order_id = $1
        order by created_at desc, id desc
      `,
      [orderId]
    );

    return attachments.map(buildOrderAttachmentResponse);
  }
);

app.post<{ Params: { id: string } }>(
  "/orders/:id/attachments",
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

    const orderExists = await queryDatabase<{ exists: boolean }>(
      "select exists(select 1 from app.orders where id = $1) as exists",
      [orderId]
    );

    if (!orderExists[0]?.exists) {
      return reply.code(404).send({
        error: "ORDER_NOT_FOUND"
      });
    }

    let file: MultipartFile | undefined;

    try {
      file = await request.file();
    } catch {
      return reply.code(400).send({
        error: "INVALID_ATTACHMENT_UPLOAD"
      });
    }

    if (!file) {
      return reply.code(400).send({
        error: "ATTACHMENT_FILE_REQUIRED"
      });
    }

    const originalFileName = sanitizeOriginalFileName(file.filename);
    const mimeType = file.mimetype || null;

    if (!isAllowedAttachmentMime(mimeType)) {
      return reply.code(415).send({
        error: "UNSUPPORTED_ATTACHMENT_TYPE"
      });
    }

    let fileBuffer: Buffer;

    try {
      fileBuffer = await file.toBuffer();
    } catch {
      return reply.code(413).send({
        error: "ATTACHMENT_TOO_LARGE"
      });
    }

    if (fileBuffer.length > maxOrderAttachmentFileSize) {
      return reply.code(413).send({
        error: "ATTACHMENT_TOO_LARGE"
      });
    }

    const attachmentType = normalizeAttachmentType(
      getMultipartFieldString(file.fields, "attachmentType")
    );
    const source = normalizeAttachmentSource(
      getMultipartFieldString(file.fields, "source")
    );
    const comment = getMultipartFieldString(file.fields, "comment");
    const storedFileName = `order-${orderId}-${Date.now()}-${randomBytes(8).toString(
      "hex"
    )}${getSafeFileExtension(originalFileName, mimeType)}`;
    const storagePath = path.join(orderAttachmentsDir, storedFileName);

    await mkdir(orderAttachmentsDir, {
      recursive: true
    });

    await writeFile(storagePath, fileBuffer);

    let insertedAttachment: ApiOrderAttachmentRow | null = null;

    try {
      insertedAttachment = await withDatabaseTransaction(async (client) => {
        const attachmentResult = await client.query<ApiOrderAttachmentRow>(
          `
            insert into app.order_attachments (
              order_id,
              source,
              attachment_type,
              original_file_name,
              stored_file_name,
              mime_type,
              file_size,
              storage_path,
              comment
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            returning
              id,
              order_id as "orderId",
              source,
              attachment_type as "attachmentType",
              original_file_name as "originalFileName",
              mime_type as "mimeType",
              file_size as "fileSize",
              storage_path as "storagePath",
              comment,
              created_at::text as "createdAt"
          `,
          [
            orderId,
            source,
            attachmentType,
            originalFileName,
            storedFileName,
            mimeType,
            fileBuffer.length,
            storagePath,
            comment
          ]
        );
        const attachment = attachmentResult.rows[0];

        await client.query(
          `
            insert into app.order_events (
              order_id,
              event_type,
              actor_type,
              actor_user_id,
              payload_json
            )
            values ($1, 'attachment_added', 'desktop', $2, $3::jsonb)
          `,
          [
            orderId,
            authSession.user.id,
            JSON.stringify({
              attachmentId: attachment.id,
              attachmentType,
              originalFileName
            })
          ]
        );

        return attachment;
      });
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    return reply.code(201).send(buildOrderAttachmentResponse(insertedAttachment));
  }
);

app.get<{
  Params: { attachmentId: string; id: string };
}>(
  "/orders/:id/attachments/:attachmentId/download",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return null;
    }

    const orderId = Number(request.params.id);
    const attachmentId = Number(request.params.attachmentId);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return reply.code(400).send({
        error: "INVALID_ATTACHMENT_ID"
      });
    }

    const attachment = await getOrderAttachment(orderId, attachmentId);

    if (!attachment) {
      return reply.code(404).send({
        error: "ATTACHMENT_NOT_FOUND"
      });
    }

    reply.header(
      "Content-Disposition",
      createContentDisposition("attachment", attachment.originalFileName)
    );
    reply.type(attachment.mimeType ?? "application/octet-stream");

    return createReadStream(attachment.storagePath);
  }
);

app.get<{
  Params: { attachmentId: string; id: string };
}>(
  "/orders/:id/attachments/:attachmentId/preview",
  async (request, reply) => {
    const authSession = await requireRole(request, reply, ["manager", "admin"]);

    if (!authSession) {
      return null;
    }

    const orderId = Number(request.params.id);
    const attachmentId = Number(request.params.attachmentId);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return reply.code(400).send({
        error: "INVALID_ATTACHMENT_ID"
      });
    }

    const attachment = await getOrderAttachment(orderId, attachmentId);

    if (!attachment) {
      return reply.code(404).send({
        error: "ATTACHMENT_NOT_FOUND"
      });
    }

    if (!isPreviewableAttachmentMime(attachment.mimeType)) {
      return reply.code(415).send({
        error: "ATTACHMENT_PREVIEW_UNAVAILABLE"
      });
    }

    reply.header(
      "Content-Disposition",
      createContentDisposition("inline", attachment.originalFileName)
    );
    reply.type(attachment.mimeType ?? "application/octet-stream");

    return createReadStream(attachment.storagePath);
  }
);

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
        delivery_mode: string | null;
        delivery_total_minor: number | string | null;
        id: number;
        order_number: string;
        total_price_minor: number | string;
      }>(
        `
          select
            o.id,
            o.order_number,
            o.customer_id,
            o.total_price_minor,
            o.delivery_total_minor,
            order_delivery.delivery_mode
          from app.orders o
          left join lateral (
            select od.delivery_mode
            from app.order_delivery od
            where od.order_id = o.id
            order by od.id desc
            limit 1
          ) order_delivery on true
          where o.id = $1
          for update of o
        `,
        [orderId]
      );
      const order = existingOrder.rows[0];

      if (!order) {
        return {
          status: "not_found" as const
        };
      }

      const existingItems = await client.query<OrderFinancialItemRow>(
        `
          select
            service_type as "serviceType",
            title,
            quantity::text as quantity,
            unit_price_minor::text as "unitPriceMinor",
            total_price_minor::text as "totalPriceMinor",
            params_json as "paramsJson",
            calculation_snapshot_json as "calculationSnapshotJson",
            sort_order as "sortOrder"
          from app.order_items
          where order_id = $1
          order by sort_order, id
        `,
        [orderId]
      );
      const existingFinancialSignature = buildStoredOrderFinancialSignature({
        deliveryTotalMinor: Number(order.delivery_total_minor ?? 0),
        items: existingItems.rows,
        totalPriceMinor: Number(order.total_price_minor)
      });
      const preservedDeliveryTotalMinor = Number(order.delivery_total_minor ?? 0);
      const nextItemsTotalMinor = getOrderItemsTotalMinor(normalizedItems);
      const nextOrderTotalPriceMinor =
        totalPriceMinor === nextItemsTotalMinor + preservedDeliveryTotalMinor
          ? totalPriceMinor
          : nextItemsTotalMinor + preservedDeliveryTotalMinor;
      const nextFinancialSignature = buildDraftOrderFinancialSignature(
        normalizedItems,
        preservedDeliveryTotalMinor,
        nextOrderTotalPriceMinor
      );
      const hasFinancialChanges =
        existingFinancialSignature !== nextFinancialSignature;
      const hasItemFinancialChanges =
        buildStoredOrderItemsSignature(existingItems.rows) !==
        buildDraftOrderItemsSignature(normalizedItems);
      const nextDeliveryMode = normalizeDeliveryMode(delivery.mode);
      const savedDeliveryNeedsReview =
        hasItemFinancialChanges &&
        ["cdek", "manual"].includes(nextDeliveryMode) &&
        ["cdek", "manual"].includes(
          String(order.delivery_mode ?? "").trim().toLowerCase()
        );
      const ozonPayments = await client.query<ApiOrderPaymentRow>(
        `
          ${getOrderPaymentSelectSql()}
          where order_id = $1
            and provider = 'ozon_pay_checkout'
          order by created_at desc, id desc
          for update
        `,
        [orderId]
      );
      const hasFinalOzonPayment = ozonPayments.rows.some((payment) =>
        finalOzonPaymentStatuses.has(payment.status)
      );

      if (hasFinalOzonPayment) {
        return {
          status: "has_final_ozon_payment" as const
        };
      }

      const activeOzonPayments = ozonPayments.rows.filter((payment) =>
        activeOzonPaymentStatuses.has(payment.status)
      );
      const canceledOzonPaymentIds: number[] = [];

      if (hasFinancialChanges && activeOzonPayments.length > 0) {
        const config = getOzonAcquiringConfig();

        if (!config) {
          return {
            status: "ozon_not_configured" as const
          };
        }

        for (const payment of activeOzonPayments) {
          if (!payment.providerOrderId) {
            return {
              status: "ozon_provider_order_id_required" as const
            };
          }

          const cancelResult = await requestOzonCancelOrder(
            config,
            payment.providerOrderId
          );

          if (!cancelResult.ok) {
            request.log.warn(
              {
                endpoint: "/v1/cancelOrder",
                ozonCode: cancelResult.diagnostic.ozonCode,
                ozonDetails: cancelResult.diagnostic.ozonDetails,
                ozonMessage: cancelResult.diagnostic.ozonMessage,
                ozonStatus: cancelResult.diagnostic.ozonStatus,
                paymentId: payment.id
              },
              "Ozon Pay Checkout cancelOrder failed before order update"
            );

            return {
              diagnostic: cancelResult.diagnostic,
              status: "ozon_cancel_failed" as const
            };
          }

          await client.query(
            `
              update app.order_payments
              set
                status = 'canceled',
                ozon_status = 'STATUS_CANCELED',
                canceled_at = now(),
                last_error_code = null,
                last_error_message = null,
                status_response_json = $3::jsonb,
                updated_at = now()
              where id = $1
                and order_id = $2
                and provider = 'ozon_pay_checkout'
            `,
            [
              payment.id,
              orderId,
              JSON.stringify(sanitizeOzonPayload(cancelResult.responseBody))
            ]
          );
          await client.query(
            `
              insert into app.order_events (
                order_id,
                event_type,
                actor_type,
                actor_user_id,
                actor_name,
                payload_json
              )
              values ($1, 'payment_canceled', 'manager', $2, $3, $4::jsonb)
            `,
            [
              orderId,
              authSession.user.id,
              authSession.user.displayName ?? authSession.user.login,
              JSON.stringify({
                newStatus: "canceled",
                oldStatus: payment.status,
                paymentId: Number(payment.id),
                provider: "ozon_pay_checkout",
                providerExtId: payment.providerExtId,
                providerOrderId: payment.providerOrderId,
                reason: "order_financial_change"
              })
            ]
          );
          canceledOzonPaymentIds.push(Number(payment.id));
        }
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
            delivery_total_minor = $5,
            discount_total_minor = 0,
            total_price_minor = $6,
            customer_comment = $7,
            updated_at = now()
          where id = $1
        `,
        [
          orderId,
          customerId,
          JSON.stringify(customerSnapshot),
          nextItemsTotalMinor,
          preservedDeliveryTotalMinor,
          nextOrderTotalPriceMinor,
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
        customerPhone,
        {
          clearNeedsReview: !savedDeliveryNeedsReview
        }
      );

      if (savedDeliveryNeedsReview) {
        await client.query(
          `
            update app.order_delivery
            set provider_payload_json =
              coalesce(provider_payload_json, '{}'::jsonb) ||
              jsonb_build_object(
                'needsReview', true,
                'needsReviewReason', 'order_items_changed'
              )
            where order_id = $1
          `,
          [orderId]
        );
      }

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
            deliveryNeedsReview: savedDeliveryNeedsReview,
            source: "desktop_patch"
          })
        ]
      );

      return {
        canceledOzonPaymentIds,
        deliveryNeedsReview: savedDeliveryNeedsReview,
        id: order.id,
        orderNumber: order.order_number,
        ozonPaymentAutoCanceled: canceledOzonPaymentIds.length > 0,
        status: "updated" as const,
        updated: true
      };
    });

    if (result.status === "not_found") {
      return reply.code(404).send({
        error: "ORDER_NOT_FOUND"
      });
    }

    if (result.status === "has_final_ozon_payment") {
      return reply.code(409).send({
        error: "ORDER_HAS_FINAL_OZON_PAYMENT",
        message: "У заказа есть финансовая Ozon-оплата. Изменение заказа запрещено."
      });
    }

    if (result.status === "ozon_not_configured") {
      return sendOzonAcquiringNotConfigured(reply);
    }

    if (result.status === "ozon_provider_order_id_required") {
      return reply.code(409).send({
        error: "OZON_PAYMENT_PROVIDER_ORDER_ID_REQUIRED",
        message: "Не найден идентификатор заказа Ozon для отмены оплаты."
      });
    }

    if (result.status === "ozon_cancel_failed") {
      return reply.code(502).send({
        error: "OZON_CANCEL_ORDER_FAILED",
        ozonCode: result.diagnostic.ozonCode,
        ozonDetails: result.diagnostic.ozonDetails,
        ozonMessage: result.diagnostic.ozonMessage,
        ozonStatus: result.diagnostic.ozonStatus
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
    const existingOrder = await client.query<{ id: number }>(
      `
        select id
        from app.orders
        where id = $1
        limit 1
      `,
      [orderId]
    );

    if (!existingOrder.rows[0]) {
      return {
        status: "not_found" as const
      };
    }

    const ozonPayments = await client.query<{ exists: boolean }>(
      `
        select exists (
          select 1
          from app.order_payments
          where order_id = $1
            and provider = 'ozon_pay_checkout'
        ) as exists
      `,
      [orderId]
    );

    if (ozonPayments.rows[0]?.exists) {
      return {
        status: "has_ozon_payment" as const
      };
    }

    const attachmentPaths = await client.query<{ storage_path: string | null }>(
      `
        select storage_path
        from app.order_attachments
        where order_id = $1
      `,
      [orderId]
    );
    const deletedOrder = await client.query<{ id: number }>(
      `
        delete from app.orders
        where id = $1
        returning id
      `,
      [orderId]
    );

    const order = deletedOrder.rows[0] ?? null;

    if (!order) {
      return {
        status: "not_found" as const
      };
    }

    return {
      status: "deleted" as const,
      attachmentStoragePaths: attachmentPaths.rows.map((row) => row.storage_path),
      id: order.id
    };
  });

  if (result.status === "not_found") {
    return reply.code(404).send({
      error: "ORDER_NOT_FOUND"
    });
  }

  if (result.status === "has_ozon_payment") {
    return reply.code(409).send({
      error: "ORDER_HAS_OZON_PAYMENT",
      message: "У заказа есть Ozon-оплата. Удаление запрещено."
    });
  }

  await Promise.all(
    result.attachmentStoragePaths.map((storagePath) =>
      safeDeleteAttachmentFile(storagePath)
    )
  );

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
