<script setup lang="ts">
import { computed, ref } from "vue";
import type { DiagramDocument } from "../domain/document";
const props = defineProps<{ document: DiagramDocument }>();
const scale = ref(1),
  grid = ref(false),
  pan = ref(false),
  scroll = ref<HTMLElement>();
const options = computed(() =>
  [...new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, scale.value])].sort(
    (a, b) => a - b,
  ),
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
        left: Math.min(0, ...points.map((p) => p.x)),
        top: Math.min(0, ...points.map((p) => p.y)),
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
  if (!scroll.value) return;
  const w = bounds.value.right - bounds.value.left + 32,
    h = bounds.value.bottom - bounds.value.top + 32;
  scale.value = Math.max(
    0.1,
    Math.min(
      2,
      Math.floor(
        Math.min(
          (scroll.value.clientWidth - 48) / w,
          (scroll.value.clientHeight - 48) / h,
        ) * 100,
      ) / 100,
    ),
  );
  scroll.value.scrollTo(0, 0);
}
let drag: { x: number; y: number; left: number; top: number } | null = null;
function start(e: PointerEvent) {
  if (!pan.value && e.button !== 1) return;
  if ((e.target as HTMLElement).closest("button,input,select")) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  drag = {
    x: e.clientX,
    y: e.clientY,
    left: scroll.value!.scrollLeft,
    top: scroll.value!.scrollTop,
  };
  scroll.value!.setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (!drag) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  scroll.value!.scrollLeft = drag.left - e.clientX + drag.x;
  scroll.value!.scrollTop = drag.top - e.clientY + drag.y;
}
function end(e: PointerEvent) {
  if (!drag) return;
  drag = null;
  e.stopImmediatePropagation();
  if (scroll.value?.hasPointerCapture(e.pointerId))
    scroll.value.releasePointerCapture(e.pointerId);
}
</script>
<template>
  <div class="viewport-shell">
    <div class="view-tools" role="toolbar" aria-label="画布视图">
      <label
        >缩放
        <select aria-label="画布缩放" v-model.number="scale">
          <option v-for="value in options" :key="value" :value="value">
            {{ Math.round(value * 100) }}%
          </option>
        </select></label
      >
      <el-button size="small" @click="fit">适应内容</el-button
      ><el-button size="small" aria-label="恢复100%" @click="scale = 1"
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
        pan ? "拖动画面平移" : "中键拖动可平移"
      }}</span>
    </div>
    <div
      ref="scroll"
      class="view-scroll"
      data-testid="view-scroll"
      :class="{ panning: pan }"
      @pointerdown.capture="start"
      @pointermove.capture="move"
      @pointerup.capture="end"
      @pointercancel="end"
    >
      <div
        class="view-extent"
        :style="{
          width:
            (Math.max(document.page.width, bounds.right) - bounds.left) *
              scale +
            'px',
          height:
            (Math.max(document.page.height, bounds.bottom) - bounds.top) *
              scale +
            'px',
        }"
      >
        <div
          class="view-stage"
          :style="{
            left: -bounds.left * scale + 'px',
            top: -bounds.top * scale + 'px',
            transform: `scale(${scale})`,
            width: document.page.width + 'px',
            height: document.page.height + 'px',
          }"
        >
          <slot :scale="scale" :grid="grid" />
        </div>
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
  overflow: auto;
  background: #eef2f5;
  padding: 24px;
  touch-action: none;
}
.view-extent {
  position: relative;
  flex: none;
  margin-bottom: 24px;
}
.view-stage {
  position: absolute;
  transform-origin: top left;
  box-shadow: 0 1px 12px #22354412;
}
.panning,
.panning * {
  cursor: grab !important;
}
</style>
