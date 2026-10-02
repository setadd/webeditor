export const symbolNames = {
  breaker: "断路器",
  isolator: "隔离开关",
  transformer: "变压器",
  ground: "接地",
  fuse: "熔断器",
  motor: "电动机",
  pump: "水泵",
  valve: "阀门",
  chiller: "冷水主机",
  tank: "分集水器",
  pumpIso: "立体水泵",
  valveIso: "立体阀门",
  chillerIso: "立体主机",
  tankIso: "立体分集水器",
  rectangle: "矩形",
  ellipse: "圆形",
  panel: "信息面板",
  button: "跳转按钮",
} as const;
export type SymbolName = keyof typeof symbolNames;
export interface VisualStyle {
  mode?: "card" | "plain";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
  imageFit?: "contain" | "stretch";
  decimals?: number;
  prefix?: string;
  suffix?: string;
}
export function isVisual(value: unknown): value is VisualStyle {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const enumeration = (key: string, allowed: string[]) =>
    v[key] === undefined ||
    (typeof v[key] === "string" && allowed.includes(v[key]));
  const number = (key: string, min: number, max: number) =>
    v[key] === undefined ||
    (typeof v[key] === "number" &&
      Number.isFinite(v[key]) &&
      v[key] >= min &&
      v[key] <= max);
  return (
    ["fill", "stroke"].every(
      (k) =>
        v[k] === undefined ||
        v[k] === "none" ||
        (typeof v[k] === "string" && /^#[\da-f]{6}$/i.test(v[k])),
    ) &&
    ["bold", "flipX", "flipY"].every(
      (k) => v[k] === undefined || typeof v[k] === "boolean",
    ) &&
    ["prefix", "suffix"].every(
      (k) =>
        v[k] === undefined || (typeof v[k] === "string" && v[k].length <= 80),
    ) &&
    number("fontSize", 8, 120) &&
    number("strokeWidth", 0, 20) &&
    number("opacity", 0, 1) &&
    number("decimals", 0, 6) &&
    (v.decimals === undefined || Number.isInteger(v.decimals)) &&
    enumeration("mode", ["card", "plain"]) &&
    enumeration("align", ["left", "center", "right"]) &&
    enumeration("imageFit", ["contain", "stretch"])
  );
}
