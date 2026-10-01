<script setup lang="ts">
import PageBackground from "./PageBackground.vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Graph, type Node, type CellAttrs } from "@antv/x6";
import { evaluateRules } from "../domain/rules";
import type { DiagramDocument, DiagramElement } from "../domain/document";

import LineInteraction from "./LineInteraction.vue";
import { lineAppearance, lineMarkup, type LineKind } from "../domain/lines";
import { dataAppearance, chartMarkup } from "./dataAppearance";
import type { Sample, HistorySample } from "../data/useMockData";

const props = defineProps<{
  drawingTool?: LineKind | null;
  document: DiagramDocument;
  readonly?: boolean;
  imagePreview?: { elementId: string; imageId: string };
  selectedId: string | null;
  selectedIds?: string[];
  samples?: Record<string, Sample>;
  history?: Record<string, HistorySample[]>;
}>();
const emit = defineEmits<{
  draw: [item: DiagramElement];
  cancelDraw: [];
  select: [id: string | null, additive?: boolean];
  selectMany: [ids: string[]];
  gestureStart: [];
  gestureEnd: [];
  transform: [id: string, patch: Partial<DiagramElement>];
  move: [id: string, x: number, y: number];
}>();
const container = ref<HTMLDivElement>();
let graph: Graph | undefined;
let syncing = false;

function appearance(item: DiagramElement): CellAttrs {
  if (item.kind === "line") return lineAppearance(item);
  const active =
    !props.readonly &&
    (props.selectedIds || [props.selectedId]).includes(item.id);

  if (item.kind === "text") {
    return {
      body: {
        fill: "transparent",
        stroke: active ? "#0d9488" : "transparent",
        strokeWidth: 1,
        strokeDasharray: "4 3",
        rx: 3,
      },
      label: {
        text: item.text,
        fill: item.color,
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "sans-serif",
        textWrap: { width: -12, height: -4, ellipsis: true },
      },
    };
  }
  return {
    text: { refX: 0, refY: 0, textVerticalAnchor: "middle" },
    body: {
      fill: "#ffffff",
      stroke: active ? "#0d9488" : "#cddbdc",
      strokeWidth: active ? 2 : 1,
      rx: 10,
      ry: 10,
    },
    accent: {
      x: 0,
      y: 12,
      width: 3,
      height: 32,
      fill: item.color,
      stroke: "none",
      rx: 2,
    },
    iconBg: { cx: 31, cy: 33, r: 17, fill: item.color, fillOpacity: 0.09 },
    ring: {
      cx: 31,
      cy: 33,
      r: 10,
      fill: "none",
      stroke: item.color,
      strokeWidth: 1.8,
    },
    rotor: {
      d: "M 31 23 L 35 31 L 41 33 L 33 37 L 31 43 L 27 35 L 21 33 L 29 29 Z",
      fill: item.color,
    },
    name: {
      text: item.name,
      x: 58,
      y: 33,
      fill: "#64748b",
      fontSize: 11,
      fontFamily: "sans-serif",
      textAnchor: "start",
      dominantBaseline: "middle",
      textWrap: { width: 112, height: 20, ellipsis: true },
    },
    label: {
      text: item.text,
      x: 16,
      y: 73,
      fill: item.color,
      fontSize: 16,
      fontWeight: 600,
      fontFamily: "sans-serif",
      textAnchor: "start",
      dominantBaseline: "middle",
      textWrap: { width: 152, height: 24, ellipsis: true },
    },
    tag: {
      text: "设备占位",
      x: 16,
      y: 97,
      fill: "#94a3b8",
      fontSize: 10,
      fontFamily: "sans-serif",
      textAnchor: "start",
    },
  };
}

function effectiveAppearance(item: DiagramElement) {
  const effective = evaluateRules(
    { color: item.color, flow: item.flow, imageId: item.defaultImageId },
    item.rules,
    props.samples,
    item.binding,
  );
  item = {
    ...item,
    color: effective.color || item.color,
    flow: effective.flow,
  };
  const base = appearance(item);
  const data = dataAppearance(
    item,
    props.samples?.[item.binding || ""],
    props.history?.[item.binding || ""],
  );
  for (const [key, value] of Object.entries(data))
    base[key] = { ...base[key], ...value };
  if (item.kind === "device") {
    const preview =
      !props.readonly && props.imagePreview?.elementId === item.id
        ? props.imagePreview.imageId
        : undefined;
    const asset = props.document.assets?.[preview || effective.imageId || ""];
    for (const selector of [
      "accent",
      "iconBg",
      "ring",
      "rotor",
      "name",
      "label",
      "tag",
    ])
      base[selector] = {
        ...base[selector],
        display: asset ? "none" : "inline",
      };
    base.stateImage = {
      href: asset?.dataUrl || "",
      x: 0,
      y: 0,
      width: item.width,
      height: item.height,
      preserveAspectRatio: "xMidYMid meet",
      display: asset ? "inline" : "none",
    };
  }
  return base;
}

function addNode(item: DiagramElement): Node {
  return graph!.addNode({
    id: item.id,
    shape: "rect",
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    ...(item.kind === "device"
      ? {
          markup: [
            { tagName: "rect", selector: "body" },
            { tagName: "rect", selector: "accent" },
            { tagName: "circle", selector: "iconBg" },
            { tagName: "circle", selector: "ring" },
            { tagName: "path", selector: "rotor" },
            { tagName: "text", selector: "name" },
            { tagName: "text", selector: "label" },
            { tagName: "text", selector: "tag" },
            { tagName: "image", selector: "stateImage" },
          ],
        }
      : {}),
    angle: item.rotation || 0,
    ...(item.kind === "chart" || item.kind === "metric"
      ? { markup: chartMarkup }
      : {}),
    ...(item.kind === "line" ? { markup: lineMarkup } : {}),
    attrs: effectiveAppearance(item),
  });
}

function synchronize() {
  if (!graph) return;
  syncing = true;
  try {
    graph.resize(props.document.page.width, props.document.page.height);
    const ids = new Set(props.document.elements.map((item) => item.id));
    for (const node of graph.getNodes())
      if (!ids.has(node.id)) graph.removeNode(node);
    for (const item of props.document.elements) {
      const node = graph.getCellById(item.id) as Node | null;
      if (!node) {
        addNode(item);
        continue;
      }
      const position = node.position();
      if (position.x !== item.x || position.y !== item.y)
        node.position(item.x, item.y);
      node.resize(item.width, item.height);
      node.rotate(item.rotation || 0, { absolute: true });
      node.setAttrs(effectiveAppearance(item));
    }
  } finally {
    syncing = false;
  }
}

onMounted(() => {
  graph = new Graph({
    container: container.value!,
    width: props.document.page.width,
    height: props.document.page.height,
    grid: { size: 1, visible: false },
    background: { color: "transparent" },
    translating: { restrict: true },
    interacting: () => ({
      nodeMovable: !props.readonly,
      magnetConnectable: false,
    }),
    connecting: { snap: false, allowBlank: false },
    panning: false,
    mousewheel: false,
  });
  graph.on("node:mousedown", ({ node, e }) => {
    if (props.readonly) {
      emit("select", node.id);
      return;
    }
    if (e.shiftKey || e.ctrlKey || e.metaKey) emit("select", node.id, true);
    else if (!(props.selectedIds || [props.selectedId]).includes(node.id))
      emit("select", node.id);
    emit("gestureStart");
  });
  graph.on("blank:mousedown", ({ x, y, e }) => {
    if (!props.readonly && e.button === 0 && !transform)
      marquee.value = { x, y, width: 0, height: 0 };
  });
  window.addEventListener("mouseup", finish);
  window.addEventListener("mousemove", pointerMove);
  graph.on("node:change:position", ({ node }) => {
    if (!syncing && !props.readonly) {
      const { x, y } = node.position();
      const original = props.document.elements.find(
        (item) => item.id === node.id,
      );
      if (original) {
        const dx = x - original.x,
          dy = y - original.y;
        for (const id of props.selectedIds || []) {
          if (id !== node.id) {
            const item = props.document.elements.find((v) => v.id === id);
            if (item) emit("move", id, item.x + dx, item.y + dy);
          }
        }
      }
      emit("move", node.id, x, y);
    }
  });
  synchronize();
});
watch(
  () => [
    props.document,
    props.selectedId,
    props.selectedIds,
    props.samples,
    props.history,
    props.imagePreview,
  ],
  synchronize,
  { deep: true },
);
onBeforeUnmount(() => {
  graph?.dispose();
  window.removeEventListener("mouseup", finish);
  window.removeEventListener("mousemove", pointerMove);
});
const marquee = ref<{ x: number; y: number; width: number; height: number }>();
const activeItem = computed(() =>
  props.document.elements.find((e) => e.id === props.selectedId),
);
let transform:
  { kind: string; item: DiagramElement; x: number; y: number } | undefined;
function startTransform(event: MouseEvent, kind: string) {
  if (props.readonly || !activeItem.value) return;
  event.preventDefault();
  event.stopPropagation();
  marquee.value = undefined;
  transform = {
    kind,
    item: { ...activeItem.value },
    x: event.clientX,
    y: event.clientY,
  };
  emit("gestureStart");
}
function pointerMove(event: MouseEvent) {
  if (props.readonly) return;
  if (transform) {
    const { item, kind, x, y } = transform;
    if (kind === "resize")
      emit("transform", item.id, {
        width: Math.max(20, item.width + event.clientX - x),
        height: Math.max(20, item.height + event.clientY - y),
      });
    else {
      const rect = container.value!.getBoundingClientRect();
      const angle =
        (Math.atan2(
          event.clientY - rect.top - item.y - item.height / 2,
          event.clientX - rect.left - item.x - item.width / 2,
        ) *
          180) /
          Math.PI +
        90;
      emit("transform", item.id, { rotation: Math.round((angle + 360) % 360) });
    }
  }
  if (marquee.value) {
    const rect = container.value!.getBoundingClientRect();
    marquee.value.width = event.clientX - rect.left - marquee.value.x;
    marquee.value.height = event.clientY - rect.top - marquee.value.y;
  }
}
function finish() {
  if (props.readonly) return;
  if (marquee.value && !transform) {
    const m = marquee.value;
    const x = Math.min(m.x, m.x + m.width),
      y = Math.min(m.y, m.y + m.height);
    emit(
      "selectMany",
      props.document.elements
        .filter(
          (e) =>
            e.x >= x &&
            e.y >= y &&
            e.x + e.width <= x + Math.abs(m.width) &&
            e.y + e.height <= y + Math.abs(m.height),
        )
        .map((e) => e.id),
    );
    marquee.value = undefined;
  }
  transform = undefined;
  emit("gestureEnd");
}
</script>

<template>
  <div
    style="position: relative"
    :style="{
      width: document.page.width + 'px',
      height: document.page.height + 'px',
    }"
  >
    <PageBackground :document="document" />
    <div
      ref="container"
      class="diagram-canvas"
      data-testid="canvas"
      aria-label="组态画布"
    ></div>
    <span
      v-for="item in document.elements.filter(
        (e) =>
          evaluateRules({ color: e.color }, e.rules, samples, e.binding)
            .abnormal,
      )"
      :key="`error-${item.id}`"
      role="status"
      class="data-abnormal"
      :style="{
        position: 'absolute',
        left: item.x + 'px',
        top: Math.max(0, item.y - 22) + 'px',
        color: '#b91c1c',
        background: '#fff1f2',
        fontSize: '12px',
        pointerEvents: 'none',
      }"
      >数据异常：{{ item.name }}</span
    >
    <LineInteraction
      v-if="!readonly"
      :document="document"
      :tool="drawingTool"
      :selected="activeItem"
      @draw="emit('draw', $event)"
      @cancel="emit('cancelDraw')"
      @transform="(id, patch) => emit('transform', id, patch)"
      @start="emit('gestureStart')"
      @end="emit('gestureEnd')"
    />

    <div
      v-if="marquee"
      class="marquee"
      :style="{
        left: Math.min(marquee.x, marquee.x + marquee.width) + 'px',
        top: Math.min(marquee.y, marquee.y + marquee.height) + 'px',
        width: Math.abs(marquee.width) + 'px',
        height: Math.abs(marquee.height) + 'px',
      }"
    ></div>
    <div
      v-if="activeItem && !readonly"
      class="transform-outline"
      :style="{
        left: activeItem.x + 'px',
        top: activeItem.y + 'px',
        width: activeItem.width + 'px',
        height: activeItem.height + 'px',
        transform: `rotate(${activeItem.rotation || 0}deg)`,
      }"
    >
      <button
        aria-label="调整大小"
        class="resize-handle"
        @mousedown="startTransform($event, 'resize')"
      ></button
      ><button
        aria-label="旋转图元"
        class="rotate-handle"
        @mousedown="startTransform($event, 'rotate')"
      ></button>
    </div>
  </div>
</template>
<style scoped>
.marquee {
  position: absolute;
  pointer-events: none;
  border: 1px solid #0d9488;
  background: #0d948822;
}
.transform-outline {
  position: absolute;
  pointer-events: none;
  border: 1px dashed #0d9488;
  box-sizing: border-box;
}
.transform-outline button {
  position: absolute;
  pointer-events: auto;
  width: 12px;
  height: 12px;
  border: 2px solid #0d9488;
  background: white;
  padding: 0;
}
.resize-handle {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}
.rotate-handle {
  left: calc(50% - 6px);
  top: -24px;
  border-radius: 50%;
  cursor: grab;
}
</style>
