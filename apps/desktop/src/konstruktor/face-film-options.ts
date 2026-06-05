export const NO_FACE_FILM_COLOR_CODE = "NO_FILM";

export type FaceFilmOption = {
  materialType: "Без плёнки" | "Транслюцентная плёнка";
  usageRole: "none" | "main";
  alternativeForSeries: null;
  seriesName: "Молочный акрил" | "LX/LG LT4000 / LC6800";
  colorName: string;
  colorCode: string;
  materialName: string;
  rollWidthM: number | null;
  rollLengthM: number | null;
  rollAreaM2: number | null;
  purchasePriceMinor: number;
  markupPercent: number;
  deliveryPriceMinor: number;
  workAmount: number;
  sourceNote: string;
};

const FACE_FILM_SOURCE_NOTE =
  "Mock из структуры 007_translucent_films.sql. Цена рулона. Расчётная единица — м². Итоговую цену считает приложение по docs/materials-pricing.md.";

const NO_FACE_FILM_OPTION: FaceFilmOption = {
  materialType: "Без плёнки",
  usageRole: "none",
  alternativeForSeries: null,
  seriesName: "Молочный акрил",
  colorName: "молочный акрил",
  colorCode: NO_FACE_FILM_COLOR_CODE,
  materialName: "Без плёнки — цвет молочный акрил",
  rollWidthM: null,
  rollLengthM: null,
  rollAreaM2: null,
  purchasePriceMinor: 0,
  markupPercent: 0,
  deliveryPriceMinor: 0,
  workAmount: 0,
  sourceNote:
    "UI-вариант без транслюцентной плёнки. При расчёте плёнка не добавляется.",
};

export const FACE_FILM_OPTIONS: FaceFilmOption[] = [
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "белая",
    colorCode: "6871",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 белая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "слоновая кость",
    colorCode: "6834",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 слоновая кость",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "жёлтая",
    colorCode: "6833",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 жёлтая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "тёмно-жёлтая",
    colorCode: "6831",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 тёмно-жёлтая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "оранжевая",
    colorCode: "6823",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 оранжевая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "мандариновая",
    colorCode: "6822",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 мандариновая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "красная",
    colorCode: "6811",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 красная",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "розовая",
    colorCode: "6863",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 розовая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "фиолетовая",
    colorCode: "6852",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 фиолетовая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "голубая",
    colorCode: "6854",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 голубая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "ультрамариновая",
    colorCode: "6856",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 ультрамариновая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "бирюзовая",
    colorCode: "6841",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 бирюзовая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "салатовая",
    colorCode: "6842",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 салатовая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "зелёная",
    colorCode: "684A",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 зелёная",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "светло-коричневая",
    colorCode: "6827",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 светло-коричневая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "тёмно-коричневая",
    colorCode: "4029",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 тёмно-коричневая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "тёмно-серая",
    colorCode: "4081",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 тёмно-серая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "серая",
    colorCode: "6875",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 серая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "светло-серая",
    colorCode: "6873",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 светло-серая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "серебристо-серая",
    colorCode: "6877",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 серебристо-серая",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
  {
    materialType: "Транслюцентная плёнка",
    usageRole: "main",
    alternativeForSeries: null,
    seriesName: "LX/LG LT4000 / LC6800",
    colorName: "чёрная",
    colorCode: "6880",
    materialName: "Плёнка транслюцентная LX/LG LT4000 / LC6800 чёрная",
    rollWidthM: 1.22,
    rollLengthM: 50,
    rollAreaM2: 61,
    purchasePriceMinor: 4490000,
    markupPercent: 100,
    deliveryPriceMinor: 0,
    workAmount: 61,
    sourceNote: FACE_FILM_SOURCE_NOTE,
  },
];

const FACE_FILM_COLOR_ORDER = [
  NO_FACE_FILM_COLOR_CODE, // без плёнки — молочный акрил
  "6871", // белая
  "6834", // слоновая кость

  "6873", // светло-серая
  "6875", // серая
  "4081", // тёмно-серая
  "6880", // чёрная
  "6877", // серебристо-серая

  "6831", // тёмно-жёлтая / ближе к золоту
  "6833", // жёлтая

  "6823", // оранжевая
  "6822", // мандариновая

  "6811", // красная

  "6863", // розовая
  "6852", // фиолетовая

  "6854", // голубая
  "6856", // ультрамариновая

  "6841", // бирюзовая

  "6842", // салатовая
  "684A", // зелёная

  "6827", // светло-коричневая
  "4029", // тёмно-коричневая
];

function getFaceFilmColorOrder(colorCode: string) {
  const orderIndex = FACE_FILM_COLOR_ORDER.indexOf(colorCode);

  return orderIndex === -1 ? Number.MAX_SAFE_INTEGER : orderIndex;
}

export const DEFAULT_FACE_FILM_OPTION = NO_FACE_FILM_OPTION;

const FACE_FILM_HEX_BY_CODE: Record<string, string> = {
  [NO_FACE_FILM_COLOR_CODE]: "#f4f4f1",
  "6871": "#f4f4f1",
  "6834": "#f1e4c8",
  "6833": "#ffd429",
  "6831": "#d9a82f",
  "6823": "#f28a1a",
  "6822": "#ff6418",
  "6811": "#d3192a",
  "6863": "#df5a96",
  "6852": "#6d4688",
  "6854": "#43a8dd",
  "6856": "#253a8f",
  "6841": "#05999b",
  "6842": "#8bc640",
  "684A": "#178142",
  "6827": "#b98a5d",
  "4029": "#57372a",
  "4081": "#46484a",
  "6875": "#8c8f92",
  "6873": "#d7d7d7",
  "6877": "#bec1c4",
  "6880": "#101112",
};

export function getFaceFilmOptions() {
  return [NO_FACE_FILM_OPTION, ...FACE_FILM_OPTIONS.filter(
    (option) =>
      option.materialType === "Транслюцентная плёнка" &&
      option.usageRole === "main" &&
      option.seriesName === "LX/LG LT4000 / LC6800",
  )].sort(
    (firstOption, secondOption) =>
      getFaceFilmColorOrder(firstOption.colorCode) -
        getFaceFilmColorOrder(secondOption.colorCode) ||
      firstOption.colorName.localeCompare(secondOption.colorName, "ru"),
  );
}

export function getFaceFilmOption(colorCode: string) {
  return getFaceFilmOptions().find((option) => option.colorCode === colorCode);
}

export function getFaceFilmColorHex(colorCode: string) {
  return FACE_FILM_HEX_BY_CODE[colorCode] ?? "#f4f4f1";
}

export function getFaceFilmColorLabel(option: FaceFilmOption) {
  if (option.colorCode === NO_FACE_FILM_COLOR_CODE) {
    return "БЕЗ ПЛЁНКИ";
  }

  return option.colorCode.toUpperCase();
}
