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
