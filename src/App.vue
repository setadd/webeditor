<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  FolderOpened,
  DocumentChecked,
  Cpu,
  EditPen,
  ArrowRight,
  Grid,
  Files,
  Pointer,
  InfoFilled,
} from "@element-plus/icons-vue";
import InteractionPanel from "./components/InteractionPanel.vue";
import DataPanel from "./components/DataPanel.vue";
import { useMockData } from "./data/useMockData";
import DiagramCanvas from "./components/DiagramCanvas.vue";
import RuntimeView from "./components/RuntimeView.vue";
import { usePublication } from "./composables/usePublication";
import PageControls from "./components/PageControls.vue";
import { usePages } from "./composables/usePages";
import { useEditor } from "./composables/useEditor";
import { isColor, type DiagramElement } from "./domain/document";

const editor = useEditor();
const {
  document: doc,
  selected,
  selectedId,
  selectedIds,
  canUndo,
  canRedo,
  loading,
  saving,
  error,
  dirty,
  loadBlocked,
  saveState,
} = editor;
const publication = usePublication(doc);
const { mode, runtime, publishing, publicationError } = publication;
const pages = usePages(doc, (change) => { editor.mutate(change); editor.clearSelection(); });
const { samples, history } = useMockData(doc);
const newPageVisible = ref(false);
const newPage = reactive({ name: "未命名组态", width: 960, height: 640 });
const newPageValid = computed(
  () =>
    newPage.name.trim().length > 0 &&
    Number.isInteger(newPage.width) &&
    newPage.width >= 400 &&
    newPage.width <= 3840 &&
    Number.isInteger(newPage.height) &&
    newPage.height >= 300 &&
    newPage.height <= 2160,
);
const colorInput = ref("#0d9488");
const palette = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#e59b20",
  "#e35050",
  "#334155",
];
watch(
  () => [selected.value?.id, selected.value?.color],
  () => {
    colorInput.value = selected.value?.color || "#0d9488";
  },
);
const lastSaved = computed(() =>
  doc.value.savedAt
    ? new Date(doc.value.savedAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "尚无本机保存",
);
const busy = computed(() => loading.value || saving.value);

function changeText(field: "name" | "text", value: string) {
  if (selected.value) editor.update(selected.value.id, { [field]: value });
}
function changePosition(
  field: "x" | "y" | "width" | "height" | "rotation",
  value: number | undefined,
) {
  if (selected.value && value !== undefined && Number.isFinite(value))
    editor.update(selected.value.id, { [field]: value });
}
function changeColor(value: string) {
  colorInput.value = value;
  if (selected.value && isColor(value))
    editor.update(selected.value.id, { color: value.toLowerCase() });
}
function select(item: DiagramElement, event: MouseEvent) {
  editor.select(item.id, event.shiftKey || event.ctrlKey || event.metaKey);
}
async function confirmReplacement(): Promise<boolean> {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(
      "当前画布有未保存的修改。继续后将离开这些修改。",
      "保留当前修改？",
      {
        confirmButtonText: "继续",
        cancelButtonText: "返回编辑",
        type: "warning",
      },
    );
    return true;
  } catch {
    return false;
  }
}
async function openSaved() {
  if (await confirmReplacement()) await editor.open();
}
async function createProject() {
  if (await confirmReplacement()) editor.create("未命名组态", 960, 640);
}
async function openNewPage() {
  newPageVisible.value = true;
}
function createPage() {
  if (!newPageValid.value) return;
  pages.addPage(newPage.name.trim(), newPage.width, newPage.height);
  newPageVisible.value = false;
}
async function save() {
  if (await editor.save()) ElMessage.success("已保存到本机");
}
async function publish() {
  if (await publication.publish()) ElMessage.success("本机发布成功");
}
function guardRuntimeKeys(event: KeyboardEvent) {
  if (mode.value === 'edit') return;
  const command = event.ctrlKey || event.metaKey;
  if (['Delete', 'Backspace', 'Escape'].includes(event.key) || (command && ['z', 'y', 'c', 'v', 'a', 's', 'd'].includes(event.key.toLowerCase()))) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
function keydown(event: KeyboardEvent) {
  if (mode.value !== "edit") return;
  if (
    (event.target as HTMLElement).closest(
      "input,textarea,select,[contenteditable=true],[role=dialog]",
    ) ||
    document.querySelector(".el-overlay-dialog")
  )
    return;
  const ctrl = event.ctrlKey || event.metaKey;
  let action: (() => unknown) | undefined;
  if (ctrl)
    action = (
      {
        z: event.shiftKey ? editor.redo : editor.undo,
        y: editor.redo,
        c: editor.copy,
        v: editor.paste,
        a: editor.selectAll,
        s: save,
        d: editor.duplicate,
      } as Record<string, () => unknown>
    )[event.key.toLowerCase()];
  else if (event.key === "Delete" || event.key === "Backspace")
    action = editor.remove;
  else if (event.key === "Escape") action = () => editor.select(null);
  if (action) {
    event.preventDefault();
    action();
  }
}
onMounted(() => {
  window.addEventListener("keydown", keydown);
  void editor.open();
  if (location.hash === "#published") void publication.openPublished();
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("keydown", guardRuntimeKeys, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
  window.removeEventListener("keydown", guardRuntimeKeys, true);
  window.removeEventListener("keydown", keydown);
});
</script>

<template>
  <div class="editor-app">
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark"
          ><el-icon><Grid /></el-icon></span
        ><strong>组态工作台</strong><span class="brand-divider"></span
        ><span class="workspace-label">本机项目</span>
      </div>
      <div class="header-right">
        <span class="local-badge"><i></i> 本地工作空间</span
        ><span class="avatar">工</span>
      </div>
    </header>
    <template v-if="mode === 'edit'">
    <section class="project-bar">
      <div class="project-heading">
        <span class="project-icon"
          ><el-icon><Files /></el-icon
        ></span>
        <div>
          <div class="breadcrumb">
            我的工作空间 <el-icon><ArrowRight /></el-icon> 组态页面
          </div>
          <div class="title-row">
            <h1 data-testid="page-title">{{ doc.name }}</h1>
            <span
              data-testid="save-state"
              class="save-state"
              :class="{ unsaved: dirty }"
              >{{ saveState }}</span
            >
          </div>
        </div>
      </div>
      <div class="project-actions">
        <el-button :disabled="busy" @click="createProject">新建项目</el-button>
        <el-button :disabled="busy" @click="publication.preview">预览草稿</el-button>
        <el-button :disabled="busy" :loading="publishing" @click="publish">发布到本机</el-button>
        <el-button :disabled="busy || publishing" @click="publication.openPublished">打开发布版本</el-button>
        <el-button :icon="Plus" :disabled="busy" @click="openNewPage"
          >新建页面</el-button
        >
        <el-button :icon="FolderOpened" :disabled="busy" @click="openSaved"
          >打开本机</el-button
        >
        <el-button
          type="primary"
          :icon="DocumentChecked"
          :loading="saving"
          :disabled="loading || loadBlocked"
          @click="save"
          >保存到本机</el-button
        >
      </div>
    </section>
    <div v-if="publicationError" role="alert" class="error-banner">{{ publicationError }}</div>
    <PageControls :document="doc" :disabled="busy" @switch="pages.switchPage" @rename="pages.rename" />
    <div v-if="error" class="error-banner" role="alert">
      <el-icon><InfoFilled /></el-icon><span>{{ error }}</span
      ><el-button v-if="loadBlocked" size="small" @click="editor.open"
        >重新读取</el-button
      >
    </div>
    <main class="editor-layout" v-loading="loading">
      <aside class="library-panel">
        <div class="panel-title">
          组件库 <span class="tiny-badge">基础</span>
        </div>
        <div class="library-content">
          <div class="section-label">常用图元</div>
          <div class="component-grid">
            <button
              v-for="kind in ['metric', 'chart'] as const"
              :key="kind"
              :aria-label="kind === 'metric' ? '添加指标' : '添加趋势图'"
              class="component-button"
              :disabled="loading || loadBlocked"
              @click="editor.add(kind)"
            >
              <strong>{{ kind === "metric" ? "指标" : "趋势图" }}</strong
              ><small>实时与历史数据</small>
            </button>
            <button
              aria-label="添加设备"
              class="component-button"
              :disabled="loading || loadBlocked"
              @click="editor.add('device')"
            >
              <span class="component-preview device-preview"
                ><el-icon><Cpu /></el-icon></span
              ><strong>设备</strong><small>设备占位图元</small>
            </button>
            <button
              aria-label="添加文字"
              class="component-button"
              :disabled="loading || loadBlocked"
              @click="editor.add('text')"
            >
              <span class="component-preview text-preview">T<span>t</span></span
              ><strong>文字</strong><small>标题与说明</small>
            </button>
          </div>
          <p class="library-tip">
            <el-icon><InfoFilled /></el-icon> 点击添加，再拖动到合适位置
          </p>
        </div>
        <div class="panel-title layers-title">
          页面图元 <span class="count">{{ doc.elements.length }}</span>
        </div>
        <div class="layer-list">
          <div v-if="!doc.elements.length" class="empty-layers">
            图元会显示在这里
          </div>
          <button
            v-for="item in doc.elements"
            :key="item.id"
            :aria-label="`选择图元 ${item.name}`"
            :aria-pressed="selectedIds.includes(item.id)"
            :class="['layer-item', { active: selectedIds.includes(item.id) }]"
            @click="select(item, $event)"
          >
            <el-icon
              ><Cpu v-if="item.kind === 'device'" /><EditPen v-else /></el-icon
            ><span>{{ item.name || "未命名图元" }}</span
            ><span class="layer-dot" :style="{ background: item.color }"></span>
          </button>
        </div>
        <div class="local-note">
          <span class="note-icon"
            ><el-icon><FolderOpened /></el-icon
          ></span>
          <div>
            <strong>保存在当前浏览器</strong>
            <p>同一电脑、同一浏览器中<br />可重新打开上次保存的页面</p>
          </div>
        </div>
      </aside>
      <section class="canvas-workspace" aria-label="编辑工作区">
        <div class="edit-actions" role="toolbar" aria-label="编辑命令">
          <el-button :disabled="!canUndo" @click="editor.undo">撤销</el-button
          ><el-button :disabled="!canRedo" @click="editor.redo">重做</el-button
          ><el-button @click="editor.copy">复制</el-button
          ><el-button @click="editor.paste">粘贴</el-button
          ><el-button @click="editor.duplicate">重复</el-button
          ><el-button @click="editor.selectAll">全选</el-button
          ><el-button @click="editor.remove">删除</el-button
          ><span>已选 {{ selectedIds.length }} 项</span>
        </div>
        <div class="canvas-toolbar">
          <span class="tool-selected"
            ><el-icon><Pointer /></el-icon> 选择 / 移动</span
          ><span class="toolbar-divider"></span
          ><span class="toolbar-hint">拖动图元调整位置</span
          ><span class="page-size" data-testid="page-size"
            >{{ doc.page.width }} × {{ doc.page.height }}</span
          >
        </div>
        <div class="canvas-scroll">
          <div class="sheet-wrap" :style="{ width: `${doc.page.width}px` }">
            <div class="sheet-caption">
              <span><i></i> {{ doc.name }}</span
              ><span>画布 · px</span>
            </div>
            <div
              class="canvas-sheet"
              :style="{
                width: `${doc.page.width}px`,
                height: `${doc.page.height}px`,
              }"
            >
              <DiagramCanvas
                :document="doc"
                :samples="samples"
                :history="history"
                :selected-id="selectedId"
                :selected-ids="selectedIds"
                @select="editor.select"
                @select-many="selectedIds = $event"
                @gesture-start="editor.beginGesture"
                @gesture-end="editor.endGesture"
                @transform="(id, patch) => editor.update(id, patch)"
                @move="(id, x, y) => editor.update(id, { x, y })"
              />
              <div v-if="!doc.elements.length" class="canvas-empty">
                <div class="empty-illustration">
                  <el-icon><Grid /></el-icon><span>+</span>
                </div>
                <h2>从第一个图元开始</h2>
                <p>在左侧添加设备或文字，构建你的组态页面</p>
                <span class="empty-step"
                  >添加图元 <b>→</b> 配置属性 <b>→</b> 保存到本机</span
                >
              </div>
            </div>
          </div>
        </div>
        <footer class="canvas-footer">
          <span
            ><i class="status-dot"></i>
            {{
              selected
                ? `已选择：${selected.name || "未命名图元"}`
                : "就绪，选择一个图元开始编辑"
            }}</span
          ><span>{{ doc.elements.length }} 个图元 <b>·</b> 100%</span>
        </footer>
      </section>
      <aside class="properties-panel">
        <div class="panel-title">
          属性配置
          <span class="tiny-badge">{{ selected ? "图元" : "页面" }}</span>
        </div>
        <template v-if="selected">
          <div class="selection-heading">
            <span class="selection-icon"
              ><el-icon
                ><Cpu v-if="selected.kind === 'device'" /><EditPen
                  v-else /></el-icon
            ></span>
            <div>
              <strong>{{
                {
                  device: "设备图元",
                  text: "文字图元",
                  metric: "指标图元",
                  chart: "趋势图元",
                }[selected.kind]
              }}</strong
              ><small>修改后即时应用到画布</small>
            </div>
          </div>
          <el-form label-position="top" class="property-form" @submit.prevent>
            <div class="property-section-title">基本信息</div>
            <el-form-item label="图元名称" for="element-name"
              ><el-input
                id="element-name"
                :model-value="selected.name"
                maxlength="60"
                @update:model-value="changeText('name', $event)"
            /></el-form-item>
            <el-form-item label="显示文字" for="element-text"
              ><el-input
                id="element-text"
                :model-value="selected.text"
                maxlength="160"
                @update:model-value="changeText('text', $event)"
            /></el-form-item>
            <div class="property-section-title separated">位置</div>
            <div class="position-grid">
              <el-form-item label="X 坐标" for="position-x"
                ><el-input-number
                  id="position-x"
                  :model-value="selected.x"
                  :min="0"
                  :max="doc.page.width - selected.width"
                  :precision="0"
                  controls-position="right"
                  @update:model-value="changePosition('x', $event)"
              /></el-form-item>
              <el-form-item label="Y 坐标" for="position-y"
                ><el-input-number
                  id="position-y"
                  :model-value="selected.y"
                  :min="0"
                  :max="doc.page.height - selected.height"
                  :precision="0"
                  controls-position="right"
                  @update:model-value="changePosition('y', $event)"
              /></el-form-item>
            </div>
            <p class="field-hint">从画布左上角计算，单位为 px</p>
            <el-form-item
              v-for="field in ['width', 'height', 'rotation'] as const"
              :key="field"
              :label="
                { width: '宽度', height: '高度', rotation: '旋转角度' }[field]
              "
              :for="field"
              ><el-input-number
                :id="field"
                :model-value="selected[field] || 0"
                :min="field === 'rotation' ? 0 : 20"
                :max="
                  field === 'rotation'
                    ? 359
                    : field === 'width'
                      ? doc.page.width
                      : doc.page.height
                "
                @update:model-value="changePosition(field, $event)"
            /></el-form-item>
            <div class="property-section-title separated">外观</div>
            <el-form-item
              label="基础颜色"
              for="base-color"
              :error="isColor(colorInput) ? '' : '请输入完整的六位十六进制颜色'"
            >
              <div class="color-control">
                <input
                  aria-label="选择基础颜色"
                  type="color"
                  :value="selected.color"
                  @input="
                    changeColor(($event.target as HTMLInputElement).value)
                  "
                /><el-input
                  id="base-color"
                  :model-value="colorInput"
                  maxlength="7"
                  @update:model-value="changeColor"
                />
              </div>
            </el-form-item>
            <div class="palette">
              <button
                v-for="color in palette"
                :key="color"
                :aria-label="`使用颜色 ${color}`"
                :class="{ chosen: selected.color === color }"
                :style="{ background: color }"
                @click="changeColor(color)"
              ></button>
            </div>
            <div class="property-section-title separated">图元标识</div>
            <el-input
              aria-label="图元标识"
              :model-value="selected.id"
              readonly
              class="id-input"
            />
            <p class="field-hint">唯一标识随页面保存保持不变</p>
          </el-form>
        </template>
        <div v-else class="page-properties">
          <span class="page-info-icon"
            ><el-icon><Files /></el-icon
          ></span>
          <h3>{{ doc.name }}</h3>
          <p>选择画布中的图元<br />查看和编辑它的属性</p>
          <dl>
            <dt>画布尺寸</dt>
            <dd>{{ doc.page.width }} × {{ doc.page.height }}</dd>
            <dt>图元数量</dt>
            <dd>{{ doc.elements.length }} 个</dd>
            <dt>保存位置</dt>
            <dd>当前浏览器</dd>
          </dl>
          <div class="property-help">
            <strong>开始编排</strong>
            <p>① 添加设备或文字</p>
            <p>② 拖动到目标位置</p>
            <p>③ 在这里调整属性</p>
            <p>④ 保存你的工作</p>
          </div>
        </div>
        <InteractionPanel :document="doc" :selected="selected" @change="(id, interaction) => editor.update(id, { interaction })" />
        <DataPanel
          @range="(id, historyMinutes) => editor.update(id, { historyMinutes })"
          :selected="selected"
          @bind="(id, binding) => editor.update(id, { binding })"
        />
        <div class="property-footer">
          <el-icon><DocumentChecked /></el-icon> {{ lastSaved }}
        </div>
      </aside>
    </main>
    </template>
    <RuntimeView v-if="runtime && mode !== 'edit'" :document="runtime" :mode="mode" @exit="publication.exit" />
    <el-dialog
      v-model="newPageVisible"
      title="新建组态页面"
      width="440px"
      :close-on-click-modal="false"
    >
      <p class="dialog-intro">设置页面名称和画布尺寸，开始新的编排。</p>
      <el-form label-position="top" @submit.prevent="createPage">
        <el-form-item label="页面名称" for="new-page-name"
          ><el-input
            id="new-page-name"
            v-model="newPage.name"
            maxlength="60"
            autofocus
        /></el-form-item>
        <div class="position-grid">
          <el-form-item label="画布宽度" for="new-page-width"
            ><el-input-number
              id="new-page-width"
              v-model="newPage.width"
              :min="400"
              :max="3840"
              :precision="0"
              controls-position="right" /></el-form-item
          ><el-form-item label="画布高度" for="new-page-height"
            ><el-input-number
              id="new-page-height"
              v-model="newPage.height"
              :min="300"
              :max="2160"
              :precision="0"
              controls-position="right"
          /></el-form-item>
        </div>
        <p class="field-hint">
          宽度 400–3840 px，高度 300–2160 px。页面保存在同一个本机项目中。
        </p>
      </el-form>
      <template #footer
        ><el-button @click="newPageVisible = false">取消</el-button
        ><el-button type="primary" :disabled="!newPageValid" @click="createPage"
          >创建页面</el-button
        ></template
      >
    </el-dialog>
  </div>
</template>

<style scoped>
.edit-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}
.edit-actions .el-button {
  margin: 0;
}
.edit-actions span {
  font-size: 12px;
  color: #64748b;
  margin-left: auto;
}
</style>
