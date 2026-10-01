<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Graph, type Node, type CellAttrs } from "@antv/x6";
import type { DiagramDocument, DiagramElement } from "../domain/document";

const props = defineProps<{
  document: DiagramDocument;
  readonly?: boolean;
  selectedId: string | null;
}>();
const emit = defineEmits<{
  select: [id: string | null];
  move: [id: string, x: number, y: number];
}>();
const container = ref<HTMLDivElement>();
let graph: Graph | undefined;
let syncing = false;

function appearance(item: DiagramElement): CellAttrs {
  const active = !props.readonly && props.selectedId === item.id;
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
          ],
        }
      : {}),
    attrs: appearance(item),
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
      node.setAttrs(appearance(item));
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
    background: { color: "#ffffff" },
    translating: { restrict: true },
    interacting: () => ({ nodeMovable: !props.readonly, magnetConnectable: false }),
    connecting: { snap: false, allowBlank: false },
    panning: false,
    mousewheel: false,
  });
  graph.on("node:click", ({ node }) => emit("select", node.id));
  graph.on("node:mousedown", ({ node }) => emit("select", node.id));
  graph.on("blank:click", () => emit("select", null));
  graph.on("node:change:position", ({ node }) => {
    if (!syncing && !props.readonly) {
      const { x, y } = node.position();
      emit("move", node.id, x, y);
    }
  });
  synchronize();
});
watch(() => [props.document, props.selectedId], synchronize, { deep: true });
onBeforeUnmount(() => graph?.dispose());
</script>

<template>
  <div
    ref="container"
    class="diagram-canvas"
    data-testid="canvas"
    aria-label="组态画布"
  ></div>
</template>
