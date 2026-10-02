<script setup lang="ts">
import type { CanvasArea } from "./canvasArea";
import PageBackground from "./PageBackground.vue";
import { applyVisual } from "./visualAppearance";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Graph, type Node, type CellAttrs } from "@antv/x6";
import { evaluateRules } from "../domain/rules";
import type { DiagramDocument, DiagramElement } from "../domain/document";

import LineInteraction from "./LineInteraction.vue";
import { lineAppearance, lineMarkup, type LineKind } from "../domain/lines";
import { dataAppearance, chartMarkup } from "./dataAppearance";
import type { Sample, HistorySample } from "../data/useMockData";

const props = defineProps<{
  area: CanvasArea;
  drawingTool?: LineKind | null;
  document: DiagramDocument;
  readonly?: boolean;
  viewScale?: number;
  showGrid?: boolean;
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
  context: [
    event: MouseEvent,
    id: string | null,
    point: { x: number; y: number },
  ];
}>();
const container = ref<HTMLDivElement>();
const root = ref<HTMLDivElement>();
let graph: Graph | undefined;
let syncing = false;

function context(event: MouseEvent) {
  if (props.readonly) return;
  event.preventDefault();
  event.stopPropagation();
  const target = event.target as Element;
  const id =
    target.closest("[data-cell-id]")?.getAttribute("data-cell-id") ||
    (target.closest(".path-handle,.transform-outline")
      ? props.selectedId
      : null);
  const rect = root.value!.getBoundingClientRect();
  emit("context", event, id, {
    x: (event.clientX - rect.left) / (props.viewScale || 1),
    y: (event.clientY - rect.top) / (props.viewScale || 1),
  });
}

function isLocked(id: string) {
  const item = props.document.elements.find((e) => e.id === id);
  return (
    !!item?.locked ||
    (!!item?.groupId &&
      props.document.elements.some(
        (e) => e.groupId === item.groupId && e.locked,
      ))
  );
}
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
        refX: "50%",
        refY: "50%",
        textAnchor: "middle",
        textVerticalAnchor: "middle",
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
  if (base.body)
    base.body = { refWidth: "100%", refHeight: "100%", ...base.body };
  let hasImage = false;
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
    hasImage = !!asset;
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
  return applyVisual(item, base, hasImage);
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
            ...(item.symbol
              ? [{ tagName: "image", selector: "symbolImage" }]
              : []),
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
    const ids = new Set(
      props.document.elements
        .filter((e) => e.visible !== false)
        .map((item) => item.id),
    );
    for (const node of graph.getNodes())
      if (!ids.has(node.id)) graph.removeNode(node);
    for (const [index, item] of props.document.elements.entries()) {
      if (item.visible === false) continue;
      const node = graph.getCellById(item.id) as Node | null;
      if (!node) {
        addNode(item).setZIndex(index);
        continue;
      }
      node.setZIndex(index);
      const position = node.position();
      if (position.x !== item.x || position.y !== item.y)
        node.position(item.x, item.y);
      node.resize(item.width, item.height);
      node.rotate(item.rotation || 0, { absolute: true });
      node.setAttrs(effectiveAppearance(item), { overwrite: true });
    }
  } finally {
    syncing = false;
  }
}

function updateSurface() {
  if (!graph) return;
  graph.resize(props.area.width, props.area.height);
  graph.translate(-props.area.x, -props.area.y);
}
watch(() => props.area, updateSurface);
onMounted(() => {
  graph = new Graph({
    container: container.value!,
    width: props.area.width,
    height: props.area.height,
    grid: { size: 1, visible: false },
    background: { color: "transparent" },
    translating: { restrict: false },
    interacting: (view) => ({
      nodeMovable: !props.readonly && !isLocked(view.cell.id),
      magnetConnectable: false,
    }),
    connecting: { snap: false, allowBlank: false },
    panning: false,
    mousewheel: false,
  });
  updateSurface();
  graph.on("node:mousedown", ({ node, e }) => {
    if (e.button !== 0) return;
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
  // X6 can stop mouseup bubbling at document; capture still completes marquee selection.
  window.addEventListener("mouseup", finish, true);
  window.addEventListener("mousemove", pointerMove);
  graph.on("node:change:position", ({ node }) => {
    if (!syncing && !props.readonly && !isLocked(node.id)) {
      const { x, y } = node.position();
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
  window.removeEventListener("mouseup", finish, true);
  window.removeEventListener("mousemove", pointerMove);
});
const marquee = ref<{ x: number; y: number; width: number; height: number }>();
const activeItem = computed(() =>
  props.document.elements.find((e) => e.id === props.selectedId),
);
let transform:
  { kind: string; item: DiagramElement; x: number; y: number } | undefined;
function startTransform(event: MouseEvent, kind: string) {
  if (props.readonly || !activeItem.value || isLocked(activeItem.value.id))
    return;
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
    if (kind === "resize") {
      const dx = (event.clientX - x) / (props.viewScale || 1);
      const dy = (event.clientY - y) / (props.viewScale || 1);
      const radians = ((item.rotation || 0) * Math.PI) / 180;
      const cos = Math.cos(radians),
        sin = Math.sin(radians);
      const dw = Math.max(20, item.width + cos * dx + sin * dy) - item.width;
      const dh = Math.max(20, item.height - sin * dx + cos * dy) - item.height;
      // Resizing is in the node's axes. Move its center to keep the opposite corner fixed.
      const shiftX = ((cos - 1) * dw - sin * dh) / 2;
      const shiftY = (sin * dw + (cos - 1) * dh) / 2;
      emit("transform", item.id, {
        x: item.x + shiftX,
        y: item.y + shiftY,
        width: item.width + dw,
        height: item.height + dh,
      });
    } else {
      const rect = root.value!.getBoundingClientRect();
      const angle =
        (Math.atan2(
          (event.clientY - rect.top) / (props.viewScale || 1) -
            item.y -
            item.height / 2,
          (event.clientX - rect.left) / (props.viewScale || 1) -
            item.x -
            item.width / 2,
        ) *
          180) /
          Math.PI +
        90;
      emit("transform", item.id, { rotation: Math.round((angle + 360) % 360) });
    }
  }
  if (marquee.value) {
    const rect = root.value!.getBoundingClientRect();
    marquee.value.width =
      (event.clientX - rect.left) / (props.viewScale || 1) - marquee.value.x;
    marquee.value.height =
      (event.clientY - rect.top) / (props.viewScale || 1) - marquee.value.y;
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
    ref="root"
    @contextmenu.capture="context"
    data-testid="canvas"
    aria-label="组态画布"
    style="position: relative"
    :style="{
      width: document.page.width + 'px',
      height: document.page.height + 'px',
    }"
  >
    <PageBackground :document="document" />
    <div
      v-if="showGrid"
      data-testid="canvas-grid"
      style="
        position: absolute;
        pointer-events: none;
        background-image: radial-gradient(#9caebc 0.8px, transparent 0.8px);
        background-size: 20px 20px;
      "
      :style="{
        left: area.x + 'px',
        top: area.y + 'px',
        width: area.width + 'px',
        height: area.height + 'px',
        backgroundPosition: `${-area.x}px ${-area.y}px`,
      }"
    ></div>
    <div
      ref="container"
      class="diagram-canvas"
      :style="{
        position: 'absolute',
        left: area.x + 'px',
        top: area.y + 'px',
        width: area.width + 'px',
        height: area.height + 'px',
      }"
    ></div>
    <span
      v-for="item in document.elements.filter(
        (e) =>
          e.visible !== false &&
          evaluateRules({ color: e.color }, e.rules, samples, e.binding)
            .abnormal,
      )"
      :key="`error-${item.id}`"
      role="status"
      class="data-abnormal"
      :style="{
        position: 'absolute',
        left: item.x + 'px',
        top: item.y - 22 + 'px',
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
      :area="area"
      :view-scale="viewScale || 1"
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
      v-if="
        activeItem &&
        !readonly &&
        activeItem.visible !== false &&
        !isLocked(activeItem.id)
      "
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
