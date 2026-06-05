export type BoardTapeOption = {
  colorName: string;
  widthMm: number;
  thicknessMm: number;
  pricePerLmMinor: number;
  purchasePriceMinor: number;
  roll100mPriceMinor: number;
  markupPercent: number;
  deliveryPriceMinor: number;
  workAmount: number;
  materialName: string;
};

export const boardTapeOptions: BoardTapeOption[] = [
  { colorName: "Чёрно-серый RAL 7021", widthMm: 50, thicknessMm: 0.6, pricePerLmMinor: 8400, purchasePriceMinor: 840000, roll100mPriceMinor: 840000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Чёрно-серый RAL 7021 50 мм 0.6 мм" },
  { colorName: "Светло-серый RAL 7047", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6500, purchasePriceMinor: 650000, roll100mPriceMinor: 650000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Светло-серый RAL 7047 40 мм 0.6 мм" },
  { colorName: "Светло-серый RAL 7047", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 10200, purchasePriceMinor: 1020000, roll100mPriceMinor: 1020000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Светло-серый RAL 7047 60 мм 0.6 мм" },
  { colorName: "Светло-серый RAL 7047", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13500, purchasePriceMinor: 1350000, roll100mPriceMinor: 1350000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Светло-серый RAL 7047 80 мм 0.6 мм" },
  { colorName: "Бело-алюминиевый RAL 9006", widthMm: 60, thicknessMm: 0.8, pricePerLmMinor: 12100, purchasePriceMinor: 1210000, roll100mPriceMinor: 1210000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Бело-алюминиевый RAL 9006 60 мм 0.8 мм" },
  { colorName: "Бело-алюминиевый RAL 9006", widthMm: 80, thicknessMm: 0.8, pricePerLmMinor: 16000, purchasePriceMinor: 1600000, roll100mPriceMinor: 1600000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Бело-алюминиевый RAL 9006 80 мм 0.8 мм" },
  { colorName: "Бело-алюминиевый RAL 9006", widthMm: 100, thicknessMm: 0.8, pricePerLmMinor: 20000, purchasePriceMinor: 2000000, roll100mPriceMinor: 2000000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Бело-алюминиевый RAL 9006 100 мм 0.8 мм" },
  { colorName: "Белый RAL 9003", widthMm: 20, thicknessMm: 0.6, pricePerLmMinor: 5100, purchasePriceMinor: 510000, roll100mPriceMinor: 510000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 20 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 30, thicknessMm: 0.6, pricePerLmMinor: 5400, purchasePriceMinor: 540000, roll100mPriceMinor: 540000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 30 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 40, thicknessMm: 0.5, pricePerLmMinor: 4900, purchasePriceMinor: 490000, roll100mPriceMinor: 490000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 40 мм 0.5 мм" },
  { colorName: "Белый RAL 9003", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 5500, purchasePriceMinor: 550000, roll100mPriceMinor: 550000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 40 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 50, thicknessMm: 0.5, pricePerLmMinor: 6200, purchasePriceMinor: 620000, roll100mPriceMinor: 620000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 50 мм 0.5 мм" },
  { colorName: "Белый RAL 9003", widthMm: 50, thicknessMm: 0.6, pricePerLmMinor: 7500, purchasePriceMinor: 750000, roll100mPriceMinor: 750000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 50 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 60, thicknessMm: 0.5, pricePerLmMinor: 7500, purchasePriceMinor: 750000, roll100mPriceMinor: 750000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 60 мм 0.5 мм" },
  { colorName: "Белый RAL 9003", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 8000, purchasePriceMinor: 800000, roll100mPriceMinor: 800000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 60 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 60, thicknessMm: 0.8, pricePerLmMinor: 11800, purchasePriceMinor: 1180000, roll100mPriceMinor: 1180000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 60 мм 0.8 мм" },
  { colorName: "Белый RAL 9003", widthMm: 70, thicknessMm: 0.5, pricePerLmMinor: 8700, purchasePriceMinor: 870000, roll100mPriceMinor: 870000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 70 мм 0.5 мм" },
  { colorName: "Белый RAL 9003", widthMm: 70, thicknessMm: 0.6, pricePerLmMinor: 10400, purchasePriceMinor: 1040000, roll100mPriceMinor: 1040000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 70 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 70, thicknessMm: 0.8, pricePerLmMinor: 13700, purchasePriceMinor: 1370000, roll100mPriceMinor: 1370000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 70 мм 0.8 мм" },
  { colorName: "Белый RAL 9003", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 10700, purchasePriceMinor: 1070000, roll100mPriceMinor: 1070000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 80 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 80, thicknessMm: 0.8, pricePerLmMinor: 15500, purchasePriceMinor: 1550000, roll100mPriceMinor: 1550000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 80 мм 0.8 мм" },
  { colorName: "Белый RAL 9003", widthMm: 90, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 90 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 14900, purchasePriceMinor: 1490000, roll100mPriceMinor: 1490000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 100 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 100, thicknessMm: 0.8, pricePerLmMinor: 19800, purchasePriceMinor: 1980000, roll100mPriceMinor: 1980000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 100 мм 0.8 мм" },
  { colorName: "Белый RAL 9003", widthMm: 130, thicknessMm: 0.6, pricePerLmMinor: 19300, purchasePriceMinor: 1930000, roll100mPriceMinor: 1930000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 130 мм 0.6 мм" },
  { colorName: "Белый RAL 9003", widthMm: 130, thicknessMm: 0.8, pricePerLmMinor: 25400, purchasePriceMinor: 2540000, roll100mPriceMinor: 2540000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9003 130 мм 0.8 мм" },
  { colorName: "Белый RAL 9010М", widthMm: 60, thicknessMm: 0.8, pricePerLmMinor: 12100, purchasePriceMinor: 1210000, roll100mPriceMinor: 1210000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9010М 60 мм 0.8 мм" },
  { colorName: "Белый RAL 9010М", widthMm: 80, thicknessMm: 0.8, pricePerLmMinor: 16000, purchasePriceMinor: 1600000, roll100mPriceMinor: 1600000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9010М 80 мм 0.8 мм" },
  { colorName: "Белый RAL 9010М", widthMm: 100, thicknessMm: 0.8, pricePerLmMinor: 20000, purchasePriceMinor: 2000000, roll100mPriceMinor: 2000000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Белый RAL 9010М 100 мм 0.8 мм" },
  { colorName: "Бирюзово-Синий RAL 5018", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Бирюзово-Синий RAL 5018 40 мм 0.6 мм" },
  { colorName: "Бирюзово-Синий RAL 5018", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Бирюзово-Синий RAL 5018 60 мм 0.6 мм" },
  { colorName: "Бирюзово-Синий RAL 5018", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Бирюзово-Синий RAL 5018 80 мм 0.6 мм" },
  { colorName: "Желто-Зеленый RAL 6018", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Желто-Зеленый RAL 6018 40 мм 0.6 мм" },
  { colorName: "Желто-Зеленый RAL 6018", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Желто-Зеленый RAL 6018 60 мм 0.6 мм" },
  { colorName: "Желто-Зеленый RAL 6018", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Желто-Зеленый RAL 6018 80 мм 0.6 мм" },
  { colorName: "Жёлто-оранжевый RAL 2000", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 15800, purchasePriceMinor: 1580000, roll100mPriceMinor: 1580000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Жёлто-оранжевый RAL 2000 100 мм 0.6 мм" },
  { colorName: "Желтый RAL 1021", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Желтый RAL 1021 40 мм 0.6 мм" },
  { colorName: "Желтый RAL 1021", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Желтый RAL 1021 60 мм 0.6 мм" },
  { colorName: "Желтый RAL 1021", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Желтый RAL 1021 80 мм 0.6 мм" },
  { colorName: "Зеленый RAL 6029", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Зеленый RAL 6029 40 мм 0.6 мм" },
  { colorName: "Зеленый RAL 6029", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Зеленый RAL 6029 60 мм 0.6 мм" },
  { colorName: "Зеленый RAL 6029", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Зеленый RAL 6029 80 мм 0.6 мм" },
  { colorName: "Зеленый RAL 6029", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 15800, purchasePriceMinor: 1580000, roll100mPriceMinor: 1580000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Зеленый RAL 6029 100 мм 0.6 мм" },
  { colorName: "Золото", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6900, purchasePriceMinor: 690000, roll100mPriceMinor: 690000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Золото 40 мм 0.6 мм" },
  { colorName: "Золото", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 10400, purchasePriceMinor: 1040000, roll100mPriceMinor: 1040000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Золото 60 мм 0.6 мм" },
  { colorName: "Золото", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13900, purchasePriceMinor: 1390000, roll100mPriceMinor: 1390000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Золото 80 мм 0.6 мм" },
  { colorName: "Коричнево-бежевый RAL 1011", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6400, purchasePriceMinor: 640000, roll100mPriceMinor: 640000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Коричнево-бежевый RAL 1011 40 мм 0.6 мм" },
  { colorName: "Коричнево-бежевый RAL 1011", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9700, purchasePriceMinor: 970000, roll100mPriceMinor: 970000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Коричнево-бежевый RAL 1011 60 мм 0.6 мм" },
  { colorName: "Коричнево-бежевый RAL 1011", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Коричнево-бежевый RAL 1011 80 мм 0.6 мм" },
  { colorName: "Коричневый RAL 8017", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Коричневый RAL 8017 40 мм 0.6 мм" },
  { colorName: "Коричневый RAL 8017", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Коричневый RAL 8017 60 мм 0.6 мм" },
  { colorName: "Коричневый RAL 8017", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Коричневый RAL 8017 80 мм 0.6 мм" },
  { colorName: "Красно-сиреневый RAL 4001", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6400, purchasePriceMinor: 640000, roll100mPriceMinor: 640000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красно-сиреневый RAL 4001 40 мм 0.6 мм" },
  { colorName: "Красно-сиреневый RAL 4001", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9700, purchasePriceMinor: 970000, roll100mPriceMinor: 970000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красно-сиреневый RAL 4001 60 мм 0.6 мм" },
  { colorName: "Красно-сиреневый RAL 4001", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красно-сиреневый RAL 4001 80 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 40 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 50, thicknessMm: 0.6, pricePerLmMinor: 7900, purchasePriceMinor: 790000, roll100mPriceMinor: 790000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 50 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 60 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 70, thicknessMm: 0.6, pricePerLmMinor: 11000, purchasePriceMinor: 1100000, roll100mPriceMinor: 1100000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 70 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 80 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 90, thicknessMm: 0.6, pricePerLmMinor: 14200, purchasePriceMinor: 1420000, roll100mPriceMinor: 1420000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 90 мм 0.6 мм" },
  { colorName: "Красный RAL 3020", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 15800, purchasePriceMinor: 1580000, roll100mPriceMinor: 1580000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Красный RAL 3020 100 мм 0.6 мм" },
  { colorName: "Оранжевый RAL 2009", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6400, purchasePriceMinor: 640000, roll100mPriceMinor: 640000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Оранжевый RAL 2009 40 мм 0.6 мм" },
  { colorName: "Оранжевый RAL 2009", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9700, purchasePriceMinor: 970000, roll100mPriceMinor: 970000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Оранжевый RAL 2009 60 мм 0.6 мм" },
  { colorName: "Оранжевый RAL 2009", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Оранжевый RAL 2009 80 мм 0.6 мм" },
  { colorName: "Розовый RAL 4010", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9700, purchasePriceMinor: 970000, roll100mPriceMinor: 970000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Розовый RAL 4010 60 мм 0.6 мм" },
  { colorName: "Розовый RAL 4010", widthMm: 70, thicknessMm: 0.6, pricePerLmMinor: 11200, purchasePriceMinor: 1120000, roll100mPriceMinor: 1120000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Розовый RAL 4010 70 мм 0.6 мм" },
  { colorName: "Розовый RAL 4010", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Розовый RAL 4010 80 мм 0.6 мм" },
  { colorName: "Светло-Синий RAL 5015", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Светло-Синий RAL 5015 40 мм 0.6 мм" },
  { colorName: "Светло-Синий RAL 5015", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Светло-Синий RAL 5015 60 мм 0.6 мм" },
  { colorName: "Светло-Синий RAL 5015", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Светло-Синий RAL 5015 80 мм 0.6 мм" },
  { colorName: "Серебро", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6900, purchasePriceMinor: 690000, roll100mPriceMinor: 690000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серебро 40 мм 0.6 мм" },
  { colorName: "Серебро", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 10400, purchasePriceMinor: 1040000, roll100mPriceMinor: 1040000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серебро 60 мм 0.6 мм" },
  { colorName: "Серебро", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13900, purchasePriceMinor: 1390000, roll100mPriceMinor: 1390000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серебро 80 мм 0.6 мм" },
  { colorName: "Серый RAL 7043", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6400, purchasePriceMinor: 640000, roll100mPriceMinor: 640000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серый RAL 7043 40 мм 0.6 мм" },
  { colorName: "Серый RAL 7043", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9700, purchasePriceMinor: 970000, roll100mPriceMinor: 970000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серый RAL 7043 60 мм 0.6 мм" },
  { colorName: "Серый RAL 7043", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серый RAL 7043 80 мм 0.6 мм" },
  { colorName: "Серый RAL 7043", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 16100, purchasePriceMinor: 1610000, roll100mPriceMinor: 1610000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Серый RAL 7043 100 мм 0.6 мм" },
  { colorName: "Темно-Синий RAL 5002", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6300, purchasePriceMinor: 630000, roll100mPriceMinor: 630000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Темно-Синий RAL 5002 40 мм 0.6 мм" },
  { colorName: "Темно-Синий RAL 5002", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9500, purchasePriceMinor: 950000, roll100mPriceMinor: 950000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Темно-Синий RAL 5002 60 мм 0.6 мм" },
  { colorName: "Темно-Синий RAL 5002", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 12600, purchasePriceMinor: 1260000, roll100mPriceMinor: 1260000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Темно-Синий RAL 5002 80 мм 0.6 мм" },
  { colorName: "Темно-Синий RAL 5002", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 15800, purchasePriceMinor: 1580000, roll100mPriceMinor: 1580000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Темно-Синий RAL 5002 100 мм 0.6 мм" },
  { colorName: "Фиолетовый RAL 4007", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 6400, purchasePriceMinor: 640000, roll100mPriceMinor: 640000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Фиолетовый RAL 4007 40 мм 0.6 мм" },
  { colorName: "Фиолетовый RAL 4007", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 9700, purchasePriceMinor: 970000, roll100mPriceMinor: 970000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Фиолетовый RAL 4007 60 мм 0.6 мм" },
  { colorName: "Фиолетовый RAL 4007", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Фиолетовый RAL 4007 80 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 20, thicknessMm: 0.6, pricePerLmMinor: 5100, purchasePriceMinor: 510000, roll100mPriceMinor: 510000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 20 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 30, thicknessMm: 0.6, pricePerLmMinor: 5400, purchasePriceMinor: 540000, roll100mPriceMinor: 540000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 30 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 40, thicknessMm: 0.5, pricePerLmMinor: 4900, purchasePriceMinor: 490000, roll100mPriceMinor: 490000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 40 мм 0.5 мм" },
  { colorName: "Черный RAL 9005", widthMm: 40, thicknessMm: 0.6, pricePerLmMinor: 5500, purchasePriceMinor: 550000, roll100mPriceMinor: 550000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 40 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 50, thicknessMm: 0.5, pricePerLmMinor: 6200, purchasePriceMinor: 620000, roll100mPriceMinor: 620000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 50 мм 0.5 мм" },
  { colorName: "Черный RAL 9005", widthMm: 50, thicknessMm: 0.6, pricePerLmMinor: 7500, purchasePriceMinor: 750000, roll100mPriceMinor: 750000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 50 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 60, thicknessMm: 0.5, pricePerLmMinor: 7500, purchasePriceMinor: 750000, roll100mPriceMinor: 750000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 60 мм 0.5 мм" },
  { colorName: "Черный RAL 9005", widthMm: 60, thicknessMm: 0.6, pricePerLmMinor: 8000, purchasePriceMinor: 800000, roll100mPriceMinor: 800000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 60 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 60, thicknessMm: 0.8, pricePerLmMinor: 11800, purchasePriceMinor: 1180000, roll100mPriceMinor: 1180000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 60 мм 0.8 мм" },
  { colorName: "Черный RAL 9005", widthMm: 70, thicknessMm: 0.5, pricePerLmMinor: 8700, purchasePriceMinor: 870000, roll100mPriceMinor: 870000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 70 мм 0.5 мм" },
  { colorName: "Черный RAL 9005", widthMm: 70, thicknessMm: 0.6, pricePerLmMinor: 10400, purchasePriceMinor: 1040000, roll100mPriceMinor: 1040000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 70 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 80, thicknessMm: 0.6, pricePerLmMinor: 10700, purchasePriceMinor: 1070000, roll100mPriceMinor: 1070000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 80 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 80, thicknessMm: 0.8, pricePerLmMinor: 15500, purchasePriceMinor: 1550000, roll100mPriceMinor: 1550000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 80 мм 0.8 мм" },
  { colorName: "Черный RAL 9005", widthMm: 90, thicknessMm: 0.6, pricePerLmMinor: 13300, purchasePriceMinor: 1330000, roll100mPriceMinor: 1330000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 90 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 100, thicknessMm: 0.6, pricePerLmMinor: 14900, purchasePriceMinor: 1490000, roll100mPriceMinor: 1490000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 100 мм 0.6 мм" },
  { colorName: "Черный RAL 9005", widthMm: 100, thicknessMm: 0.8, pricePerLmMinor: 19800, purchasePriceMinor: 1980000, roll100mPriceMinor: 1980000, markupPercent: 100, deliveryPriceMinor: 0, workAmount: 100, materialName: "Алюминиевая бортовая лента Черный RAL 9005 100 мм 0.8 мм" },
];

export const DEFAULT_BOARD_TAPE_OPTION =
  boardTapeOptions.find(
    (option) =>
      option.colorName === "Белый RAL 9003" &&
      option.widthMm === 80 &&
      option.thicknessMm === 0.6,
  ) ?? boardTapeOptions[0];

const BOARD_TAPE_COLOR_LABEL_ORDER = [
  "RAL 9003",
  "RAL 9010M",
  "RAL 9010М",

  "RAL 7047",
  "RAL 7043",
  "RAL 7021",
  "RAL 9005",
  "RAL 9006",
  "СЕРЕБРО",

  "ЗОЛОТО",
  "RAL 1021",

  "RAL 2000",
  "RAL 2009",

  "RAL 3020",

  "RAL 4010",
  "RAL 4001",
  "RAL 4007",

  "RAL 5015",
  "RAL 5002",

  "RAL 5018",

  "RAL 6018",
  "RAL 6029",

  "RAL 1011",
  "RAL 8017",
];

export function getBoardTapeColorHex(colorName: string) {
  const normalizedName = colorName.toLowerCase();

  if (normalizedName.includes("ral 7021")) return "#2f3234";
  if (normalizedName.includes("ral 1011")) return "#b98a5d";
  if (normalizedName.includes("ral 1021")) return "#ffd429";
  if (normalizedName.includes("ral 2000")) return "#f28a1a";
  if (normalizedName.includes("ral 2009")) return "#ff6418";
  if (normalizedName.includes("ral 3020")) return "#d3192a";
  if (normalizedName.includes("ral 4001")) return "#6d4688";
  if (normalizedName.includes("ral 4007")) return "#4a1f35";
  if (normalizedName.includes("ral 4010")) return "#df5a96";
  if (normalizedName.includes("ral 5002")) return "#253a8f";
  if (normalizedName.includes("ral 5015")) return "#43a8dd";
  if (normalizedName.includes("ral 5018")) return "#05999b";
  if (normalizedName.includes("ral 6018")) return "#8bc640";
  if (normalizedName.includes("ral 6029")) return "#178142";
  if (normalizedName.includes("ral 7043")) return "#46484a";
  if (normalizedName.includes("ral 7047")) return "#d7d7d7";
  if (normalizedName.includes("ral 8017")) return "#57372a";
  if (normalizedName.includes("ral 9003")) return "#f4f4f1";
  if (normalizedName.includes("ral 9005")) return "#101112";
  if (normalizedName.includes("ral 9006")) return "#bec1c4";
  if (normalizedName.includes("ral 9010")) return "#f1e4c8";
  if (normalizedName.includes("золото")) return "#d9a82f";
  if (normalizedName.includes("серебро")) return "#bec1c4";

  return "#9a9a9a";
}

export function getBoardTapeColorLabel(colorName: string) {
  const normalizedName = colorName.toLowerCase();

  if (normalizedName.includes("золото")) {
    return "ЗОЛОТО";
  }

  if (normalizedName.includes("серебро")) {
    return "СЕРЕБРО";
  }

  const latinRalMatch = colorName.match(/RAL\s*([0-9]{4}[A-ZА-Я]?)/i);

  if (latinRalMatch) {
    return `RAL ${latinRalMatch[1].toUpperCase()}`;
  }

  const cyrillicRalMatch = colorName.match(/РАЛ\s*([0-9]{4}[A-ZА-Я]?)/i);

  if (cyrillicRalMatch) {
    return `RAL ${cyrillicRalMatch[1].toUpperCase()}`;
  }

  const numberMatch = colorName.match(/[0-9]{4}[A-ZА-Я]?/i);

  if (numberMatch) {
    return `RAL ${numberMatch[0].toUpperCase()}`;
  }

  return colorName.toUpperCase();
}

export function getBoardTapeColorTooltipLabel(colorName: string) {
  const colorLabel = getBoardTapeColorLabel(colorName);

  if (!colorLabel.startsWith("RAL ")) {
    return colorName;
  }

  const colorNameWithoutRal = colorName
    .replace(/RAL\s*[0-9]{4}[A-ZА-Я]?/i, "")
    .replace(/РАЛ\s*[0-9]{4}[A-ZА-Я]?/i, "")
    .trim()
    .replace(/[-–—]\s*$/, "")
    .trim();

  return colorNameWithoutRal
    ? `${colorLabel} ${colorNameWithoutRal}`
    : colorLabel;
}

function getBoardTapeColorOrder(colorName: string) {
  const label = getBoardTapeColorLabel(colorName).toUpperCase();
  const orderIndex = BOARD_TAPE_COLOR_LABEL_ORDER.indexOf(label);

  return orderIndex === -1 ? Number.MAX_SAFE_INTEGER : orderIndex;
}

export function getBoardTapeColorOptions() {
  return Array.from(new Set(boardTapeOptions.map((option) => option.colorName))).sort(
    (firstColorName, secondColorName) =>
      getBoardTapeColorOrder(firstColorName) -
        getBoardTapeColorOrder(secondColorName) ||
      firstColorName.localeCompare(secondColorName, "ru"),
  );
}

export function getBoardTapeWidthOptions(colorName: string) {
  return Array.from(
    new Set(
      boardTapeOptions
        .filter((option) => option.colorName === colorName)
        .map((option) => option.widthMm),
    ),
  ).sort((first, second) => first - second);
}

export function getBoardTapeThicknessOptions(colorName: string, widthMm: number) {
  return Array.from(
    new Set(
      boardTapeOptions
        .filter(
          (option) => option.colorName === colorName && option.widthMm === widthMm,
        )
        .map((option) => option.thicknessMm),
    ),
  ).sort((first, second) => first - second);
}

const AUTO_BOARD_TAPE_THICKNESS_PRIORITY = [0.6, 0.8] as const;

export function getAutoBoardTapeWidthOptions(colorName: string) {
  return getBoardTapeWidthOptions(colorName).filter((widthMm) =>
    AUTO_BOARD_TAPE_THICKNESS_PRIORITY.some((thicknessMm) =>
      boardTapeOptions.some(
        (option) =>
          option.colorName === colorName &&
          option.widthMm === widthMm &&
          option.thicknessMm === thicknessMm,
      ),
    ),
  );
}

export function getAutoBoardTapeOption({
  colorName,
  widthMm,
}: {
  colorName: string;
  widthMm: number;
}) {
  for (const thicknessMm of AUTO_BOARD_TAPE_THICKNESS_PRIORITY) {
    const option = boardTapeOptions.find(
      (boardTapeOption) =>
        boardTapeOption.colorName === colorName &&
        boardTapeOption.widthMm === widthMm &&
        boardTapeOption.thicknessMm === thicknessMm,
    );

    if (option) {
      return option;
    }
  }

  throw new Error(
    `No supported board tape option for ${colorName}, ${widthMm} mm. Supported auto thicknesses: ${AUTO_BOARD_TAPE_THICKNESS_PRIORITY.join(", ")} mm.`,
  );
}

export function getBoardTapeOption({
  colorName,
  thicknessMm,
  widthMm,
}: {
  colorName: string;
  thicknessMm: number;
  widthMm: number;
}) {
  return (
    boardTapeOptions.find(
      (option) =>
        option.colorName === colorName &&
        option.widthMm === widthMm &&
        option.thicknessMm === thicknessMm,
    ) ?? DEFAULT_BOARD_TAPE_OPTION
  );
}
