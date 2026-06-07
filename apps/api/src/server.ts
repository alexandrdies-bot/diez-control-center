import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { checkCalculationCoreImport } from "./calculation-core-import-check.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, "../../..");

dotenv.config({
  path: path.join(repoRoot, ".env")
});

const { checkDatabaseConnection, queryDatabase } = await import("./db.js");

const apiHost = process.env.API_HOST ?? "127.0.0.1";
const apiPort = Number(process.env.API_PORT ?? "3001");
const debugEndpointsEnabled =
  process.env.DEBUG_ENDPOINTS_ENABLED === "true" ||
  process.env.NODE_ENV !== "production";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

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
