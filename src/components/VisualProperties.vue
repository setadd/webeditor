<script setup lang="ts">
import type { DiagramElement } from "../domain/document";
import type { VisualStyle } from "../domain/visual";
const props = defineProps<{ selected: DiagramElement }>();
const emit = defineEmits<{ update: [patch: Partial<DiagramElement>] }>();
function set(patch: Partial<VisualStyle>) {
  emit("update", { visual: { ...props.selected.visual, ...patch } });
}
function number(
  key: "fontSize" | "strokeWidth" | "opacity" | "decimals",
  event: Event,
  min: number,
  max: number,
) {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(value))
    set({
      [key]: Math.min(
        max,
        Math.max(min, key === "decimals" ? Math.round(value) : value),
      ),
    });
}
</script>
<template>
  <section v-if="selected.kind !== 'line'" class="visual-properties">
    <h3>展示样式</h3>
    <label
      >展示方式<select
        aria-label="展示方式"
        :value="selected.visual?.mode || 'card'"
        @change="
          set({
            mode: ($event.target as HTMLSelectElement)
              .value as VisualStyle['mode'],
          })
        "
      >
        <option value="card">卡片</option>
        <option value="plain">透明 / 自定义</option>
      </select></label
    >
    <label
      >字号<input
        aria-label="字号"
        type="number"
        min="8"
        max="120"
        :value="selected.visual?.fontSize || 20"
        @change="number('fontSize', $event, 8, 120)"
    /></label>
    <label
      >加粗<input
        aria-label="加粗"
        type="checkbox"
        :checked="selected.visual?.bold"
        @change="set({ bold: ($event.target as HTMLInputElement).checked })"
    /></label>
    <label
      >文字对齐<select
        aria-label="文字对齐"
        :value="selected.visual?.align || 'center'"
        @change="
          set({
            align: ($event.target as HTMLSelectElement)
              .value as VisualStyle['align'],
          })
        "
      >
        <option value="left">左对齐</option>
        <option value="center">居中</option>
        <option value="right">右对齐</option>
      </select></label
    >
    <label
      >背景填充<input
        aria-label="背景填充"
        type="color"
        :value="
          selected.visual?.fill === 'none'
            ? '#082b55'
            : selected.visual?.fill || '#082b55'
        "
        @input="set({ fill: ($event.target as HTMLInputElement).value })"
    /></label>
    <label
      >透明背景<input
        aria-label="透明背景"
        type="checkbox"
        :checked="!selected.visual?.fill || selected.visual.fill === 'none'"
        @change="
          set({
            fill: ($event.target as HTMLInputElement).checked
              ? 'none'
              : '#082b55',
          })
        "
    /></label>
    <label
      >边框颜色<input
        aria-label="边框颜色"
        type="color"
        :value="
          selected.visual?.stroke === 'none'
            ? '#168aca'
            : selected.visual?.stroke || '#168aca'
        "
        @input="set({ stroke: ($event.target as HTMLInputElement).value })"
    /></label>
    <label
      >边框宽度<input
        aria-label="边框宽度"
        type="number"
        min="0"
        max="20"
        :value="selected.visual?.strokeWidth ?? 2"
        @change="number('strokeWidth', $event, 0, 20)"
    /></label>
    <label
      >不透明度<input
        aria-label="不透明度"
        type="number"
        min="0"
        max="1"
        step="0.1"
        :value="selected.visual?.opacity ?? 1"
        @change="number('opacity', $event, 0, 1)"
    /></label>
    <template v-if="selected.kind === 'device'">
      <label
        >水平镜像<input
          aria-label="水平镜像"
          type="checkbox"
          :checked="selected.visual?.flipX"
          @change="set({ flipX: ($event.target as HTMLInputElement).checked })"
      /></label>
      <label
        >垂直镜像<input
          aria-label="垂直镜像"
          type="checkbox"
          :checked="selected.visual?.flipY"
          @change="set({ flipY: ($event.target as HTMLInputElement).checked })"
      /></label>
      <label
        >图片适配<select
          aria-label="图片适配"
          :value="selected.visual?.imageFit || 'contain'"
          @change="
            set({
              imageFit: ($event.target as HTMLSelectElement)
                .value as VisualStyle['imageFit'],
            })
          "
        >
          <option value="contain">保持比例</option>
          <option value="stretch">拉伸铺满</option>
        </select></label
      >
    </template>
    <template v-if="selected.kind === 'text' || selected.kind === 'metric'">
      <h3>数值格式</h3>
      <label
        >小数位数<input
          aria-label="小数位数"
          type="number"
          min="0"
          max="6"
          :value="selected.visual?.decimals ?? 2"
          @change="number('decimals', $event, 0, 6)"
      /></label>
      <label
        >数值前缀<input
          aria-label="数值前缀"
          maxlength="80"
          :value="selected.visual?.prefix || ''"
          @change="set({ prefix: ($event.target as HTMLInputElement).value })"
      /></label>
      <label
        >数值后缀<input
          aria-label="数值后缀"
          placeholder="默认使用点位单位"
          maxlength="80"
          :value="selected.visual?.suffix"
          @change="set({ suffix: ($event.target as HTMLInputElement).value })"
      /></label>
    </template>
  </section>
</template>
<style scoped>
.visual-properties {
  display: grid;
  gap: 10px;
  padding: 16px 0;
  font-size: 12px;
}
h3 {
  margin: 8px 0;
  font-size: 13px;
}
label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
input:not([type="checkbox"]),
select {
  width: 125px;
  max-width: 60%;
  min-height: 26px;
  background: #2a323c;
  border: 1px solid #465360;
  border-radius: 4px;
  color: #d9e3ef;
}
</style>
