export type Point = { x: number; y: number };
export type LineKind = "straight" | "polyline" | "curve";
export interface LineGeometry {
  type: LineKind;
  points: Point[];
  strokeWidth: number;
  dash: "solid" | "dashed";
  startArrow: boolean;
  endArrow: boolean;
}
import type { DiagramElement } from "./document";
export function lineBounds(points: Point[]) {
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  const width = Math.max(20, Math.max(...points.map((p) => p.x)) - x),
    height = Math.max(20, Math.max(...points.map((p) => p.y)) - y);
  return {
    x,
    y,
    width,
    height,
    points: points.map((p) => ({
      x: (p.x - x) / width,
      y: (p.y - y) / height,
    })),
  };
}
export function linePath(item: DiagramElement) {
  const p = item.line!.points.map(
    (p) => `${p.x * item.width} ${p.y * item.height}`,
  );
  return `M ${p[0]} ${
    item.line!.type === "curve"
      ? "C " + p.slice(1).join(" ")
      : p
          .slice(1)
          .map((v) => "L " + v)
          .join(" ")
  }`;
}
export function worldPoints(item: DiagramElement) {
  const a = ((item.rotation || 0) * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return item.line!.points.map((p) => {
    const x = (p.x - 0.5) * item.width,
      y = (p.y - 0.5) * item.height;
    return {
      x: item.x + item.width / 2 + x * c - y * s,
      y: item.y + item.height / 2 + x * s + y * c,
    };
  });
}
export const lineMarkup = [
  { tagName: "path", selector: "hit" },
  { tagName: "path", selector: "line" },
];
export function lineAppearance(item: DiagramElement) {
  const d = linePath(item),
    line = item.line!;
  return {
    hit: {
      d,
      fill: "none",
      stroke: "transparent",
      strokeWidth: Math.max(14, line.strokeWidth + 8),
      pointerEvents: "stroke",
    },
    line: {
      d,
      "data-line-path": item.id,
      fill: "none",
      stroke: item.color,
      strokeWidth: line.strokeWidth,
      strokeDasharray: line.dash === "dashed" ? "10 6" : "",
      sourceMarker: line.startArrow ? { name: "classic", size: 8 } : null,
      targetMarker: line.endArrow ? { name: "classic", size: 8 } : null,
      pointerEvents: "none",
    },
  };
}
