<script setup lang="ts">
import { computed, ref } from "vue";
import type { DiagramElement } from "../domain/document";
import { readImageAsset, type ImageAsset } from "../domain/assets";
const props = defineProps<{
  selected?: DiagramElement;
  assets?: Record<string, ImageAsset>;
  preview?: { elementId: string; imageId: string };
}>();
const emit = defineEmits<{
  upload: [id: string, asset: ImageAsset, isDefault: boolean];
  default: [id: string, imageId: string | undefined];
  preview: [value: { elementId: string; imageId: string } | undefined];
}>();
const error = ref("");
const busy = ref(false);
const images = computed(() => {
  const s = props.selected;
  return [
    ...new Set([
      s?.defaultImageId,
      ...(s?.rules || []).map((r) => r.effects.imageId),
    ]),
  ]
    .filter((id): id is string => !!id)
    .map((id) => props.assets?.[id])
    .filter((a): a is ImageAsset => !!a);
});
async function upload(event: Event, isDefault: boolean) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const id = props.selected?.id;
  if (!file || !id) return;
  busy.value = true;
  error.value = "";
  try {
    const asset = await readImageAsset(file);
    if (props.selected?.id === id) emit("upload", id, asset, isDefault);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "图片读取失败";
  } finally {
    busy.value = false;
    input.value = "";
  }
}
</script>
<template>
  <section v-if="selected?.kind === 'device'" class="states-panel">
    <h3>设备状态图片</h3>
    <p>默认图片用于无匹配和数据异常。状态条件和优先级在显示规则中设置。</p>
    <label
      >默认图片<select
        aria-label="默认图片资源"
        :value="selected.defaultImageId || ''"
        @change="
          emit(
            'default',
            selected.id,
            ($event.target as HTMLSelectElement).value || undefined,
          )
        "
      >
        <option
          value=""
          :disabled="selected.rules?.some((r) => r.effects.imageId)"
        >
          无图片（设备外观）
        </option>
        <option v-for="asset in assets" :key="asset.id" :value="asset.id">
          {{ asset.name }}
        </option>
      </select></label
    >
    <label
      >上传默认图片<input
        type="file"
        aria-label="上传默认图片"
        accept="image/png,image/jpeg,image/webp"
        :disabled="busy"
        @change="upload($event, true)"
    /></label>
    <label
      >上传状态图片<input
        type="file"
        aria-label="上传状态图片"
        accept="image/png,image/jpeg,image/webp"
        :disabled="busy || !selected.defaultImageId"
        @change="upload($event, false)"
    /></label>
    <small
      >请先设置默认图片。PNG / JPEG / WebP，单张 ≤ 5 MB / 2500 万像素。</small
    >
    <div class="image-previews">
      <button
        v-for="asset in images"
        :key="asset.id"
        :aria-label="`预览图片 ${asset.name}`"
        @click="emit('preview', { elementId: selected.id, imageId: asset.id })"
      >
        <img :src="asset.dataUrl" alt="" /><span>{{ asset.name }}</span>
      </button>
    </div>
    <el-button
      v-if="preview?.elementId === selected.id"
      @click="emit('preview', undefined)"
      >结束图片预览</el-button
    >
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
<style scoped>
.states-panel {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
}
h3 {
  font-size: 13px;
}
p,
small {
  color: #64748b;
  line-height: 1.5;
}
label {
  display: grid;
  gap: 6px;
  margin: 10px 0;
}
input,
select {
  max-width: 100%;
}
select {
  padding: 6px;
}
.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}
.image-previews button {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  max-width: 95px;
  cursor: pointer;
}
.image-previews img {
  width: 45px;
  height: 45px;
  object-fit: contain;
  display: block;
  margin: auto;
}
span {
  overflow-wrap: anywhere;
}
</style>
