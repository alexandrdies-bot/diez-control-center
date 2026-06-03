import type {
  ConstructorCalculationInput,
  SerializableLayout
} from "@diez/calculation-core";

export function checkCalculationCoreImport() {
  const input: ConstructorCalculationInput = {
    text: "ДИЕЗ",
    targetHeightMm: "300",
    lightingMode: "light",
    referenceLetter: "А",
    boardTape: {
      colorName: "Белый RAL 9003",
      widthMm: 80,
      thicknessMm: 0.6
    },
    faceFilm: {
      colorCode: "NO_FILM",
      label: "Без плёнки"
    },
    textObjects: [
      {
        id: "text-1",
        kind: "text",
        text: "ДИЕЗ",
        heightMm: "300",
        x: 0,
        y: 0,
        boardTapeColorName: "Белый RAL 9003",
        boardWidthMm: 80,
        faceFilmColorCode: "NO_FILM"
      }
    ]
  };

  const layout: SerializableLayout = {
    version: "1",
    title: "ДИЕЗ",
    referenceLetter: "А",
    targetHeightMm: 300,
    objects: []
  };

  return {
    ok: true,
    input,
    layout
  };
}
