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
  context: [event: MouseEvent, id: string];
}>();
</script>
<template>
  <div class="layers-panel">
    <div class="layer-items">
      <div
        v-for="item in [...document.elements].reverse()"
        :key="item.id"
        class="layer-row"
        @contextmenu.prevent.stop="$emit('context', $event, item.id)"
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
  </div>
</template>
