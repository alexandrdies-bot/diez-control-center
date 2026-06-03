import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  calculateKonstruktorLedModulesByGeometry,
  calculateKonstruktorLightingCost,
  calculateKonstruktorMaterialCosts,
  calculateLightLetterProductionCostsByElements,
  formatKonstruktorPriceMinor,
  getKonstruktorBackPvcByHeight,
  getKonstruktorFaceAcrylicByHeight,
  getKonstruktorFacePvcByHeight,
  shouldUseKonstruktorFaceFilm,
  type KonstruktorMaterialPricingSource
} from "@diez/calculation-core";

const fixturesDir =
  "D:\\_ProjectHome\\diez-site\\outputs\\constructor-fixtures";

const fixtureFiles = {
  "face-film-red-text-diez-300": "face-film-red-text-diez-300.json",
  "simple-light-text-diez-300": "simple-light-text-diez-300.json",
  "simple-non-light-text-diez-300": "simple-non-light-text-diez-300.json"
} as const;

type FixtureId = keyof typeof fixtureFiles;

type FixtureMaterialSource = {
  deliveryPriceMinor: number;
  materialName: string;
  markupPercent: number;
  purchasePriceMinor: number;
  workAmount: number;
};

type FixtureGeometryElement = {
  heightMm: number;
};

type Fixture = {
  fixtureId: string;
  geometrySummary: {
    areaM2: number;
    materialAreaM2: number;
    perimeterM: number;
    objects?: Array<{
      elements?: FixtureGeometryElement[];
    }>;
  };
  input: {
    faceFilm: {
      colorCode: string;
    };
    lighting: {
      mode: "light" | "non-light";
    };
    targetHeightMm: string;
  };
  pricingSummary: {
    formattedTotalPrice: string;
    totalPriceMinor: number;
    totalCosts?: {
      lightingPercentCostMinor?: number;
    };
    objects?: Array<{
      ledModules?: {
        ledCount: number;
      };
      materialCosts?: {
        faceFilmCostMinor: number;
      };
    }>;
  };
  selectedBoardTape: FixtureMaterialSource;
  selectedFaceFilm: FixtureMaterialSource;
};

function isFixtureId(fixtureId: string): fixtureId is FixtureId {
  return fixtureId in fixtureFiles;
}

function toMaterialSource(source: FixtureMaterialSource): KonstruktorMaterialPricingSource {
  return {
    deliveryPriceMinor: source.deliveryPriceMinor,
    materialName: source.materialName,
    markupPercent: source.markupPercent,
    purchasePriceMinor: source.purchasePriceMinor,
    workAmount: source.workAmount
  };
}

function getElementHeightsMm(fixture: Fixture) {
  return (
    fixture.geometrySummary.objects
      ?.flatMap((object) => object.elements ?? [])
      .map((element) => element.heightMm) ?? []
  );
}

function roundMinor(value: number) {
  return Math.round(value);
}

function nullableMinorMatches(left: number | null, right: number | null) {
  if (left === null || right === null) {
    return null;
  }

  return roundMinor(left) === roundMinor(right);
}

export async function checkCalculationFixture(fixtureId: string) {
  if (!isFixtureId(fixtureId)) {
    return {
      ok: false,
      reason: "UNKNOWN_FIXTURE_ID",
      supportedFixtureIds: Object.keys(fixtureFiles)
    };
  }

  const fixturePath = path.join(fixturesDir, fixtureFiles[fixtureId]);
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  const areaM2 = fixture.geometrySummary.areaM2;
  const materialAreaM2 = fixture.geometrySummary.materialAreaM2;
  const perimeterM = fixture.geometrySummary.perimeterM;
  const heightMm = Number(fixture.input.targetHeightMm);
  const isLight = fixture.input.lighting.mode === "light";
  const isFaceFilmUsed = shouldUseKonstruktorFaceFilm(
    fixture.input.faceFilm.colorCode
  );

  const materialCosts = calculateKonstruktorMaterialCosts({
    areaM2: materialAreaM2,
    backPvc: getKonstruktorBackPvcByHeight(heightMm),
    boardTape: toMaterialSource(fixture.selectedBoardTape),
    faceAcrylic: isLight
      ? getKonstruktorFaceAcrylicByHeight(heightMm)
      : getKonstruktorFacePvcByHeight(heightMm),
    faceFilm: toMaterialSource(fixture.selectedFaceFilm),
    isFaceFilmUsed,
    perimeterM
  });

  const ledModules = isLight
    ? calculateKonstruktorLedModulesByGeometry({
        areaM2,
        perimeterM
      })
    : null;

  const lightingCosts =
    isLight && ledModules
      ? calculateKonstruktorLightingCost({
          bodyMaterialsCostMinor: materialCosts.totalMaterialsCostMinor,
          ledByInnerAreaCount: ledModules.ledCount
        })
      : null;

  const productionCosts = calculateLightLetterProductionCostsByElements({
    baseMaterialsCostMinor:
      materialCosts.totalMaterialsCostMinor +
      (lightingCosts?.finalLightingCostMinor ?? 0),
    elementHeightsMm: getElementHeightsMm(fixture)
  });

  const calculatedTotalPriceMinor = productionCosts.totalProductionCostMinor;
  const expectedTotalPriceMinor = fixture.pricingSummary.totalPriceMinor;
  const expectedLedCount =
    fixture.pricingSummary.objects?.[0]?.ledModules?.ledCount ?? null;
  const calculatedLedCount = ledModules?.ledCount ?? 0;
  const expectedFaceFilmCostMinor =
    fixture.pricingSummary.objects?.[0]?.materialCosts?.faceFilmCostMinor ?? null;
  const calculatedFaceFilmCostMinor = materialCosts.faceFilmCostMinor;

  return {
    ok: true,
    mode: "pricing-from-saved-geometry",
    fixtureId: fixture.fixtureId,
    expectedTotalPriceMinor,
    calculatedTotalPriceMinor,
    roundedTotalPriceMinorMatches:
      roundMinor(calculatedTotalPriceMinor) === roundMinor(expectedTotalPriceMinor),
    formattedTotalPrice: formatKonstruktorPriceMinor(calculatedTotalPriceMinor),
    ledCount: calculatedLedCount,
    ledCountMatches:
      expectedLedCount === null ? null : calculatedLedCount === expectedLedCount,
    expectedFaceFilmCostMinor,
    faceFilmCostMinor: calculatedFaceFilmCostMinor,
    faceFilmCostMatches: nullableMinorMatches(
      calculatedFaceFilmCostMinor,
      expectedFaceFilmCostMinor
    ),
    limitation:
      "Full recalculation from text input requires shared text-layout/serializable shape adapter"
  };
}

export function checkSimpleLightTextDiez300Fixture() {
  return checkCalculationFixture("simple-light-text-diez-300");
}
