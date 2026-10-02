<script setup lang="ts">
import { reactive } from "vue";
import type { DiagramElement } from "../domain/document";
import { mockDataProvider, setMockPoint } from "../data/useMockData";
defineProps<{ selected?: DiagramElement }>();
const emit = defineEmits<{
  bind: [id: string, binding: string | undefined];
  range: [id: string, minutes: number];
}>();
const points = mockDataProvider.catalog();
const snapshot = mockDataProvider.snapshot();
const values = reactive<Record<string, number>>({
  temperature: 25,
  running: 1,
  fault: 0,
  flow: 12,
});
const available = reactive<Record<string, boolean>>({
  temperature: true,
  running: true,
  fault: true,
  flow: true,
});
for (const point of points) {
  values[point.id] = snapshot[point.id]?.value ?? values[point.id]!;
  available[point.id] = snapshot[point.id]?.quality === "good";
}
function update(id: string) {
  setMockPoint(id, values[id]!, available[id]);
}
</script>
<template>
  <section class="data-panel">
    <template v-if="selected">
      <h3>点位绑定</h3>
      <select
        aria-label="绑定点位"
        :value="selected.binding || ''"
        @change="
          emit(
            'bind',
            selected.id,
            ($event.target as HTMLSelectElement).value || undefined,
          )
        "
      >
        <option value="">未绑定</option>
        <option v-for="point in points" :key="point.id" :value="point.id">
          {{ point.name }} {{ point.unit }}
        </option>
      </select>
    </template>
    <label v-if="selected?.kind === 'chart'"
      >历史时间范围<select
        aria-label="历史时间范围"
        :value="selected.historyMinutes || 60"
        @change="
          emit(
            'range',
            selected.id,
            Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option value="15">最近 15 分钟</option>
        <option value="60">最近 1 小时</option>
      </select></label
    >
    <h3>模拟数据</h3>
    <p>仅影响运行显示，不修改草稿。</p>
    <div v-for="point in points" :key="point.id" class="point-row">
      <label
        >{{ point.name }} {{ point.unit
        }}<input
          :aria-label="`模拟${point.name}`"
          type="number"
          v-model.number="values[point.id]"
          @input="update(point.id)"
      /></label>
      <label
        ><input
          type="checkbox"
          :aria-label="`${point.name}可用`"
          v-model="available[point.id]"
          @change="update(point.id)"
        />可用</label
      >
    </div>
  </section>
</template>
<style scoped>
.data-panel {
  padding: 16px;
  border-top: 1px solid #e5ecec;
  font-size: 12px;
}
h3 {
  font-size: 13px;
  margin: 8px 0;
}
p {
  color: #64748b;
}
select {
  width: 100%;
  padding: 6px;
}
.point-row {
  margin-top: 10px;
  display: flex;
  align-items: end;
  gap: 6px;
}
input[type="number"] {
  display: block;
  width: 110px;
  padding: 5px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}
</style>
