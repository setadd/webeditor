import {
  createElement,
  type DiagramDocument,
  type DiagramElement,
  type ElementKind,
} from "./document";
import { symbolNames, type SymbolName } from "./visual";
export type ComponentId =
  Exclude<ElementKind, "line"> | SymbolName | "image" | "dataText";
interface ComponentPreset {
  id: ComponentId;
  kind: ElementKind;
  name: string;
  category: string;
  description: string;
  preset?: Partial<DiagramElement>;
}
export const componentCatalog: ComponentPreset[] = [
  {
    id: "device",
    kind: "device",
    name: "设备",
    category: "device",
    description: "设备与多图片状态",
  },
  {
    id: "chart",
    kind: "chart",
    name: "趋势图",
    category: "data",
    description: "点位历史趋势",
  },
  {
    id: "metric",
    kind: "metric",
    name: "指标",
    category: "data",
    description: "实时数值与单位",
  },
  {
    id: "text",
    kind: "text",
    name: "文字",
    category: "basic",
    description: "标题与说明文字",
  },
  {
    id: "dataText",
    kind: "text",
    name: "数据文字",
    category: "basic",
    description: "透明数值、前后缀与精度",
    preset: {
      text: "",
      visual: { mode: "plain", fontSize: 18, decimals: 2, align: "left" },
      color: "#00cc77",
    },
  },
  {
    id: "image",
    kind: "device",
    name: "图片",
    category: "device",
    description: "上传透明设备图与状态图",
    preset: {
      text: "上传设备图片",
      visual: { mode: "plain", fill: "none", stroke: "none" },
    },
  },
  ...Object.entries(symbolNames).map(([id, name]): ComponentPreset => {
    const electrical = [
      "breaker",
      "isolator",
      "transformer",
      "ground",
      "fuse",
      "motor",
    ].includes(id);
    const basic = ["rectangle", "ellipse", "panel", "button"].includes(id);
    return {
      id: id as SymbolName,
      kind: "device",
      name,
      category: electrical ? "electrical" : basic ? "basic" : "equipment",
      description: electrical
        ? "可变色电气符号"
        : basic
          ? "可编辑文字与外观"
          : "透明设备图元 · 可镜像",
      preset: {
        symbol: id as SymbolName,
        text: basic ? name : "",
        width: electrical ? 50 : id.includes("chiller") ? 230 : 150,
        height: electrical ? 90 : 100,
        color: electrical ? "#dbad36" : basic ? "#edf3ff" : "#55bfea",
        visual: {
          mode: "plain",
          fill: basic ? "#082b55" : "none",
          ...(basic ? { stroke: "#168aca" } : {}),
          fontSize: 16,
          align: "center",
        },
      },
    };
  }),
];
export function componentPreset(id: string) {
  return componentCatalog.find((item) => item.id === id);
}
export function createComponent(id: ComponentId, document: DiagramDocument) {
  const preset = componentPreset(id);
  if (!preset) throw new Error("未知图元预设");
  const item = createElement(preset.kind, document);
  if (preset.preset)
    Object.assign(item, structuredClone(preset.preset), { name: preset.name });
  return item;
}
