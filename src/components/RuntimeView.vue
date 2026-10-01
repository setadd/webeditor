<script setup lang="ts">
import DiagramCanvas from "./DiagramCanvas.vue";
import PageControls from "./PageControls.vue";
import { activatePage } from "../composables/usePages";
import type { DiagramDocument } from "../domain/document";
defineProps<{ document: DiagramDocument; mode: string }>();
defineEmits<{ exit: [] }>();
</script>
<template>
  <section data-testid="runtime">
    <header
      style="
        display: flex;
        justify-content: space-between;
        padding: 16px 24px;
        background: white;
      "
    >
      <strong
        >{{ mode === "preview" ? "草稿预览" : "本机发布版本" }} ·
        {{ document.name }}</strong
      >
      <el-button @click="$emit('exit')">返回编辑</el-button>
    </header>
    <PageControls
      :document="document"
      readonly
      @switch="activatePage(document, $event)"
    />
    <div style="overflow: auto; max-height: calc(100vh - 180px); padding: 24px">
      <DiagramCanvas :document="document" :selected-id="null" readonly />
    </div>
  </section>
</template>
