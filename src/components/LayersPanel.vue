<script setup lang="ts">
import type { DiagramDocument } from "../domain/document";
defineProps<{ document: DiagramDocument; selectedIds: string[] }>();
defineEmits<{
  select: [id: string, additive: boolean];
  toggle: [id: string, field: "locked" | "visible"];
  order: [direction: string];
  group: [];
  ungroup: [];
  align: [direction: string];
  distribute: [axis: "x" | "y"];
}>();
</script>
<template>
  <div class="layers-panel">
    <div
      v-for="item in [...document.elements].reverse()"
      :key="item.id"
      class="layer-row"
    >
      <button
        :aria-label="`选择图元 ${item.name}`"
        :aria-pressed="selectedIds.includes(item.id)"
        @click="
          $emit(
            'select',
            item.id,
            $event.shiftKey || $event.ctrlKey || $event.metaKey,
          )
        "
      >
        {{ item.name }} {{ item.groupId ? "▣" : "" }}
      </button>
      <button
        :aria-label="`${item.locked ? '解锁' : '锁定'} ${item.name}`"
        @click="$emit('toggle', item.id, 'locked')"
      >
        {{ item.locked ? "🔒" : "锁" }}
      </button>
      <button
        :aria-label="`${item.visible === false ? '显示' : '隐藏'} ${item.name}`"
        @click="$emit('toggle', item.id, 'visible')"
      >
        {{ item.visible === false ? "显" : "隐" }}
      </button>
    </div>
    <div class="layer-tools">
      <button
        v-for="(name, key) in {
          top: '置顶',
          bottom: '置底',
          up: '上移一层',
          down: '下移一层',
        }"
        :key="key"
        @click="$emit('order', key)"
      >
        {{ name }}
      </button>
      <button @click="$emit('group')">组合</button
      ><button @click="$emit('ungroup')">取消组合</button>
      <button
        v-for="(name, key) in {
          left: '左对齐',
          right: '右对齐',
          top: '顶对齐',
          bottom: '底对齐',
          centerX: '水平居中',
          centerY: '垂直居中',
        }"
        :key="key"
        @click="$emit('align', key)"
      >
        {{ name }}
      </button>
      <button @click="$emit('distribute', 'x')">水平等距</button
      ><button @click="$emit('distribute', 'y')">垂直等距</button>
    </div>
  </div>
</template>
<style scoped>
.layers-panel {
  padding: 8px;
  font-size: 12px;
  overflow: auto;
}
.layer-row {
  display: flex;
  gap: 3px;
  margin: 4px 0;
}
.layer-row button:first-child {
  flex: 1;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.layers-panel button {
  border: 1px solid #dce5e5;
  background: white;
  border-radius: 4px;
  padding: 5px;
}
.layer-row button[aria-pressed="true"] {
  background: #ccfbf1;
}
.layer-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 12px;
}
</style>
