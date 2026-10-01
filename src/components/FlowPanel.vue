<script setup lang="ts">
import { computed } from "vue";
import type { DiagramElement } from "../domain/document";
import type { FlowEffect } from "../domain/rules";
const props = defineProps<{ selected: DiagramElement }>();
const emit = defineEmits<{ update: [patch: Partial<DiagramElement>] }>();
const flow = computed<FlowEffect>(
  () =>
    props.selected.flow || { enabled: false, direction: "forward", speed: 1 },
);
function set(patch: Partial<FlowEffect>) {
  emit("update", { flow: { ...flow.value, ...patch } });
}
</script>
<template>
  <div v-if="selected.kind === 'line'" class="flow-panel">
    <strong>线条流动</strong>
    <label
      ><input
        aria-label="启用流动"
        type="checkbox"
        :checked="flow.enabled"
        @change="set({ enabled: ($event.target as HTMLInputElement).checked })"
      />启用流动</label
    >
    <label
      >方向<select
        aria-label="流动方向"
        :value="flow.direction"
        @change="
          set({
            direction: ($event.target as HTMLSelectElement)
              .value as FlowEffect['direction'],
          })
        "
      >
        <option value="forward">正向（起点 → 终点）</option>
        <option value="reverse">反向（终点 → 起点）</option>
        <option value="stopped">停止</option>
      </select></label
    >
    <label
      >速度<input
        aria-label="流动速度"
        type="number"
        min="0.1"
        max="10"
        step="0.1"
        :value="flow.speed"
        @change="
          set({
            speed: Math.max(
              0.1,
              Math.min(
                10,
                Number(($event.target as HTMLInputElement).value) || 1,
              ),
            ),
          })
        "
    /></label>
    <small>0.1–10 倍速；箭头与基础线型独立保留。</small>
  </div>
</template>
<style scoped>
.flow-panel {
  display: grid;
  gap: 12px;
  padding: 18px 0;
  font-size: 13px;
}
.flow-panel label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.flow-panel select {
  max-width: 170px;
}
.flow-panel input[type="number"] {
  width: 100px;
}
.flow-panel small {
  color: #64748b;
}
</style>
