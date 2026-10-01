<script setup lang="ts">
import { computed, ref } from "vue";
import {
  defaultBackground,
  readImageAsset,
  type PageBackground,
  type ImageAsset,
} from "../domain/assets";
import { isColor, type DiagramDocument } from "../domain/document";
const props = defineProps<{ document: DiagramDocument; disabled?: boolean }>();
const emit = defineEmits<{
  change: [background: PageBackground, asset?: ImageAsset];
}>();
const background = computed(
  () => props.document.page.background || defaultBackground(),
);
const error = ref("");
const uploading = ref(false);
function patch(value: Partial<PageBackground>) {
  emit("change", { ...background.value, ...value });
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const pageId = props.document.page.id;
  error.value = "";
  uploading.value = true;
  try {
    const asset = await readImageAsset(file, props.document.assets);
    if (props.document.page.id === pageId)
      emit("change", { ...background.value, imageId: asset.id }, asset);
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "图片读取失败，原图片已保留。";
  } finally {
    uploading.value = false;
    input.value = "";
  }
}
</script>
<template>
  <fieldset class="background-panel" :disabled="disabled || uploading">
    <legend>页面背景</legend>
    <label
      >背景颜色<input
        aria-label="背景颜色"
        :value="background.color"
        @input="
          isColor(($event.target as HTMLInputElement).value) &&
          patch({ color: ($event.target as HTMLInputElement).value })
        "
    /></label>
    <label
      >上传背景图<input
        aria-label="上传背景图"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        @change="upload"
    /></label>
    <small
      >PNG / JPEG / WebP；单张 ≤ 5 MB，≤ 2500 万像素。项目最多 100 张 / 总大小
      25 MB。图片随项目保存在本机。</small
    >
    <label
      >图片模式<select
        aria-label="背景图片模式"
        :value="background.mode"
        @change="
          patch({
            mode: ($event.target as HTMLSelectElement)
              .value as PageBackground['mode'],
          })
        "
      >
        <option value="contain">适应</option>
        <option value="cover">铺满</option>
        <option value="stretch">拉伸</option>
        <option value="tile">平铺</option>
      </select></label
    >
    <label
      >图片透明度（%）<input
        aria-label="背景图片透明度"
        type="number"
        min="0"
        max="100"
        :value="Math.round(background.opacity * 100)"
        @input="
          patch({
            opacity:
              Math.max(
                0,
                Math.min(
                  100,
                  Number(($event.target as HTMLInputElement).value),
                ),
              ) / 100,
          })
        "
    /></label>
    <el-button
      :disabled="!background.imageId"
      @click="patch({ imageId: undefined })"
      >移除背景图</el-button
    >
    <p v-if="error" role="alert">{{ error }}</p>
  </fieldset>
</template>
<style scoped>
.background-panel {
  margin: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  min-width: 0;
  display: grid;
  gap: 10px;
  text-align: left;
  font-size: 12px;
}
legend {
  font-weight: 600;
  color: #334155;
}
label {
  display: grid;
  gap: 5px;
  color: #64748b;
}
input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #334155;
  background: white;
}
small {
  color: #64748b;
  line-height: 1.6;
}
p {
  color: #b91c1c;
}
</style>
