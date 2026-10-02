<script setup lang="ts">
import type { DiagramElement } from "../domain/document";
const props = defineProps<{ selected: DiagramElement }>();
const emit = defineEmits<{ update: [patch: Partial<DiagramElement>] }>();
function set(key: string, value: unknown) {
  emit("update", { line: { ...props.selected.line!, [key]: value } });
}
</script>
<template>
  <div v-if="selected.line" class="line-properties">
    <label
      >端点样式<select
        aria-label="端点样式"
        :value="selected.line.lineCap || 'butt'"
        @change="set('lineCap', ($event.target as HTMLSelectElement).value)"
      >
        <option value="butt">平头</option>
        <option value="round">圆头</option>
        <option value="square">方头</option>
      </select></label
    >
    <label
      >折角样式<select
        aria-label="折角样式"
        :value="selected.line.lineJoin || 'miter'"
        @change="set('lineJoin', ($event.target as HTMLSelectElement).value)"
      >
        <option value="miter">尖角</option>
        <option value="round">圆角</option>
        <option value="bevel">斜角</option>
      </select></label
    >
    <label
      >流动颜色<input
        aria-label="流动颜色"
        type="color"
        :value="selected.line.flowColor || '#ffffff'"
        @input="set('flowColor', ($event.target as HTMLInputElement).value)"
    /></label>
    <label
      >流动宽度比例<input
        aria-label="流动宽度比例"
        type="number"
        min="0.1"
        max="1"
        step="0.1"
        :value="selected.line.flowWidth ?? 0.45"
        @change="
          set(
            'flowWidth',
            Math.max(
              0.1,
              Math.min(
                1,
                Number(($event.target as HTMLInputElement).value) || 0.45,
              ),
            ),
          )
        "
    /></label>
    <label
      >线宽<input
        aria-label="线宽"
        type="number"
        min="1"
        max="40"
        :value="selected.line.strokeWidth"
        @change="
          set(
            'strokeWidth',
            Math.max(
              1,
              Math.min(
                40,
                Number(($event.target as HTMLInputElement).value) || 1,
              ),
            ),
          )
        "
    /></label>
    <label
      >线型<select
        aria-label="线型"
        :value="selected.line.dash"
        @change="set('dash', ($event.target as HTMLSelectElement).value)"
      >
        <option value="solid">实线</option>
        <option value="dashed">虚线</option>
        <option value="dotted">点线</option>
      </select></label
    >
    <label
      ><input
        type="checkbox"
        aria-label="起点箭头"
        :checked="selected.line.startArrow"
        @change="set('startArrow', ($event.target as HTMLInputElement).checked)"
      />起点箭头</label
    >
    <label
      ><input
        type="checkbox"
        aria-label="终点箭头"
        :checked="selected.line.endArrow"
        @change="set('endArrow', ($event.target as HTMLInputElement).checked)"
      />终点箭头</label
    >
  </div>
</template>
<style scoped>
.line-properties {
  display: grid;
  gap: 12px;
  margin: 20px 0;
}
.line-properties label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.line-properties input[type="number"],
select {
  width: 100px;
}
</style>
