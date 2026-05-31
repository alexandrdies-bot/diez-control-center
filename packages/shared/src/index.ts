export type ConstructorLightingMode = "light" | "non-light";

export type ConstructorBoardTapeInput = {
  colorName: string;
  widthMm: number;
  thicknessMm: number;
};

export type ConstructorFaceFilmInput = {
  colorCode: string;
  label: string;
};

export type ConstructorTextObjectInput = {
  id: string;
  kind: "text" | "svg";
  text?: string;
  svgMarkup?: string;
  heightMm: string;
  x: number;
  y: number;
  boardTapeColorName: string;
  boardWidthMm: number;
  faceFilmColorCode: string;
};

export type ConstructorCalculationInput = {
  text: string;
  targetHeightMm: string;
  lightingMode: ConstructorLightingMode;
  referenceLetter: string;
  boardTape: ConstructorBoardTapeInput;
  faceFilm: ConstructorFaceFilmInput;
  textObjects: ConstructorTextObjectInput[];
};

export type ConstructorGeometrySummary = {
  areaM2: number;
  materialAreaM2: number;
  perimeterM: number;
  objectCount: number;
  elementCount: number;
  holeCount: number;
};

export type ConstructorPricingSummary = {
  totalPriceMinor: number;
  formattedTotalPrice: string;
  isFaceFilmUsed: boolean;
  ledCount: number;
  ledCostMinor: number;
  faceFilmCostMinor: number;
};

export type ConstructorCalculationSnapshot = {
  fixtureId?: string;
  input: ConstructorCalculationInput;
  geometrySummary: ConstructorGeometrySummary;
  pricingSummary: ConstructorPricingSummary;
};
