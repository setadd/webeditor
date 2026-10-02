<script setup lang="ts">
import type { DiagramDocument } from "../domain/document";
import {
  Lock,
  Unlock,
  View,
  Hide,
  Cpu,
  DataLine,
  Files,
  Connection,
} from "@element-plus/icons-vue";
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
    <div class="layer-items">
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
          <el-icon
            ><component
              :is="
                item.kind === 'line'
                  ? Connection
                  : item.kind === 'chart'
                    ? DataLine
                    : item.kind === 'device'
                      ? Cpu
                      : Files
              " /></el-icon
          ><span>{{ item.name }} {{ item.groupId ? "▣" : "" }}</span>
        </button>
        <button
          :aria-label="`${item.locked ? '解锁' : '锁定'} ${item.name}`"
          @click="$emit('toggle', item.id, 'locked')"
        >
          <el-icon><component :is="item.locked ? Lock : Unlock" /></el-icon>
        </button>
        <button
          :aria-label="`${item.visible === false ? '显示' : '隐藏'} ${item.name}`"
          @click="$emit('toggle', item.id, 'visible')"
        >
          <el-icon
            ><component :is="item.visible === false ? Hide : View"
          /></el-icon>
        </button>
      </div>
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
