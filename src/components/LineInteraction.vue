<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import type { DiagramDocument, DiagramElement } from "../domain/document";
import {
  lineBounds,
  worldPoints,
  type LineKind,
  type Point,
} from "../domain/lines";
const props = defineProps<{
  document: DiagramDocument;
  tool?: LineKind | null;
  selected?: DiagramElement;
}>();
const emit = defineEmits<{
  draw: [item: DiagramElement];
  cancel: [];
  transform: [id: string, patch: Partial<DiagramElement>];
  start: [];
  end: [];
}>();
const overlay = ref<HTMLElement>();
const points = ref<Point[]>([]);
const handles = computed(() =>
  props.selected?.line ? worldPoints(props.selected) : [],
);
const complete = computed(
  () => points.value.length >= (props.tool === "curve" ? 4 : 2),
);
watch(
  () => [props.tool, props.document.page.id],
  () => (points.value = []),
);
function local(e: MouseEvent) {
  const r = overlay.value!.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        props.document.page.width - 20,
        ((e.clientX - r.left) * props.document.page.width) / r.width,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        props.document.page.height - 20,
        ((e.clientY - r.top) * props.document.page.height) / r.height,
      ),
    ),
  };
}
function add(e: MouseEvent) {
  if (props.tool && (props.tool === "polyline" || !complete.value))
    points.value.push(local(e));
}
function finish() {
  if (!complete.value || !props.tool) return;
  const b = lineBounds(points.value);
  emit("draw", {
    id: crypto.randomUUID(),
    kind: "line",
    name: { straight: "直线", polyline: "折线", curve: "曲线" }[props.tool],
    text: "",
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    color: "#0d9488",
    rotation: 0,
    line: {
      type: props.tool,
      points: b.points,
      strokeWidth: 3,
      dash: "solid",
      startArrow: false,
      endArrow: false,
    },
  });
  points.value = [];
}
let drag: { item: DiagramElement; points: Point[]; index: number } | undefined;
function start(e: MouseEvent, index: number) {
  if (props.selected?.locked || (props.selected?.groupId && props.document.elements.some(e=>e.groupId===props.selected?.groupId&&e.locked))) return;
  e.preventDefault();
  e.stopPropagation();
  drag = {
    item: props.selected!,
    points: handles.value.map((p) => ({ ...p })),
    index,
  };
  emit("start");
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
}
function move(e: MouseEvent) {
  if (!drag) return;
  const ps = drag.points.map((p) => ({ ...p }));
  ps[drag.index] = local(e);
  const b = lineBounds(ps);
  emit("transform", drag.item.id, {
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    rotation: 0,
    line: { ...drag.item.line!, points: b.points },
  });
}
function end() {
  if (drag) emit("end");
  drag = undefined;
  window.removeEventListener("mousemove", move);
  window.removeEventListener("mouseup", end);
}
function key(e: KeyboardEvent) {
  if ((e.target as HTMLElement | null)?.closest("input,textarea,select,[contenteditable=true],[role=dialog]") ||
      Array.from(document.querySelectorAll<HTMLElement>(".el-overlay-dialog")).some(dialog => dialog.getClientRects().length > 0)) return;
  if (e.key === "Escape" && props.tool) emit("cancel");
  if (e.key === "Enter" && props.tool) finish();
}
window.addEventListener("keydown", key);
onBeforeUnmount(() => {
  end();
  window.removeEventListener("keydown", key);
});
</script>
<template>
  <div
    ref="overlay"
    class="line-overlay"
    :class="{ drawing: tool }"
    @click="add"
  >
    <template v-if="tool"
      ><svg width="100%" height="100%">
        <polyline
          :points="points.map((p) => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#0d9488"
          stroke-dasharray="5 3"
        />
        <circle
          v-for="(p, i) in points"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="4"
          fill="#0d9488"
        />
      </svg>
      <div class="draw-tip" @click.stop>
        依次点击{{ tool === "curve" ? "起点、两个控制点、终点" : "路径点" }} ·
        Esc 取消
        <button :disabled="!complete" @click.stop="finish">完成线条</button>
      </div></template
    >
    <template v-else-if="selected?.line && selected.visible !== false && !selected.locked && !(selected.groupId && document.elements.some(e=>e.groupId===selected?.groupId&&e.locked))"
      ><svg
        class="control-lines"
        width="100%"
        height="100%"
        v-if="selected.line.type === 'curve'"
      >
        <path
          :d="`M ${handles[0]!.x} ${handles[0]!.y} L ${handles[1]!.x} ${handles[1]!.y} M ${handles[2]!.x} ${handles[2]!.y} L ${handles[3]!.x} ${handles[3]!.y}`"
          stroke="#64748b"
          stroke-dasharray="4 3"
        /></svg
      ><button
        v-for="(p, i) in handles"
        :key="i"
        :aria-label="`路径点 ${i + 1}`"
        class="path-handle"
        :style="{ left: p.x + 'px', top: p.y + 'px' }"
        @mousedown="start($event, i)"
      ></button
    ></template>
  </div>
</template>
<style scoped>
.line-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.drawing {
  pointer-events: auto;
  cursor: crosshair;
}
.drawing svg,
.control-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.draw-tip {
  position: absolute;
  left: 12px;
  top: 12px;
  background: #effcf9;
  border: 1px solid #0d9488;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  cursor: default;
}
.path-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px;
  border: 2px solid #0d9488;
  background: white;
  border-radius: 50%;
  pointer-events: auto;
  padding: 0;
  cursor: crosshair;
}
</style>
