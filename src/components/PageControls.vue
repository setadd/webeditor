<script setup lang="ts">
import type { DiagramDocument } from "../domain/document";
import { pageSnapshots } from "../composables/usePages";
defineProps<{
  document: DiagramDocument;
  disabled?: boolean;
  readonly?: boolean;
}>();
defineEmits<{ switch: [id: string]; rename: [name: string] }>();
</script>
<template>
  <div
    class="page-controls"
    style="
      display: flex;
      gap: 12px;
      padding: 10px 24px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      align-items: center;
    "
  >
    <label
      >页面
      <select
        aria-label="切换页面"
        :disabled="disabled"
        :value="document.page.id"
        @change="$emit('switch', ($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="page in pageSnapshots(document)"
          :key="page.page.id"
          :value="page.page.id"
        >
          {{ page.name }}
        </option>
      </select></label
    >
    <label v-if="!readonly"
      >名称
      <input
        aria-label="当前页面名称"
        :disabled="disabled"
        :value="document.name"
        maxlength="60"
        @change="$emit('rename', ($event.target as HTMLInputElement).value)"
    /></label>
    <span style="font-size: 12px; color: #64748b"
      >{{ pageSnapshots(document).length }} 个页面</span
    >
  </div>
</template>
