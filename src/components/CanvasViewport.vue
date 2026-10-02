<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { componentMime, draggedComponent } from "./componentDrag";
import type { ElementKind, DiagramDocument } from "../domain/document";
const props = defineProps<{
  document: DiagramDocument;
  acceptComponents?: boolean;
  fitOnOpen?: boolean;
}>();
const emit = defineEmits<{
  addComponent: [kind: ElementKind, center: { x: number; y: number }];
}>();
const stage = ref<HTMLElement>();
function dropPoint(event: DragEvent) {
  if (!stage.value) return;
  const rect = stage.value.getBoundingClientRect();
  const x = (event.clientX - rect.left) / scale.value;
  const y = (event.clientY - rect.top) / scale.value;
  return { x, y };
}
function dragOver(event: DragEvent) {
  if (
    !props.acceptComponents ||
    !event.dataTransfer?.types.includes(componentMime)
  )
    return;
  event.preventDefault();
  event.dataTransfer.dropEffect = dropPoint(event) ? "copy" : "none";
}
function drop(event: DragEvent) {
  if (!props.acceptComponents) return;
  const kind = draggedComponent(event);
  if (!kind) return;
  event.preventDefault();
  const point = dropPoint(event);
  if (point) emit("addComponent", kind, point);
}
const scale = ref(1),
  grid = ref(false),
  pan = ref(false),
  viewport = ref<HTMLElement>();
const camera = ref({ x: 24, y: 24 });
const viewportSize = ref({ width: 1, height: 1 });
const area = computed(() => ({
  x: -camera.value.x / scale.value,
  y: -camera.value.y / scale.value,
  width: viewportSize.value.width / scale.value,
  height: viewportSize.value.height / scale.value,
}));
let resizeObserver: ResizeObserver | undefined;
const spaceHeld = ref(false);
const panning = computed(() => pan.value || spaceHeld.value);
function zoom(value: number, anchor?: { x: number; y: number }) {
  if (!viewport.value) return;
  const next = Math.max(Number.EPSILON, Math.min(4, value));
  const at = anchor || {
    x: viewport.value.clientWidth / 2,
    y: viewport.value.clientHeight / 2,
  };
  const ratio = next / scale.value;
  camera.value = {
    x: at.x - (at.x - camera.value.x) * ratio,
    y: at.y - (at.y - camera.value.y) * ratio,
  };
  scale.value = next;
}
function wheel(event: WheelEvent) {
  if (drag || event.buttons || !viewport.value) return;
  const rect = viewport.value.getBoundingClientRect();
  zoom(scale.value * Math.exp(-event.deltaY * 0.0015), {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  });
}
function keydown(event: KeyboardEvent) {
  if (event.code !== "Space" || event.ctrlKey || event.metaKey || event.altKey)
    return;
  if (
    (event.target as HTMLElement)?.closest(
      "input,textarea,select,[contenteditable=true],[role=dialog],button",
    )
  )
    return;
  event.preventDefault();
  spaceHeld.value = true;
}
function keyup(event: KeyboardEvent) {
  if (event.code === "Space") spaceHeld.value = false;
}
function resetKeys() {
  spaceHeld.value = false;
  drag = null;
}
onMounted(() => {
  const measure = () => {
    if (viewport.value)
      viewportSize.value = {
        width: viewport.value.clientWidth,
        height: viewport.value.clientHeight,
      };
  };
  measure();
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(viewport.value!);
  if (props.fitOnOpen) fit();
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", resetKeys);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("keydown", keydown);
  window.removeEventListener("keyup", keyup);
  window.removeEventListener("blur", resetKeys);
});
watch(
  () => props.document.page.id,
  () => {
    camera.value = { x: 24, y: 24 };
    scale.value = 1;
    if (props.fitOnOpen) fit();
  },
);
const options = computed(() =>
  [
    ...new Set([
      ...[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].filter(
        (value) => Math.round(value * 100) !== Math.round(scale.value * 100),
      ),
      scale.value,
    ]),
  ].sort((a, b) => a - b),
);
const bounds = computed(() => {
  const points = props.document.elements
    .filter((e) => e.visible !== false)
    .flatMap((e) => {
      const r = ((e.rotation || 0) * Math.PI) / 180,
        cx = e.x + e.width / 2,
        cy = e.y + e.height / 2;
      return [
        [-e.width / 2, -e.height / 2],
        [e.width / 2, -e.height / 2],
        [e.width / 2, e.height / 2],
        [-e.width / 2, e.height / 2],
      ].map(([x, y]) => ({
        x: cx + x! * Math.cos(r) - y! * Math.sin(r),
        y: cy + x! * Math.sin(r) + y! * Math.cos(r),
      }));
    });
  return points.length
    ? {
        left: Math.min(...points.map((p) => p.x)),
        top: Math.min(...points.map((p) => p.y)),
        right: Math.max(...points.map((p) => p.x)),
        bottom: Math.max(...points.map((p) => p.y)),
      }
    : {
        left: 0,
        top: 0,
        right: props.document.page.width,
        bottom: props.document.page.height,
      };
});
function fit() {
  if (!viewport.value) return;
  const w = bounds.value.right - bounds.value.left + 32,
    h = bounds.value.bottom - bounds.value.top + 32;
  scale.value = Math.max(
    Number.EPSILON,
    Math.min(
      2,
      (viewport.value.clientWidth - 48) / w,
      (viewport.value.clientHeight - 48) / h,
    ),
  );
  camera.value = {
    x:
      (viewport.value.clientWidth -
        (bounds.value.right - bounds.value.left) * scale.value) /
        2 -
      bounds.value.left * scale.value,
    y:
      (viewport.value.clientHeight -
        (bounds.value.bottom - bounds.value.top) * scale.value) /
        2 -
      bounds.value.top * scale.value,
  };
}
let drag: { x: number; y: number; cameraX: number; cameraY: number } | null =
  null;
function start(e: PointerEvent) {
  if (e.button !== 1 && !(e.button === 0 && panning.value)) return;
  if ((e.target as HTMLElement).closest("button,input,select")) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  drag = {
    x: e.clientX,
    y: e.clientY,
    cameraX: camera.value.x,
    cameraY: camera.value.y,
  };
  viewport.value!.setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (!drag) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  camera.value = {
    x: drag.cameraX + e.clientX - drag.x,
    y: drag.cameraY + e.clientY - drag.y,
  };
}
function end(e: PointerEvent) {
  if (!drag) return;
  drag = null;
  e.stopImmediatePropagation();
  if (viewport.value?.hasPointerCapture(e.pointerId))
    viewport.value.releasePointerCapture(e.pointerId);
}
</script>
<template>
  <div class="viewport-shell">
    <div class="view-tools" role="toolbar" aria-label="画布视图">
      <label
        >缩放
        <select
          aria-label="画布缩放"
          :value="scale"
          @change="zoom(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="value in options" :key="value" :value="value">
            {{ Number((value * 100).toPrecision(4)) }}%
          </option>
        </select></label
      >
      <el-button size="small" @click="fit">适应内容</el-button
      ><el-button size="small" aria-label="恢复100%" @click="zoom(1)"
        >100%</el-button
      >
      <el-button
        size="small"
        :type="pan ? 'primary' : 'default'"
        :aria-pressed="pan"
        @click="pan = !pan"
        >平移画布</el-button
      >
      <el-button size="small" :aria-pressed="grid" @click="grid = !grid">{{
        grid ? "隐藏网格" : "显示网格"
      }}</el-button>
      <span class="view-hint">{{
        panning ? "拖动画面平移" : "滚轮缩放 · 空格 / 中键平移"
      }}</span>
    </div>
    <div
      ref="viewport"
      class="view-scroll"
      data-testid="view-scroll"
      title="滚轮缩放；空格或中键拖动平移；空白处拖动框选"
      @dragover="dragOver"
      @drop="drop"
      :class="{ panning }"
      :style="{
        backgroundColor: document.page.background?.color || '#ffffff',
        backgroundImage: 'none',
        backgroundPosition: `${camera.x}px ${camera.y}px`,
        backgroundSize: `${16 * scale}px ${16 * scale}px`,
      }"
      @wheel.prevent="wheel"
      @pointerdown.capture="start"
      @pointermove.capture="move"
      @pointerup.capture="end"
      @pointercancel="end"
    >
      <div
        class="view-stage"
        ref="stage"
        :style="{
          left: camera.x + 'px',
          top: camera.y + 'px',
          transform: `scale(${scale})`,
          width: document.page.width + 'px',
          height: document.page.height + 'px',
        }"
      >
        <slot :scale="scale" :grid="grid" :area="area" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.viewport-shell {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.view-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
}
.view-tools .el-button + .el-button {
  margin-left: 0;
}
.view-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
}
.view-scroll {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: #eef2f5;
  padding: 0;
  touch-action: none;
}
.view-stage {
  position: absolute;
  transform-origin: top left;
}
.panning,
.panning * {
  cursor: grab !important;
}
</style>
