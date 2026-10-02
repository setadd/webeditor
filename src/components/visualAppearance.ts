import type { CellAttrs } from "@antv/x6";
import type { DiagramElement } from "../domain/document";
import { symbolUrl } from "../domain/symbols";

export function applyVisual(
  item: DiagramElement,
  attrs: CellAttrs,
  hasImage: boolean,
) {
  const v = item.visual;
  if (!v && !item.symbol) return attrs;
  const plain = v?.mode === "plain" || !!item.symbol;
  attrs.body = {
    ...attrs.body,
    ...(v?.fill !== undefined ? { fill: v.fill } : {}),
    ...(v?.stroke !== undefined ? { stroke: v.stroke } : {}),
    ...(v?.strokeWidth !== undefined ? { strokeWidth: v.strokeWidth } : {}),
  };
  if (plain) {
    attrs.body = {
      ...attrs.body,
      fill: v?.fill || "none",
      stroke: v?.stroke || "none",
      strokeWidth: v?.strokeWidth ?? 1,
    };
    if (item.kind === "device") {
      for (const key of ["accent", "iconBg", "ring", "rotor", "name", "tag"])
        attrs[key] = { ...attrs[key], display: "none" };
      // Keep a transparent hit target even when only an image or symbol is visible.
      attrs.body = { ...attrs.body,
        fill: item.symbol || !v?.fill || v.fill === "none" ? "transparent" : v.fill,
        stroke: item.symbol ? "none" : v?.stroke || "none",
      };
      attrs.label = {
        ...attrs.label,
        display: !hasImage && item.text ? "inline" : "none",
        text: item.text,
      };
    }
    if (item.kind === "metric")
      attrs.label = { ...attrs.label, display: "none" };
  }
  if (item.symbol)
    attrs.symbolImage = {
      href: symbolUrl(item.symbol, item.color, v),
      x: 0,
      y: 0,
      width: item.width,
      height: item.height,
      display: hasImage ? "none" : "inline",
      preserveAspectRatio: "none",
      pointerEvents: "none",
    };
  const align = v?.align || "center";
  const x =
    align === "left" ? 6 : align === "right" ? item.width - 6 : item.width / 2;
  for (const key of item.kind === "metric" ? ["value"] : ["label"]) {
    if (!attrs[key]) continue;
    attrs[key] = {
      ...attrs[key],
      fontSize: v?.fontSize ?? (item.kind === "text" ? 20 : 18),
      fontWeight: v?.bold ? 700 : 400,
      fill: item.color,
      ...(plain || item.kind === "text"
        ? {
            x,
            y: item.height / 2,
            refX: 0,
            refY: 0,
            textAnchor:
              align === "left" ? "start" : align === "right" ? "end" : "middle",
            textVerticalAnchor: "middle",
            dominantBaseline: "auto",
            textWrap: {
              width: Math.max(1, item.width - 12),
              height: Math.max(1, item.height - 4),
              ellipsis: true,
            },
          }
        : {}),
    };
  }
  for (const key of ["stateImage", "symbolImage"])
    if (attrs[key]) {
      attrs[key] = {
        ...attrs[key],
        transform: `translate(${v?.flipX ? item.width : 0} ${v?.flipY ? item.height : 0}) scale(${v?.flipX ? -1 : 1} ${v?.flipY ? -1 : 1})`,
      };
      if (key === "stateImage")
        attrs[key].preserveAspectRatio =
          v?.imageFit === "stretch" ? "none" : "xMidYMid meet";
    }
  for (const key of Object.keys(attrs))
    attrs[key] = {
      ...attrs[key],
      opacity:
        (typeof attrs[key]?.opacity === "number" ? attrs[key].opacity : 1) *
        (v?.opacity ?? 1),
    };
  return attrs;
}
