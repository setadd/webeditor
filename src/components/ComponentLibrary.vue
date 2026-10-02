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
import { componentCatalog, type ComponentId } from "../domain/componentCatalog";
import { symbolUrl } from "../domain/symbols";
const props = defineProps<{ disabled?: boolean }>();
function startDrag(event: DragEvent, kind: ComponentId) {
  if (props.disabled || !event.dataTransfer) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData(componentMime, kind);
  event.dataTransfer.effectAllowed = "copy";
}
const emit = defineEmits<{ add: [kind: ComponentId] }>();
const category = ref("all"),
  query = ref("");
const categories = [
  { id: "all", name: "全部", icon: Grid },
  { id: "device", name: "设备", icon: Cpu },
  { id: "data", name: "图表", icon: DataLine },
  { id: "electrical", name: "电气", icon: Cpu },
  { id: "equipment", name: "暖通", icon: Cpu },
  { id: "basic", name: "基础", icon: Picture },
];
const items = componentCatalog;
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
        :key="item.id"
        class="component-tile"
        :aria-label="'添加' + item.name"
        :disabled="disabled"
        :draggable="!disabled"
        @dragstart="startDrag($event, item.id)"
        @click="emit('add', item.id)"
      >
        <div class="component-art">
          <img
            v-if="item.preset?.symbol"
            :src="
              symbolUrl(
                item.preset.symbol,
                item.preset.color || '#55bfea',
                item.preset.visual,
              )
            "
            :alt="item.name"
            style="width: 80%; height: 75px; object-fit: contain"
          />
          <svg
            v-else-if="item.kind === 'device'"
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
