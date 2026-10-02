<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Grid,
  Cpu,
  DataLine,
  Picture,
  Search,
  Plus,
} from "@element-plus/icons-vue";
import { componentMime } from "./componentDrag";
import type { ElementKind } from "../domain/document";
const props = defineProps<{ disabled?: boolean }>();
function startDrag(event: DragEvent, kind: ElementKind) {
  if (props.disabled || !event.dataTransfer) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData(componentMime, kind);
  event.dataTransfer.effectAllowed = "copy";
}
const emit = defineEmits<{ add: [kind: ElementKind] }>();
const category = ref("all"),
  query = ref("");
const categories = [
  { id: "all", name: "全部", icon: Grid },
  { id: "device", name: "设备", icon: Cpu },
  { id: "data", name: "图表", icon: DataLine },
  { id: "basic", name: "基础", icon: Picture },
];
const items: {
  kind: ElementKind;
  name: string;
  category: string;
  description: string;
}[] = [
  {
    kind: "device",
    name: "设备",
    category: "device",
    description: "设备与多图片状态",
  },
  {
    kind: "chart",
    name: "趋势图",
    category: "data",
    description: "点位历史趋势",
  },
  {
    kind: "metric",
    name: "指标",
    category: "data",
    description: "实时数值与单位",
  },
  {
    kind: "text",
    name: "文字",
    category: "basic",
    description: "标题与说明文字",
  },
];
const filtered = computed(() =>
  items.filter(
    (item) =>
      (category.value === "all" || category.value === item.category) &&
      item.name.includes(query.value.trim()),
  ),
);
</script>
<template>
  <div class="library-heading">
    <strong>组件库</strong><small>COMPONENTS</small>
  </div>
  <div class="library-browser">
    <nav class="library-categories" aria-label="组件分类">
      <button
        v-for="item in categories"
        :key="item.id"
        :aria-pressed="category === item.id"
        @click="category = item.id"
      >
        <el-icon><component :is="item.icon" /></el-icon
        ><span>{{ item.name }}</span>
      </button>
    </nav>
    <div class="library-results">
      <el-input
        v-model="query"
        aria-label="搜索组件"
        placeholder="搜索组件"
        :prefix-icon="Search"
        clearable
        size="small"
      />
      <p class="library-result-count">
        {{ categories.find((c) => c.id === category)?.name }}组件
        <span>{{ filtered.length }}</span>
      </p>
      <button
        v-for="item in filtered"
        :key="item.kind"
        class="component-tile"
        :aria-label="'添加' + item.name"
        :disabled="disabled"
        :draggable="!disabled"
        @dragstart="startDrag($event, item.kind)"
        @click="emit('add', item.kind)"
      >
        <div class="component-art">
          <svg
            v-if="item.kind === 'device'"
            viewBox="0 0 120 75"
            aria-hidden="true"
          >
            <path d="M6 36H34M86 36H114M39 66H81" />
            <circle cx="60" cy="34" r="26" />
            <path
              class="pump-rotor"
              d="M60 9L69 31 82 49 57 45 37 50 46 25Z"
            /></svg
          ><svg
            v-else-if="item.kind === 'chart'"
            viewBox="0 0 145 75"
            aria-hidden="true"
          >
            <path
              class="chart-fill"
              d="M6 57L28 37 47 43 68 20 89 30 110 11 138 24V70H6Z"
            />
            <path d="M6 57L28 37 47 43 68 20 89 30 110 11 138 24" /></svg
          ><span v-else-if="item.kind === 'metric'" class="metric-art"
            >26.5 <small>°C</small></span
          ><span v-else class="text-art">Aa</span>
        </div>
        <span class="tile-label"
          ><strong>{{ item.name }}</strong
          ><el-icon><Plus /></el-icon></span
        ><small class="tile-description">{{ item.description }}</small>
      </button>
      <p v-if="!filtered.length" class="library-empty">没有找到组件</p>
      <p class="library-instruction">拖入画布放置，也可点击添加</p>
    </div>
  </div>
</template>
