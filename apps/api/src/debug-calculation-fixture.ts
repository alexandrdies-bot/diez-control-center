import { readFile } from "node:fs/promises";
import {
  calculateKonstruktorLedModulesByGeometry,
  calculateKonstruktorLightingCost,
  calculateKonstruktorMaterialCosts,
  calculateLightLetterProductionCostsByElements,
  formatKonstruktorPriceMinor,
  getKonstruktorBackPvcByHeight,
  getKonstruktorFaceAcrylicByHeight,
  shouldUseKonstruktorFaceFilm,
  type KonstruktorMaterialPricingSource
} from "@diez/calculation-core";

const fixturePath =
  "D:\\_ProjectHome\\diez-site\\outputs\\constructor-fixtures\\simple-light-text-diez-300.json";

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
    boardTape: {
      widthMm: number;
    };
    faceFilm: {
      colorCode: string;
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

export async function checkSimpleLightTextDiez300Fixture() {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  const areaM2 = fixture.geometrySummary.areaM2;
  const materialAreaM2 = fixture.geometrySummary.materialAreaM2;
  const perimeterM = fixture.geometrySummary.perimeterM;
  const heightMm = Number(fixture.input.targetHeightMm);
  const isFaceFilmUsed = shouldUseKonstruktorFaceFilm(
    fixture.input.faceFilm.colorCode
  );

  const materialCosts = calculateKonstruktorMaterialCosts({
    areaM2: materialAreaM2,
    backPvc: getKonstruktorBackPvcByHeight(heightMm),
    boardTape: toMaterialSource(fixture.selectedBoardTape),
    faceAcrylic: getKonstruktorFaceAcrylicByHeight(heightMm),
    faceFilm: toMaterialSource(fixture.selectedFaceFilm),
    isFaceFilmUsed,
    perimeterM
  });

  const ledModules = calculateKonstruktorLedModulesByGeometry({
    areaM2,
    perimeterM
  });

  const lightingCosts = calculateKonstruktorLightingCost({
    bodyMaterialsCostMinor: materialCosts.totalMaterialsCostMinor,
    ledByInnerAreaCount: ledModules.ledCount
  });

  const productionCosts = calculateLightLetterProductionCostsByElements({
    baseMaterialsCostMinor:
      materialCosts.totalMaterialsCostMinor +
      lightingCosts.finalLightingCostMinor,
    elementHeightsMm: getElementHeightsMm(fixture)
  });

  const calculatedTotalPriceMinor = productionCosts.totalProductionCostMinor;
  const expectedTotalPriceMinor = fixture.pricingSummary.totalPriceMinor;
  const totalPriceDeltaMinor =
    calculatedTotalPriceMinor - expectedTotalPriceMinor;
  const expectedLedCount =
    fixture.pricingSummary.objects?.[0]?.ledModules?.ledCount ?? null;
  const expectedFaceFilmCostMinor =
    fixture.pricingSummary.objects?.[0]?.materialCosts?.faceFilmCostMinor ?? null;

  return {
    ok: true,
    mode: "pricing-from-saved-geometry",
    limitation:
      "Full recalculation from text input requires shared text-layout/serializable shape adapter",
    fixtureId: fixture.fixtureId,
    expected: {
      areaM2,
      faceFilmCostMinor: expectedFaceFilmCostMinor,
      formattedTotalPrice: fixture.pricingSummary.formattedTotalPrice,
      ledCount: expectedLedCount,
      lightingPercentCostMinor:
        fixture.pricingSummary.totalCosts?.lightingPercentCostMinor ?? null,
      perimeterM,
      totalPriceMinor: expectedTotalPriceMinor
    },
    calculated: {
      faceFilmCostMinor: materialCosts.faceFilmCostMinor,
      formattedTotalPrice: formatKonstruktorPriceMinor(
        calculatedTotalPriceMinor
      ),
      ledCount: ledModules.ledCount,
      lightingPercentCostMinor: lightingCosts.lightingPercentCostMinor,
      totalPriceMinor: calculatedTotalPriceMinor
    },
    checks: {
      ledCountMatches:
        expectedLedCount === null ? null : ledModules.ledCount === expectedLedCount,
      roundedTotalPriceMinorMatches:
        roundMinor(calculatedTotalPriceMinor) === roundMinor(expectedTotalPriceMinor),
      totalPriceDeltaMinor
    }
  };
}
