import {
  createDocument,
  type DiagramElement,
  type DiagramDocument,
} from "./document";
import type { ImageAsset } from "./assets";
import type { DisplayRule } from "./rules";
function image(
  id: string,
  name: string,
  color: string,
  background = false,
): ImageAsset {
  const canvas = document.createElement("canvas");
  canvas.width = background ? 960 : 180;
  canvas.height = background ? 640 : 130;
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = "#f7fafc";
    ctx.fillRect(0, 0, 960, 640);
    ctx.strokeStyle = "#dce6ec";
    ctx.lineWidth = 1;
    for (let x = 20; x < 960; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }
    for (let y = 20; y < 640; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(960, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(24, 20, 912, 110);
    ctx.fillRect(24, 160, 465, 395);
    ctx.fillRect(510, 160, 425, 395);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 180, 130);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(90, 57, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(90, 23);
    ctx.lineTo(107, 54);
    ctx.lineTo(125, 71);
    ctx.lineTo(89, 72);
    ctx.lineTo(57, 83);
    ctx.lineTo(72, 53);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(49, 96, 83, 8);
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, 90, 122);
  }
  return {
    id,
    name,
    mime: "image/png",
    dataUrl: canvas.toDataURL("image/png"),
  };
}
const condition = (
  pointId: string,
  operator: "gt" | "eq" | "lt",
  value: number,
) => ({ pointId, operator, value });
function rule(
  id: string,
  conditions: DisplayRule["conditions"],
  effects: DisplayRule["effects"],
): DisplayRule {
  return { id, mode: "all", conditions, effects };
}
export function createDemo(): DiagramDocument {
  const doc = createDocument("冷却回路 · 实时监控", 960, 640);
  const stop = image("demo-stop", "STOP", "#64748b"),
    run = image("demo-run", "RUNNING", "#0d9488"),
    fault = image("demo-fault", "FAULT", "#dc2626"),
    bg = image("demo-bg", "回路底图", "#fff", true);
  doc.assets = Object.fromEntries([stop, run, fault, bg].map((a) => [a.id, a]));
  doc.page.background = {
    color: "#f7fafc",
    imageId: bg.id,
    mode: "stretch",
    opacity: 0.65,
  };
  const item = (
    id: string,
    kind: DiagramElement["kind"],
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): DiagramElement => ({
    id,
    kind,
    name,
    text: name,
    x,
    y,
    width,
    height,
    color: "#0d9488",
  });
  const hot = rule("hot", [condition("temperature", "gt", 80)], {
    color: "#dc2626",
  });
  const pump: DiagramElement = {
    ...item("demo-pump", "device", "循环水泵 P-01", 65, 230, 180, 130),
    binding: "temperature",
    defaultImageId: stop.id,
    interaction: { action: "details" },
    rules: [
      rule("fault", [condition("fault", "eq", 1)], { imageId: fault.id }),
      rule("running", [condition("running", "eq", 1)], { imageId: run.id }),
      hot,
    ],
  };
  const flowRules = [
    rule("stopped", [condition("running", "eq", 0)], {
      flow: { enabled: true, direction: "stopped", speed: 1 },
    }),
    rule("reverse", [condition("flow", "lt", 0)], {
      flow: { enabled: true, direction: "reverse", speed: 1.5 },
    }),
    rule("forward", [condition("running", "eq", 1)], {
      flow: { enabled: true, direction: "forward", speed: 1 },
    }),
  ];
  const straight: DiagramElement = {
    ...item("demo-line", "line", "供水管线", 245, 276, 230, 28),
    line: {
      type: "straight",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      strokeWidth: 8,
      dash: "solid",
      startArrow: false,
      endArrow: true,
    },
    flow: { enabled: true, direction: "forward", speed: 1 },
    rules: flowRules,
  };
  const poly: DiagramElement = {
    ...item("demo-poly", "line", "回水折线", 155, 382, 320, 55),
    line: {
      type: "polyline",
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      strokeWidth: 4,
      dash: "dashed",
      startArrow: false,
      endArrow: true,
    },
    flow: { enabled: true, direction: "reverse", speed: 0.75 },
  };
  const curve: DiagramElement = {
    ...item("demo-curve", "line", "旁路曲线", 245, 182, 230, 62),
    line: {
      type: "curve",
      points: [
        { x: 0, y: 1 },
        { x: 0.25, y: 0 },
        { x: 0.75, y: 0 },
        { x: 1, y: 1 },
      ],
      strokeWidth: 3,
      dash: "solid",
      startArrow: false,
      endArrow: true,
    },
    color: "#3b82f6",
  };
  const second = createDocument("设备详情", 960, 640);
  doc.elements = [
    {
      ...item("demo-title", "text", "冷却回路监控", 44, 36, 690, 40),
      color: "#183747",
    },
    {
      ...item(
        "demo-subtitle",
        "text",
        "PUMP ROOM 01  /  温度 · 运行状态 · 管线流向",
        46,
        90,
        810,
        24,
      ),
      color: "#64748b",
    },
    straight,
    poly,
    curve,
    pump,
    {
      ...item(
        "demo-chart",
        "chart",
        "温度趋势 / 最近一小时",
        540,
        190,
        350,
        195,
      ),
      binding: "temperature",
      rules: [hot],
      interaction: { action: "details" },
    },
    {
      ...item("demo-metric", "metric", "供水温度", 540, 410, 350, 105),
      binding: "temperature",
      rules: [hot],
      interaction: { action: "details" },
    },
    {
      ...item("demo-link", "text", "设备详情 →", 65, 490, 300, 36),
      interaction: { action: "navigate", pageId: second.page.id },
    },
  ];
  second.elements = [
    {
      ...item("demo-detail-title", "text", "设备运行详情", 60, 60, 650, 48),
      color: "#183747",
    },
    {
      ...item("demo-back", "text", "← 返回冷却回路", 60, 160, 400, 48),
      interaction: { action: "navigate", pageId: doc.page.id },
    },
  ];
  doc.otherPages = [
    { name: second.name, page: second.page, elements: second.elements },
  ];
  return doc;
}
