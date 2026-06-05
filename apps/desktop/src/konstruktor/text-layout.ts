import { Vector2 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { Curve, Path, Shape } from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

export const KONSTRUKTOR_REFERENCE_LETTER = "А";
export const KONSTRUKTOR_SCENE_WIDTH = 1200;
export const KONSTRUKTOR_SCENE_HEIGHT = 900;

const KONSTRUKTOR_CURVE_SAMPLE_SEGMENTS = 96;
const ROBOTO_BLACK_FONT_URL = "/fonts/Roboto-Black.ttf";

export type KonstruktorTextObject = {
  id: string;
  text: string;
  x: number;
  y: number;
  boardTapeColorName?: string;
  boardWidthMm?: number;
  faceFilmColorCode?: string;
  kind?: "text" | "svg";
  heightMm?: string;
  widthMm?: string;
  name?: string;
  splitGroupId?: string;
  sourceText?: string;
  svgMarkup?: string;
  svgShapeIndexes?: number[];
  textLetterIndexes?: number[];
};

export type KonstruktorBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type KonstruktorLetterLayout = {
  char: string;
  objectId: string;
  objectIndex: number;
  letterIndex: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  shapes: Shape[];
  bounds: KonstruktorBounds;
};

export type KonstruktorObjectLayout = {
  id: string;
  text: string;
  objectIndex: number;
  x: number;
  y: number;
  boardTapeColorName?: string;
  boardWidthMm?: number;
  faceFilmColorCode?: string;
  targetHeightMm: number;
  letters: KonstruktorLetterLayout[];
  bounds: KonstruktorBounds;
};

export type KonstruktorTextLayout = {
  objects: KonstruktorObjectLayout[];
  bounds: KonstruktorBounds;
  sceneWidth: number;
  sceneHeight: number;
  targetHeightMm: number;
  referenceLetter: string;
  title: string;
};

export type KonstruktorPreviewSvgModel = {
  markup: string;
  viewBox: string;
  text: string;
  lines: string[];
  width: number;
  height: number;
};

export type KonstruktorPreviewObjectColors = Record<
  string,
  {
    boardColorHex?: string;
    boardColorName?: string;
    faceColorCode?: string;
    faceColorHex?: string;
  }
>;

let robotoBlackFontPromise: Promise<Font> | null = null;

export function escapeKonstruktorSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function formatKonstruktorNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number.parseFloat(value.toFixed(3)).toString();
}

export function getKonstruktorNumericHeightMm(value: string) {
  const numericHeight = Number.parseFloat(value.replace(",", "."));

  if (!Number.isFinite(numericHeight)) {
    return 400;
  }

  return Math.min(2000, Math.max(50, numericHeight));
}

function getKonstruktorNumericSvgHeightMm(value: string) {
  const numericHeight = Number.parseFloat(value.replace(",", "."));

  if (!Number.isFinite(numericHeight)) {
    return 400;
  }

  return Math.max(1, numericHeight);
}

function getKonstruktorNumericSvgWidthMm(value?: string | null) {
  if (!value) {
    return null;
  }

  const numericWidth = Number.parseFloat(value.replace(",", "."));

  if (!Number.isFinite(numericWidth) || numericWidth <= 0) {
    return null;
  }

  return Math.max(1, numericWidth);
}

export function normalizeKonstruktorText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKonstruktorObjectText(value: string) {
  const normalizedText = normalizeKonstruktorText(value);

  if (!normalizedText) {
    return "ТЕКСТ";
  }

  return normalizedText.toUpperCase();
}

export function getSafeKonstruktorTextObjects(
  textObjects: KonstruktorTextObject[],
): KonstruktorTextObject[] {
  return textObjects.length > 0
    ? textObjects
    : [
        {
          id: "text-1",
          text: "Диез Имидж",
          heightMm: "400",
          x: 0,
          y: 0,
        },
      ];
}

export async function loadKonstruktorRobotoBlackFont() {
  if (!robotoBlackFontPromise) {
    robotoBlackFontPromise = new TTFLoader()
      .loadAsync(ROBOTO_BLACK_FONT_URL)
      .then((fontJson) => new FontLoader().parse(fontJson));
  }

  return robotoBlackFontPromise;
}

function transformPointToSvg(
  point: Vector2,
  offsetX: number,
  offsetY: number,
  originX: number,
  originY: number,
  scale: number,
  scaleY = scale,
) {
  return {
    x: originX + point.x * scale + offsetX,
    y: originY - (point.y * scaleY + offsetY),
  };
}

function getCurveSvgStart(curve: Curve<Vector2>) {
  const curveWithKnownPoints = curve as Curve<Vector2> & {
    v0?: Vector2;
    v1?: Vector2;
  };

  return curveWithKnownPoints.v0 ?? curveWithKnownPoints.v1 ?? curve.getPoint(0);
}

function curveToSvgSegment(
  curve: Curve<Vector2>,
  offsetX: number,
  offsetY: number,
  originX: number,
  originY: number,
  scale: number,
  scaleY = scale,
) {
  const curveData = curve as Curve<Vector2> & {
    v1?: Vector2;
    v2?: Vector2;
    v0?: Vector2;
    v3?: Vector2;
  };

  if (curve.type === "LineCurve" && curveData.v2) {
    const end = transformPointToSvg(
      curveData.v2,
      offsetX,
      offsetY,
      originX,
      originY,
      scale,
      scaleY,
    );

    return `L ${formatKonstruktorNumber(end.x)} ${formatKonstruktorNumber(end.y)}`;
  }

  if (curve.type === "QuadraticBezierCurve" && curveData.v1 && curveData.v2) {
    const control = transformPointToSvg(
      curveData.v1,
      offsetX,
      offsetY,
      originX,
      originY,
      scale,
      scaleY,
    );
    const end = transformPointToSvg(
      curveData.v2,
      offsetX,
      offsetY,
      originX,
      originY,
      scale,
      scaleY,
    );

    return `Q ${formatKonstruktorNumber(control.x)} ${formatKonstruktorNumber(
      control.y,
    )} ${formatKonstruktorNumber(end.x)} ${formatKonstruktorNumber(end.y)}`;
  }

  if (
    curve.type === "CubicBezierCurve" &&
    curveData.v1 &&
    curveData.v2 &&
    curveData.v3
  ) {
    const controlOne = transformPointToSvg(
      curveData.v1,
      offsetX,
      offsetY,
      originX,
      originY,
      scale,
      scaleY,
    );
    const controlTwo = transformPointToSvg(
      curveData.v2,
      offsetX,
      offsetY,
      originX,
      originY,
      scale,
      scaleY,
    );
    const end = transformPointToSvg(
      curveData.v3,
      offsetX,
      offsetY,
      originX,
      originY,
      scale,
      scaleY,
    );

    return `C ${formatKonstruktorNumber(controlOne.x)} ${formatKonstruktorNumber(
      controlOne.y,
    )} ${formatKonstruktorNumber(controlTwo.x)} ${formatKonstruktorNumber(
      controlTwo.y,
    )} ${formatKonstruktorNumber(end.x)} ${formatKonstruktorNumber(end.y)}`;
  }

  return curve
    .getPoints(KONSTRUKTOR_CURVE_SAMPLE_SEGMENTS)
    .slice(1)
    .map((point) => {
      const transformedPoint = transformPointToSvg(
        point,
        offsetX,
        offsetY,
        originX,
        originY,
        scale,
        scaleY,
      );

      return `L ${formatKonstruktorNumber(transformedPoint.x)} ${formatKonstruktorNumber(
        transformedPoint.y,
      )}`;
    })
    .join(" ");
}

function pathToSvgPathData(
  path: Path,
  offsetX: number,
  offsetY: number,
  originX: number,
  originY: number,
  scale: number,
  scaleY = scale,
) {
  if (path.curves.length === 0) {
    return "";
  }

  const start = transformPointToSvg(
    getCurveSvgStart(path.curves[0]),
    offsetX,
    offsetY,
    originX,
    originY,
    scale,
    scaleY,
  );
  const segments = path.curves
    .map((curve) =>
      curveToSvgSegment(curve, offsetX, offsetY, originX, originY, scale, scaleY),
    )
    .filter(Boolean)
    .join(" ");

  return `M ${formatKonstruktorNumber(start.x)} ${formatKonstruktorNumber(
    start.y,
  )} ${segments} Z`;
}

export function shapeToKonstruktorSvgPathData(
  shape: Shape,
  offsetX: number,
  offsetY: number,
  originX = KONSTRUKTOR_SCENE_WIDTH / 2,
  originY = KONSTRUKTOR_SCENE_HEIGHT / 2,
  scale = 1,
  scaleY = scale,
) {
  const outerPath = pathToSvgPathData(
    shape,
    offsetX,
    offsetY,
    originX,
    originY,
    scale,
    scaleY,
  );
  const holePaths = shape.holes
    .map((hole) =>
      pathToSvgPathData(hole, offsetX, offsetY, originX, originY, scale, scaleY),
    )
    .filter(Boolean);

  return [outerPath, ...holePaths].filter(Boolean).join(" ");
}

function transformPointToSceneBounds(
  point: Vector2,
  offsetX: number,
  offsetY: number,
  scale: number,
  scaleY = scale,
) {
  return {
    x: point.x * scale + offsetX,
    y: point.y * scaleY + offsetY,
  };
}

function getPathBounds(
  path: Path,
  offsetX: number,
  offsetY: number,
  scale: number,
  scaleY = scale,
) {
  const points = path.curves.flatMap((curve) =>
    curve
      .getPoints(KONSTRUKTOR_CURVE_SAMPLE_SEGMENTS)
      .map((point) =>
        transformPointToSceneBounds(point, offsetX, offsetY, scale, scaleY),
      ),
  );

  if (points.length === 0) {
    return null;
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function getKonstruktorShapeBounds(
  shape: Shape,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  scaleY = scale,
) {
  const paths = [shape, ...shape.holes];
  const bounds = paths
    .map((path) => getPathBounds(path, offsetX, offsetY, scale, scaleY))
    .filter((bound): bound is KonstruktorBounds => Boolean(bound));

  if (bounds.length === 0) {
    return null;
  }

  return combineKonstruktorBounds(bounds);
}

export function combineKonstruktorBounds(bounds: KonstruktorBounds[]) {
  return {
    minX: Math.min(...bounds.map((bound) => bound.minX)),
    minY: Math.min(...bounds.map((bound) => bound.minY)),
    maxX: Math.max(...bounds.map((bound) => bound.maxX)),
    maxY: Math.max(...bounds.map((bound) => bound.maxY)),
  };
}

function getShapesBounds(shapes: Shape[]) {
  const bounds = shapes
    .map((shape) => getKonstruktorShapeBounds(shape))
    .filter((bound): bound is KonstruktorBounds => Boolean(bound));

  if (bounds.length === 0) {
    return null;
  }

  return combineKonstruktorBounds(bounds);
}

function getFontGlyphAdvance(font: Font, char: string, fontSize: number) {
  const fontWithData = font as Font & {
    data?: {
      glyphs?: Record<string, { ha?: number }>;
      resolution?: number;
    };
  };
  const resolution = fontWithData.data?.resolution || 1000;
  const glyph = fontWithData.data?.glyphs?.[char];

  if (typeof glyph?.ha === "number") {
    return (glyph.ha / resolution) * fontSize;
  }

  const bounds = getShapesBounds(font.generateShapes(char, fontSize));

  if (!bounds) {
    return fontSize * 0.55;
  }

  return Math.max(bounds.maxX - bounds.minX, fontSize * 0.35);
}

function getLineAdvance(font: Font, line: string, fontSize: number) {
  return Array.from(line).reduce((sum, char) => {
    return sum + getFontGlyphAdvance(font, char, fontSize);
  }, 0);
}

function getLetterBounds(
  letter: Pick<
    KonstruktorLetterLayout,
    "shapes" | "offsetX" | "offsetY" | "scale" | "scaleX" | "scaleY"
  >,
) {
  const bounds = letter.shapes
    .map((shape) =>
      getKonstruktorShapeBounds(
        shape,
        letter.offsetX,
        letter.offsetY,
        letter.scaleX ?? letter.scale,
        letter.scaleY ?? letter.scale,
      ),
    )
    .filter((bound): bound is KonstruktorBounds => Boolean(bound));

  if (bounds.length === 0) {
    return null;
  }

  return combineKonstruktorBounds(bounds);
}

function sanitizeSvgMarkup(markup: string) {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
}

function parseSvgMetricNumber(value: string) {
  const parsedValue = Number.parseFloat(value.trim().replace(",", "."));

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function parseSvgMetricLengthToMm(value: string) {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(
    /^([+-]?\d+(?:[.,]\d+)?)\s*(mm|cm|in|px|pt|pc)?$/i,
  );

  if (!match) {
    return null;
  }

  const numericValue = parseSvgMetricNumber(match[1]);

  if (numericValue === null) {
    return null;
  }

  const unit = match[2]?.toLowerCase();

  if (!unit) {
    return null;
  }

  if (unit === "mm") return numericValue;
  if (unit === "cm") return numericValue * 10;
  if (unit === "in") return numericValue * 25.4;
  if (unit === "px") return (numericValue * 25.4) / 96;
  if (unit === "pt") return (numericValue * 25.4) / 72;
  if (unit === "pc") return (numericValue * 25.4) / 6;

  return null;
}

function getSvgStyleMetricLength(
  styleAttribute: string | null,
  propertyName: string,
) {
  if (!styleAttribute) {
    return null;
  }

  const escapedPropertyName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styleAttribute.match(
    new RegExp(`(?:^|;)\\s*${escapedPropertyName}\\s*:\\s*([^;]+)`, "i"),
  );

  return match?.[1] ?? null;
}

function getSvgRootPhysicalMetrics(svgMarkup: string) {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const document = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");

  if (document.querySelector("parsererror")) {
    return null;
  }

  const svgElement = document.documentElement;

  if (svgElement.tagName.toLowerCase() !== "svg") {
    return null;
  }

  const styleAttribute = svgElement.getAttribute("style");
  const widthLength =
    svgElement.getAttribute("width") ??
    getSvgStyleMetricLength(styleAttribute, "width");
  const heightLength =
    svgElement.getAttribute("height") ??
    getSvgStyleMetricLength(styleAttribute, "height");
  const viewBoxAttribute = svgElement.getAttribute("viewBox");
  const viewBoxValues = viewBoxAttribute
    ?.trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value.replace(",", ".")));

  const viewBox =
    viewBoxValues?.length === 4 &&
    viewBoxValues.every((value) => Number.isFinite(value))
      ? {
          height: Math.abs(viewBoxValues[3]),
          width: Math.abs(viewBoxValues[2]),
        }
      : null;

  return {
    heightMm: heightLength ? parseSvgMetricLengthToMm(heightLength) : null,
    viewBox,
    widthMm: widthLength ? parseSvgMetricLengthToMm(widthLength) : null,
  };
}

function flipSvgVectorY(vector?: Vector2) {
  if (vector) {
    vector.y *= -1;
  }
}

function flipSvgPathY(path: Path) {
  path.curves.forEach((curve) => {
    const curveWithGeometry = curve as Curve<Vector2> & {
      aClockwise?: boolean;
      aEndAngle?: number;
      aRotation?: number;
      aStartAngle?: number;
      aY?: number;
      v0?: Vector2;
      v1?: Vector2;
      v2?: Vector2;
      v3?: Vector2;
    };

    flipSvgVectorY(curveWithGeometry.v0);
    flipSvgVectorY(curveWithGeometry.v1);
    flipSvgVectorY(curveWithGeometry.v2);
    flipSvgVectorY(curveWithGeometry.v3);

    if (typeof curveWithGeometry.aY === "number") {
      curveWithGeometry.aY *= -1;
    }

    if (typeof curveWithGeometry.aStartAngle === "number") {
      curveWithGeometry.aStartAngle *= -1;
    }

    if (typeof curveWithGeometry.aEndAngle === "number") {
      curveWithGeometry.aEndAngle *= -1;
    }

    if (typeof curveWithGeometry.aRotation === "number") {
      curveWithGeometry.aRotation *= -1;
    }

    if (typeof curveWithGeometry.aClockwise === "boolean") {
      curveWithGeometry.aClockwise = !curveWithGeometry.aClockwise;
    }
  });
}

function flipSvgShapeY(shape: Shape) {
  flipSvgPathY(shape);
  shape.holes.forEach((hole) => flipSvgPathY(hole));

  return shape;
}

export function getKonstruktorSvgMarkupNaturalSize(svgMarkup: string) {
  const loader = new SVGLoader();
  const svgData = loader.parse(sanitizeSvgMarkup(svgMarkup));
  const shapes = svgData.paths
    .flatMap((path) => SVGLoader.createShapes(path))
    .map((shape) => flipSvgShapeY(shape));
  const rawBounds = getShapesBounds(shapes);

  if (!rawBounds) {
    return null;
  }

  const rawWidth = Math.abs(rawBounds.maxX - rawBounds.minX);
  const rawHeight = Math.abs(rawBounds.maxY - rawBounds.minY);

  if (
    !Number.isFinite(rawWidth) ||
    !Number.isFinite(rawHeight) ||
    rawWidth <= 0 ||
    rawHeight <= 0
  ) {
    return null;
  }

  const rootMetrics = getSvgRootPhysicalMetrics(svgMarkup);

  if (
    rootMetrics?.viewBox &&
    rootMetrics.widthMm !== null &&
    rootMetrics.heightMm !== null &&
    rootMetrics.viewBox.width > 0 &&
    rootMetrics.viewBox.height > 0
  ) {
    const scaleX = rootMetrics.widthMm / rootMetrics.viewBox.width;
    const scaleY = rootMetrics.heightMm / rootMetrics.viewBox.height;

    if (
      Number.isFinite(scaleX) &&
      Number.isFinite(scaleY) &&
      scaleX > 0 &&
      scaleY > 0
    ) {
      return {
        bounds: rawBounds,
        heightMm: rawHeight * scaleY,
        widthMm: rawWidth * scaleX,
      };
    }
  }

  return {
    bounds: rawBounds,
    heightMm: rawHeight,
    widthMm: rawWidth,
  };
}

function createSvgObjectLetters({
  object,
  objectIndex,
  fontSize,
}: {
  object: KonstruktorTextObject;
  objectIndex: number;
  fontSize: number;
}) {
  if (!object.svgMarkup) {
    return [];
  }

  const loader = new SVGLoader();
  const svgData = loader.parse(sanitizeSvgMarkup(object.svgMarkup));
  const shapes = svgData.paths
    .flatMap((path) => SVGLoader.createShapes(path))
    .map((shape) => flipSvgShapeY(shape));
  const rawBounds = getShapesBounds(shapes);

  if (!rawBounds) {
    return [];
  }

  const rawWidth = rawBounds.maxX - rawBounds.minX;
  const rawHeight = rawBounds.maxY - rawBounds.minY;
  const svgWidthMm = getKonstruktorNumericSvgWidthMm(object.widthMm);
  const objectScaleY = rawHeight > 0 ? fontSize / rawHeight : 1;
  const objectScaleX =
    svgWidthMm !== null && rawWidth > 0 ? svgWidthMm / rawWidth : objectScaleY;
  const objectScale = objectScaleY;
  const rawCenterX = (rawBounds.minX + rawBounds.maxX) / 2;
  const rawCenterY = (rawBounds.minY + rawBounds.maxY) / 2;
  const offsetX = object.x - rawCenterX * objectScaleX;
  const offsetY = -object.y - rawCenterY * objectScaleY;
  const allowedShapeIndexes =
    object.svgShapeIndexes && object.svgShapeIndexes.length > 0
      ? new Set(object.svgShapeIndexes)
      : null;

  return shapes
    .map((shape, shapeIndex): KonstruktorLetterLayout | null => {
      if (allowedShapeIndexes && !allowedShapeIndexes.has(shapeIndex)) {
        return null;
      }

      const bounds = getKonstruktorShapeBounds(
        shape,
        offsetX,
        offsetY,
        objectScaleX,
        objectScaleY,
      );

      if (!bounds) {
        return null;
      }

      return {
        bounds,
        char: "SVG",
        letterIndex: shapeIndex,
        objectId: object.id,
        objectIndex,
        offsetX,
        offsetY,
        scale: objectScale,
        scaleX: objectScaleX,
        scaleY: objectScaleY,
        shapes: [shape],
      };
    })
    .filter((letter): letter is KonstruktorLetterLayout => Boolean(letter));
}

function createObjectLetters({
  font,
  object,
  objectIndex,
  fontSize,
  targetHeightMm,
}: {
  font: Font;
  object: KonstruktorTextObject;
  objectIndex: number;
  fontSize: number;
  targetHeightMm: number;
}) {
  if (object.kind === "svg") {
    return createSvgObjectLetters({
      fontSize: targetHeightMm,
      object,
      objectIndex,
    });
  }

  const label = normalizeKonstruktorObjectText(object.sourceText ?? object.text);
  const chars = Array.from(label);
  const lineAdvance = getLineAdvance(font, label, fontSize);
  let penX = -lineAdvance / 2;
  const rawLetters = chars.flatMap((char, letterIndex): KonstruktorLetterLayout[] => {
    const advance = getFontGlyphAdvance(font, char, fontSize);

    if (!char.trim()) {
      penX += advance;
      return [];
    }

    const shapes = font.generateShapes(char, fontSize);
    const bounds = getShapesBounds(shapes);

    if (!bounds) {
      penX += advance;
      return [];
    }

    const placement: KonstruktorLetterLayout = {
      bounds,
      char,
      letterIndex,
      objectId: object.id,
      objectIndex,
      offsetX: penX,
      offsetY: 0,
      scale: 1,
      shapes,
    };

    penX += advance;

    return [placement];
  });

  if (rawLetters.length === 0) {
    return [];
  }

  const rawBounds = combineKonstruktorBounds(
    rawLetters
      .map((letter) => getLetterBounds(letter))
      .filter((bound): bound is KonstruktorBounds => Boolean(bound)),
  );
  const objectCenterX = (rawBounds.minX + rawBounds.maxX) / 2;
  const objectCenterY = (rawBounds.minY + rawBounds.maxY) / 2;

  const allowedLetterIndexes =
    object.textLetterIndexes && object.textLetterIndexes.length > 0
      ? new Set(object.textLetterIndexes)
      : null;

  return rawLetters
    .map((letter) => {
      const offsetX = letter.offsetX - objectCenterX + object.x;
      const offsetY = letter.offsetY - objectCenterY - object.y;
      const bounds = getLetterBounds({
        ...letter,
        offsetX,
        offsetY,
      });

      return {
        ...letter,
        bounds: bounds ?? letter.bounds,
        offsetX,
        offsetY,
      };
    })
    .filter((letter) =>
      allowedLetterIndexes ? allowedLetterIndexes.has(letter.letterIndex) : true,
    );
}

export async function createKonstruktorTextLayout({
  textObjects,
  targetHeightMm,
  referenceLetter = KONSTRUKTOR_REFERENCE_LETTER,
}: {
  textObjects: KonstruktorTextObject[];
  targetHeightMm: string;
  referenceLetter?: string;
}): Promise<KonstruktorTextLayout> {
  const font = await loadKonstruktorRobotoBlackFont();
  const safeObjects = getSafeKonstruktorTextObjects(textObjects);
  const fallbackTargetHeight = getKonstruktorNumericHeightMm(targetHeightMm);
  const referenceShapes = font.generateShapes(referenceLetter, 100);
  const referenceBounds = getShapesBounds(referenceShapes);
  const referenceHeight = referenceBounds
    ? Math.abs(referenceBounds.maxY - referenceBounds.minY)
    : 100;

  const objects = safeObjects.map((object, objectIndex): KonstruktorObjectLayout => {
    const objectTargetHeight =
      object.kind === "svg"
        ? getKonstruktorNumericSvgHeightMm(object.heightMm ?? targetHeightMm)
        : getKonstruktorNumericHeightMm(object.heightMm ?? targetHeightMm);
    const fontSize =
      referenceHeight > 0
        ? (objectTargetHeight / referenceHeight) * 100
        : objectTargetHeight;
    const letters = createObjectLetters({
      font,
      fontSize,
      object,
      objectIndex,
      targetHeightMm: objectTargetHeight,
    });

    if (letters.length === 0) {
      throw new Error(`Konstruktor layout has no letters for object ${object.id}`);
    }

    const objectBounds = combineKonstruktorBounds(
      letters
        .map((letter) => letter.bounds)
        .filter((bound): bound is KonstruktorBounds => Boolean(bound)),
    );

    return {
      bounds: objectBounds,
      boardTapeColorName: object.boardTapeColorName,
      boardWidthMm: object.boardWidthMm,
      faceFilmColorCode: object.faceFilmColorCode,
      id: object.id,
      letters,
      objectIndex,
      targetHeightMm: objectTargetHeight,
      text:
        object.kind === "svg"
          ? object.name?.replace(/\.svg$/i, "") || object.text || "SVG"
          : normalizeKonstruktorObjectText(object.text),
      x: object.x,
      y: object.y,
    };
  });

  const bounds = combineKonstruktorBounds(objects.map((object) => object.bounds));
  const title = safeObjects
    .map((object) =>
      object.kind === "svg"
        ? object.name?.replace(/\.svg$/i, "") || object.text || "SVG"
        : normalizeKonstruktorText(object.text),
    )
    .filter(Boolean)
    .join(" / ");

  return {
    bounds,
    objects,
    referenceLetter,
    sceneHeight: KONSTRUKTOR_SCENE_HEIGHT,
    sceneWidth: KONSTRUKTOR_SCENE_WIDTH,
    targetHeightMm: Math.max(
      fallbackTargetHeight,
      ...safeObjects.map((object) =>
        object.kind === "svg"
          ? getKonstruktorNumericSvgHeightMm(object.heightMm ?? targetHeightMm)
          : getKonstruktorNumericHeightMm(object.heightMm ?? targetHeightMm),
      ),
    ),
    title,
  };
}

export function createKonstruktorPreviewSvg({
  layout,
  objectColors,
  objectPositions,
  scenePan,
  sceneZoom,
}: {
  layout: KonstruktorTextLayout;
  objectColors?: KonstruktorPreviewObjectColors;
  objectPositions?: Record<string, { x: number; y: number }>;
  scenePan: { x: number; y: number };
  sceneZoom: number;
}): KonstruktorPreviewSvgModel {
  const safeSceneZoom = Math.min(4, Math.max(0.25, sceneZoom));
  const svgBounds = {
    maxX: layout.sceneWidth / 2 + layout.bounds.maxX,
    maxY: layout.sceneHeight / 2 - layout.bounds.minY,
    minX: layout.sceneWidth / 2 + layout.bounds.minX,
    minY: layout.sceneHeight / 2 - layout.bounds.maxY,
  };
  const contentWidth = Math.max(1, svgBounds.maxX - svgBounds.minX);
  const contentHeight = Math.max(1, svgBounds.maxY - svgBounds.minY);
  const paddingX = Math.max(24, contentWidth * 0.12);
  const previewContentHeight = Math.max(contentHeight, layout.sceneHeight * 1.4);
  const paddingY = Math.max(24, previewContentHeight * 0.12);
  const viewBoxWidth = (contentWidth + paddingX * 2) / safeSceneZoom;
  const viewBoxHeight = (previewContentHeight + paddingY * 2) / safeSceneZoom;
  const viewBoxCenterX = (svgBounds.minX + svgBounds.maxX) / 2 + scenePan.x;
  const viewBoxCenterY = (svgBounds.minY + svgBounds.maxY) / 2 + scenePan.y;
  const viewBoxX = viewBoxCenterX - viewBoxWidth / 2;
  const viewBoxY = viewBoxCenterY - viewBoxHeight / 2;
  const viewBox = `${formatKonstruktorNumber(viewBoxX)} ${formatKonstruktorNumber(
    viewBoxY,
  )} ${formatKonstruktorNumber(viewBoxWidth)} ${formatKonstruktorNumber(viewBoxHeight)}`;

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"><g fill-rule="evenodd" clip-rule="evenodd">${layout.objects
    .map((object) => {
      const objectColor = objectColors?.[object.id];
      const faceColorHex = objectColor?.faceColorHex ?? "#f4f4f1";
      const objectPosition = objectPositions?.[object.id] ?? {
        x: object.x,
        y: object.y,
      };
      const objectTransform =
        objectPosition.x !== 0 || objectPosition.y !== 0
          ? ` transform="translate(${formatKonstruktorNumber(
              objectPosition.x,
            )} ${formatKonstruktorNumber(objectPosition.y)})"`
          : "";
      const objectHitPadding = Math.max(24, object.targetHeightMm * 0.12);
      const objectHitX =
        KONSTRUKTOR_SCENE_WIDTH / 2 + object.bounds.minX - objectHitPadding;
      const objectHitY =
        KONSTRUKTOR_SCENE_HEIGHT / 2 - object.bounds.maxY - objectHitPadding;
      const objectHitWidth =
        object.bounds.maxX - object.bounds.minX + objectHitPadding * 2;
      const objectHitHeight =
        object.bounds.maxY - object.bounds.minY + objectHitPadding * 2;
      const objectHitRect = `<rect data-text-object-id="${
        object.id
      }" x="${formatKonstruktorNumber(objectHitX)}" y="${formatKonstruktorNumber(
        objectHitY,
      )}" width="${formatKonstruktorNumber(
        objectHitWidth,
      )}" height="${formatKonstruktorNumber(
        objectHitHeight,
      )}" fill="transparent" stroke="none" pointer-events="all" />`;
      const lettersMarkup = object.letters
        .map((letter) =>
          letter.shapes
            .map((shape, shapeIndex) => {
              const pathData = shapeToKonstruktorSvgPathData(
                shape,
                letter.offsetX,
                letter.offsetY,
                KONSTRUKTOR_SCENE_WIDTH / 2,
                KONSTRUKTOR_SCENE_HEIGHT / 2,
                letter.scaleX ?? letter.scale,
                letter.scaleY ?? letter.scale,
              );

              return `<path data-text-object-id="${object.id}" data-letter-index="${letter.letterIndex}" id="preview-letter-${object.objectIndex}-${letter.letterIndex}-${shapeIndex}" d="${pathData}" fill="${escapeKonstruktorSvgText(
                faceColorHex,
              )}" stroke="none" stroke-width="0" fill-rule="evenodd" clip-rule="evenodd" />`;
            })
            .join(""),
        )
        .join("");

      return `<g data-text-object-id="${object.id}" data-face-color-code="${escapeKonstruktorSvgText(
        objectColor?.faceColorCode ?? object.faceFilmColorCode ?? "",
      )}" data-board-color-name="${escapeKonstruktorSvgText(
        objectColor?.boardColorName ?? object.boardTapeColorName ?? "",
      )}"${objectTransform} style="cursor:grab;user-select:none">${objectHitRect}${lettersMarkup}</g>`;
    })
    .join("")}</g></svg>`;

  return {
    height: layout.sceneHeight,
    lines: layout.objects.map((object) => object.text),
    markup,
    text: layout.title,
    viewBox,
    width: layout.sceneWidth,
  };
}
