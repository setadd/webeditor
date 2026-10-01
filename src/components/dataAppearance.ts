import type { CellAttrs } from "@antv/x6";
import type { DiagramElement } from "../domain/document";
import type { Sample, HistorySample } from "../data/useMockData";
import { mockDataProvider } from "../data/useMockData";
export const chartMarkup = ["body", "label", "value", "plot"].map(
  (selector) => ({
    tagName:
      selector === "body" ? "rect" : selector === "plot" ? "path" : "text",
    selector,
  }),
);
export function dataAppearance(
  item: DiagramElement,
  sample?: Sample,
  history: HistorySample[] = [],
): CellAttrs {
  const good = sample?.quality === "good" && sample.value !== null;
  const unit =
    mockDataProvider.catalog().find((p) => p.id === item.binding)?.unit || "";
  const text = !item.binding
    ? "未绑定点位"
    : good
      ? `${sample.value}${unit ? " " + unit : ""}`
      : "数据不可用";
  if (item.kind === "device")
    return item.binding
      ? { label: { text }, tag: { text: good ? "实时数据" : "数据异常" } }
      : {};
  if (item.kind === "metric")
    return {
      label: {
        text: item.text,
        x: 12,
        y: 25,
        refX: 0,
        refY: 0,
        textAnchor: "start",
        fontSize: 13,
        fill: "#64748b",
      },
      value: { text, x: 12, y: 70, fontSize: 22, fill: item.color },
      body: { fill: "#f0fdfa" },
    };
  if (item.kind !== "chart") return {};
  history = history.filter(
    (s) => s.timestamp >= Date.now() - (item.historyMinutes || 60) * 60000,
  );
  const min = Math.min(...history.map((s) => s.value));
  const max = Math.max(...history.map((s) => s.value));
  const from = history[0]?.timestamp || 0;
  const span = Math.max(1, (history.at(-1)?.timestamp || 0) - from);
  const path = good
    ? history
        .map(
          (s, i) =>
            `${i ? "L" : "M"} ${12 + ((s.timestamp - from) / span) * (item.width - 24)} ${item.height - 18 - ((s.value - min) / Math.max(1, max - min)) * (item.height - 80)}`,
        )
        .join(" ")
    : "";
  return {
    body: { fill: "#fff", stroke: "#cbd5e1", rx: 6 },
    label: {
      text: item.text,
      x: 0,
      y: 0,
      refX: 12,
      refY: 18,
      textWrap: { width: item.width - 24, height: 24, ellipsis: true },
      textAnchor: "start",
      fontSize: 13,
      fill: "#334155",
    },
    value: { text, x: 12, y: 40, fontSize: 13, fill: item.color },
    plot: {
      role: "img",
      "aria-label": "历史趋势曲线",
      d: path,
      fill: "none",
      stroke: item.color,
      strokeWidth: 2,
    },
  };
}
