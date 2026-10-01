<script setup lang="ts">
import { computed } from "vue";
import type { DiagramDocument } from "../domain/document";
import { defaultBackground } from "../domain/assets";
const props = defineProps<{ document: DiagramDocument }>();
const background = computed(
  () => props.document.page.background || defaultBackground(),
);
const image = computed(
  () => props.document.assets?.[background.value.imageId || ""]?.dataUrl,
);
</script>
<template>
  <div
    class="page-background"
    data-testid="background-color"
    :style="{ backgroundColor: background.color }"
  >
    <div
      data-testid="background-image"
      class="page-background"
      :style="{
        backgroundImage: image ? `url(${image})` : 'none',
        backgroundSize:
          background.mode === 'stretch'
            ? '100% 100%'
            : background.mode === 'tile'
              ? 'auto'
              : background.mode,
        backgroundRepeat: background.mode === 'tile' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center',
        opacity: background.opacity,
      }"
    ></div>
  </div>
</template>
<style scoped>
.page-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
