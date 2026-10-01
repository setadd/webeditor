<script setup lang="ts">
import { evaluateRules, rulePointIds } from "../domain/rules";
import { computed, ref, toRef, watch } from "vue";
import { useMockData } from "../data/useMockData";
import DiagramCanvas from "./DiagramCanvas.vue";
import PageControls from "./PageControls.vue";
import { activatePage, pageSnapshots } from "../composables/usePages";
import type { DiagramDocument, DiagramElement } from "../domain/document";
const props = defineProps<{ document: DiagramDocument; mode: string }>();
const { samples, history, provider } = useMockData(toRef(props, "document"));
defineEmits<{ exit: [] }>();
const nameFilter = ref(""),
  statusFilter = ref("all"),
  minutes = ref(0),
  detailId = ref<string | null>(null),
  error = ref("");
const detail = computed(() =>
  props.document.elements.find((e) => e.id === detailId.value),
);
const detailSample = computed(() => samples.value[detail.value?.binding || ""]);
function state(item: DiagramElement) {
  if (
    evaluateRules(
      { color: item.color },
      item.rules,
      samples.value,
      item.binding,
    ).abnormal
  )
    return "数据异常";
  return item.binding || rulePointIds(item.rules).length ? "正常" : "未绑定";
}
const filtered = computed(() =>
  props.document.elements.filter(
    (e) =>
      e.name.toLowerCase().includes(nameFilter.value.toLowerCase()) &&
      (statusFilter.value === "all" || state(e) === statusFilter.value),
  ),
);
const renderDocument = computed(() => ({
  ...props.document,
  elements: props.document.elements.map((e) =>
    e.kind === "chart" && minutes.value
      ? { ...e, historyMinutes: minutes.value }
      : e,
  ),
}));
const rangeHistory = computed(() =>
  !minutes.value
    ? history.value
    : Object.fromEntries(
        Object.keys(history.value).map((id) => [
          id,
          provider.history(id, Date.now() - minutes.value * 60000, Date.now()),
        ]),
      ),
);
function clear() {
  nameFilter.value = "";
  statusFilter.value = "all";
}
function switchPage(id: string) {
  error.value = "";
  detailId.value = null;
  if (!pageSnapshots(props.document).some((p) => p.page.id === id)) {
    error.value = "跳转目标页面不存在，请返回编辑检查配置。";
    return;
  }
  activatePage(props.document, id);
  clear();
}
function click(id: string | null) {
  const item = props.document.elements.find((e) => e.id === id);
  if (!item) return;
  if (item.interaction?.action === "navigate")
    switchPage(item.interaction.pageId || "");
  else if (item.interaction?.action === "details") detailId.value = item.id;
}
function formattedValue(item: DiagramElement) {
  const sample = samples.value[item.binding || ""];
  if (!sample || sample.quality !== "good" || sample.value === null)
    return "数据不可用";
  const unit =
    provider.catalog().find((p) => p.id === item.binding)?.unit || "";
  return `${sample.value}${unit ? " " + unit : ""}`;
}
watch(
  () => props.document.page.id,
  () => {
    detailId.value = null;
    clear();
  },
);
</script>
<template>
  <section data-testid="runtime">
    <header class="runtime-header">
      <strong
        >{{ mode === "preview" ? "草稿预览" : "本机发布版本" }} ·
        {{ document.name }}</strong
      ><el-button @click="$emit('exit')">返回编辑</el-button>
    </header>
    <PageControls :document="document" readonly @switch="switchPage" />
    <div v-if="error" role="alert">{{ error }}</div>
    <div class="runtime-body">
      <aside class="runtime-list">
        <h3>当前页面图元列表</h3>
        <label
          >按名称筛选<input aria-label="按名称筛选" v-model="nameFilter"
        /></label>
        <label
          >按状态筛选<select aria-label="按状态筛选" v-model="statusFilter">
            <option value="all">全部状态</option>
            <option>正常</option>
            <option>数据异常</option>
            <option>未绑定</option>
          </select></label
        >
        <el-button @click="clear">清除筛选</el-button>
        <p>
          当前页面图元列表：{{ filtered.length }} /
          {{ document.elements.length }}
        </p>
        <small>仅筛选此列表，画布保持完整。</small>
        <button
          v-for="item in filtered"
          :key="item.id"
          class="runtime-item"
          :aria-label="`查看图元 ${item.name}`"
          @click="click(item.id)"
        >
          {{ item.name }} · {{ state(item)
          }}<span v-if="!item.interaction"> · 无动作</span>
        </button>
        <p v-if="!filtered.length">没有符合条件的图元</p>
        <label
          >历史图表范围<select
            aria-label="运行历史时间范围"
            v-model.number="minutes"
          >
            <option :value="0">按图元配置</option>
            <option :value="15">最近 15 分钟</option>
            <option :value="60">最近 1 小时</option>
          </select></label
        ><small>作用于本页历史图表，退出后恢复配置。</small>
      </aside>
      <div class="runtime-canvas">
        <DiagramCanvas
          :document="renderDocument"
          :samples="samples"
          :history="rangeHistory"
          :selected-id="null"
          readonly
          @select="click"
        />
      </div>
    </div>
    <el-dialog
      :model-value="!!detail"
      title="图元详情"
      @close="detailId = null"
      width="460px"
    >
      <dl v-if="detail">
        <dt>图元名称</dt>
        <dd>{{ detail.name }}</dd>
        <dt>绑定点位</dt>
        <dd>
          {{
            provider.catalog().find((p) => p.id === detail?.binding)?.name ||
            "未绑定"
          }}
        </dd>
        <dt>当前值</dt>
        <dd>{{ formattedValue(detail) }}</dd>
        <dt>采样时间</dt>
        <dd>
          {{
            detailSample
              ? new Date(detailSample.timestamp).toLocaleString("zh-CN")
              : "暂无采样"
          }}
        </dd>
        <dt>数据状态</dt>
        <dd>{{ state(detail) }}</dd>
      </dl>
      <template #footer
        ><el-button @click="detailId = null">关闭详情</el-button></template
      >
    </el-dialog>
  </section>
</template>
<style scoped>
.runtime-header {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
}
.runtime-body {
  display: flex;
  height: calc(100vh - 180px);
}
.runtime-list {
  width: 240px;
  flex: none;
  padding: 16px;
  background: white;
  overflow: auto;
  font-size: 12px;
}
.runtime-list label {
  display: block;
  margin: 10px 0;
}
.runtime-list input,
.runtime-list select {
  display: block;
  width: 100%;
  padding: 6px;
  margin-top: 4px;
}
.runtime-list small {
  color: #64748b;
}
.runtime-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 10px;
  margin: 6px 0;
}
.runtime-canvas {
  overflow: auto;
  flex: 1;
  padding: 24px;
}
dt {
  color: #64748b;
  margin-top: 12px;
}
dd {
  margin: 4px 0;
}
</style>
