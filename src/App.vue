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
  DocumentChecked,
  Cpu,
  EditPen,
  Grid,
  Files,
  Pointer,
  InfoFilled,
  Operation,
  View,
  ArrowDown,
  Back,
  Right,
  CopyDocument,
  Delete,
  FullScreen,
} from "@element-plus/icons-vue";
import ComponentLibrary from "./components/ComponentLibrary.vue";
import EditorContextMenu from "./components/EditorContextMenu.vue";
import { useEditorContextMenu } from "./composables/useEditorContextMenu";
import "./workbench.css";
import { createDemo } from "./domain/demo";
import { readProjectFile, exportProject } from "./storage/projectTransfer";
import StatesPanel from "./components/StatesPanel.vue";
import type { ImageAsset } from "./domain/assets";
import BackgroundPanel from "./components/BackgroundPanel.vue";
import RulesPanel from "./components/RulesPanel.vue";
import InteractionPanel from "./components/InteractionPanel.vue";
import DataPanel from "./components/DataPanel.vue";
import { useMockData } from "./data/useMockData";
import LayersPanel from "./components/LayersPanel.vue";
import { useLayers } from "./composables/useLayers";
import FlowPanel from "./components/FlowPanel.vue";
import LineProperties from "./components/LineProperties.vue";
import type { LineKind } from "./domain/lines";
import CanvasViewport from "./components/CanvasViewport.vue";
import DiagramCanvas from "./components/DiagramCanvas.vue";
import RuntimeView from "./components/RuntimeView.vue";
import { usePublication } from "./composables/usePublication";
import PageControls from "./components/PageControls.vue";
import { usePages } from "./composables/usePages";
import { useEditor } from "./composables/useEditor";
import { isColor, type DiagramElement } from "./domain/document";

const drawingTool = ref<LineKind | null>(null);
const editor = useEditor();
const importing = ref(false);
async function loadDemo() {
  if (await confirmReplacement()) {
    editor.replaceDraft(createDemo());
    drawingTool.value = null;
    imagePreview.value = undefined;
  }
}
async function importProject(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importing.value = true;
  try {
    const project = await readProjectFile(file);
    if (await confirmReplacement()) {
      editor.replaceDraft(project);
      imagePreview.value = undefined;
      ElMessage.success("项目已导入，请保存到本机");
    }
  } catch (reason) {
    ElMessage.error(
      "导入失败：" + (reason instanceof Error ? reason.message : "文件不可用"),
    );
  } finally {
    input.value = "";
    importing.value = false;
  }
}

const imagePreview = ref<{ elementId: string; imageId: string }>();
function uploadState(id: string, asset: ImageAsset, isDefault: boolean) {
  if (!editor.canEdit(id)) return;
  editor.mutate(() => {
    const item = editor.document.value.elements.find((e) => e.id === id);
    if (!item) return;
    editor.document.value.assets ||= {};
    editor.document.value.assets[asset.id] = asset;
    if (isDefault) item.defaultImageId = asset.id;
    else {
      item.rules ||= [];
      item.rules.push({
        id: crypto.randomUUID(),
        mode: "all",
        conditions: [{ pointId: "running", operator: "eq", value: 1 }],
        effects: { imageId: asset.id },
      });
    }
  });
  imagePreview.value = undefined;
}

function addLine(item: DiagramElement) {
  editor.mutate(() => doc.value.elements.push(item));
  editor.select(item.id);
  drawingTool.value = null;
}
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
const layers = useLayers(doc, selectedIds, editor.mutate);
const publication = usePublication(doc);
const { mode, runtime, publishing, publicationError } = publication;
const pages = usePages(doc, (change) => {
  editor.mutate(change);
  editor.clearSelection();
});
watch(
  () => [selectedId.value, doc.value.page.id],
  () => {
    imagePreview.value = undefined;
  },
);
const { samples, history } = useMockData(
  doc,
  undefined,
  computed(() => mode.value === "edit"),
);
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
const busy = computed(() => loading.value || saving.value || importing.value);
const contextMenu = useEditorContextMenu(editor, layers);
const { position: menuPosition, groups: menuGroups } = contextMenu;
function openContextMenu(
  event: MouseEvent,
  id: string | null,
  point?: { x: number; y: number },
) {
  if (
    busy.value ||
    loadBlocked.value ||
    mode.value !== "edit" ||
    drawingTool.value
  )
    return;
  contextMenu.open(event, id, point);
}
watch(
  () => [doc.value.page.id, mode.value, busy.value, drawingTool.value],
  contextMenu.close,
);

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
  if (mode.value === "edit") return;
  const command = event.ctrlKey || event.metaKey;
  if (
    ["Delete", "Backspace", "Escape"].includes(event.key) ||
    (command &&
      ["z", "y", "c", "v", "a", "s", "d"].includes(event.key.toLowerCase()))
  ) {
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

const inspectorTab = ref("appearance");
const libraryOpen = ref(true),
  layersOpen = ref(true),
  inspectorOpen = ref(true);
const projectMenu = ref(false);
const importInput = ref<HTMLInputElement>();
const layoutColumns = computed(() =>
  [
    libraryOpen.value ? "var(--library-width)" : "",
    layersOpen.value ? "var(--layers-width)" : "",
    "minmax(0,1fr)",
    inspectorOpen.value ? "var(--inspector-width)" : "",
  ]
    .filter(Boolean)
    .join(" "),
);
const inspectorTabs = [
  { id: "appearance", name: "属性" },
  { id: "data", name: "数据" },
  { id: "rules", name: "规则" },
  { id: "page", name: "页面" },
];
function addComponent(
  kind: Parameters<typeof editor.add>[0],
  center?: { x: number; y: number },
) {
  drawingTool.value = null;
  editor.add(kind, center);
  inspectorTab.value = "appearance";
  inspectorOpen.value = true;
}
function projectAction(action: () => unknown) {
  projectMenu.value = false;
  void action();
}
watch(selectedId, () => {
  inspectorTab.value = "appearance";
});
</script>

<template>
  <div
    class="editor-app workbench"
    :class="{ 'runtime-mode': mode !== 'edit' }"
  >
    <header class="workbench-header">
      <div class="workbench-brand">
        <span class="workbench-logo"
          ><el-icon><Grid /></el-icon></span
        ><strong>组态工作台</strong>
      </div>
      <template v-if="mode === 'edit'">
        <span class="header-separator"></span>
        <button
          class="panel-toggle"
          aria-label="切换组件库"
          :aria-pressed="libraryOpen"
          title="组件库"
          @click="libraryOpen = !libraryOpen"
        >
          <el-icon><Grid /></el-icon>
        </button>
        <button
          class="panel-toggle"
          aria-label="切换图层"
          :aria-pressed="layersOpen"
          title="图层"
          @click="layersOpen = !layersOpen"
        >
          <el-icon><Files /></el-icon>
        </button>
        <button
          class="panel-toggle"
          aria-label="切换属性面板"
          :aria-pressed="inspectorOpen"
          title="属性面板"
          @click="inspectorOpen = !inspectorOpen"
        >
          <el-icon><Operation /></el-icon>
        </button>
        <div class="header-project">
          <h1 data-testid="page-title">{{ doc.name }}</h1>
          <span
            data-testid="save-state"
            class="save-state"
            :class="{ unsaved: dirty }"
            >{{ saveState }}</span
          >
        </div>
        <div class="header-actions">
          <el-popover
            v-model:visible="projectMenu"
            trigger="click"
            placement="bottom-end"
            :width="210"
            popper-class="project-menu-popover"
          >
            <template #reference
              ><el-button size="small" aria-label="项目菜单"
                >项目 <el-icon><ArrowDown /></el-icon></el-button
            ></template>
            <div class="project-menu">
              <button :disabled="busy" @click="projectAction(createProject)">
                新建项目
              </button>
              <button :disabled="busy" @click="projectAction(openNewPage)">
                新建页面
              </button>
              <button :disabled="busy" @click="projectAction(openSaved)">
                打开本机
              </button>
              <hr />
              <button
                :disabled="busy"
                @click="projectAction(() => importInput?.click())"
              >
                导入项目
              </button>
              <button
                :disabled="busy"
                @click="projectAction(() => exportProject(doc))"
              >
                导出项目
              </button>
              <button :disabled="busy" @click="projectAction(loadDemo)">
                载入演示项目
              </button>
              <hr />
              <button
                :disabled="busy || publishing"
                @click="projectAction(publication.openPublished)"
              >
                打开发布版本
              </button>
              <small>本机保存仅限当前浏览器，建议定期导出备份。</small>
            </div>
          </el-popover>
          <input
            ref="importInput"
            aria-label="导入项目文件"
            class="project-file-input"
            type="file"
            accept=".json,application/json"
            :disabled="busy"
            @change="importProject"
          />
          <el-button
            size="small"
            :icon="DocumentChecked"
            :loading="saving"
            :disabled="loading || loadBlocked"
            @click="save"
            >保存到本机</el-button
          >
          <el-button
            size="small"
            :icon="View"
            :disabled="busy"
            @click="publication.preview"
            >预览草稿</el-button
          >
          <el-button
            size="small"
            type="primary"
            :disabled="busy"
            :loading="publishing"
            @click="publish"
            >发布到本机</el-button
          >
        </div> </template
      ><span v-else class="runtime-header-note"
        >本机查看 · 发布快照与草稿独立</span
      >
    </header>
    <template v-if="mode === 'edit'">
      <div v-if="publicationError" role="alert" class="error-banner">
        {{ publicationError }}
      </div>
      <div v-if="error" role="alert" class="error-banner">
        <el-icon><InfoFilled /></el-icon><span>{{ error }}</span
        ><el-button v-if="loadBlocked" size="small" @click="editor.open"
          >重新读取</el-button
        >
      </div>
      <main
        class="editor-layout"
        :style="{ gridTemplateColumns: layoutColumns }"
        v-loading="loading || importing"
      >
        <aside v-show="libraryOpen" class="library-panel">
          <ComponentLibrary
            :disabled="loading || loadBlocked"
            @add="addComponent"
          />
        </aside>
        <aside v-show="layersOpen" class="outline-panel">
          <div class="panel-title">
            图层 <span class="count">{{ doc.elements.length }}</span
            ><el-button
              text
              size="small"
              :disabled="busy"
              aria-label="新建页面"
              :icon="Plus"
              @click="openNewPage"
            />
          </div>
          <PageControls
            :document="doc"
            :disabled="busy"
            @switch="pages.switchPage"
            @rename="pages.rename"
          />
          <LayersPanel
            :document="doc"
            :selected-ids="selectedIds"
            @select="editor.select"
            @toggle="layers.toggle"
            @order="layers.order"
            @group="layers.group"
            @ungroup="layers.ungroup"
            @align="layers.align"
            @distribute="layers.distribute"
            @context="openContextMenu"
          />
        </aside>
        <section class="canvas-workspace" aria-label="编辑工作区">
          <div class="workbench-toolbar" role="toolbar" aria-label="编辑命令">
            <button
              class="tool-icon"
              aria-label="选择工具"
              title="选择 / 移动"
              :aria-pressed="!drawingTool"
              @click="drawingTool = null"
            >
              <el-icon><Pointer /></el-icon>
            </button>
            <button
              v-for="tool in [
                { id: 'straight', name: '直线' },
                { id: 'polyline', name: '折线' },
                { id: 'curve', name: '曲线' },
              ] as const"
              :key="tool.id"
              :aria-label="'绘制' + tool.name"
              :aria-pressed="drawingTool === tool.id"
              @click="drawingTool = tool.id"
            >
              {{ tool.name }}
            </button>
            <button v-if="drawingTool" @click="drawingTool = null">
              取消绘制</button
            ><span class="toolbar-separator"></span>
            <button
              class="tool-icon"
              aria-label="撤销"
              title="撤销 Ctrl+Z"
              :disabled="!canUndo"
              @click="editor.undo"
            >
              <el-icon><Back /></el-icon>
            </button>
            <button
              class="tool-icon"
              aria-label="重做"
              title="重做 Ctrl+Y"
              :disabled="!canRedo"
              @click="editor.redo"
            >
              <el-icon><Right /></el-icon>
            </button>
            <button
              class="tool-icon"
              aria-label="复制"
              title="复制 Ctrl+C"
              :disabled="!selectedIds.length"
              @click="editor.copy"
            >
              <el-icon><CopyDocument /></el-icon>
            </button>
            <button title="粘贴 Ctrl+V" @click="editor.paste">粘贴</button>
            <button
              class="tool-icon"
              aria-label="重复"
              title="重复 Ctrl+D"
              :disabled="!selectedIds.length"
              @click="editor.duplicate"
            >
              <el-icon><Plus /></el-icon>
            </button>
            <button
              class="tool-icon"
              aria-label="全选"
              title="全选 Ctrl+A"
              @click="editor.selectAll"
            >
              <el-icon><FullScreen /></el-icon>
            </button>
            <button
              class="tool-icon"
              aria-label="删除"
              title="删除 Delete"
              :disabled="!selectedIds.length"
              @click="editor.remove"
            >
              <el-icon><Delete /></el-icon>
            </button>
            <span
              class="page-size"
              data-testid="page-size"
              :title="`背景参考尺寸 ${doc.page.width} × ${doc.page.height}`"
              >无限画布</span
            >
          </div>
          <CanvasViewport
            :document="doc"
            :accept-components="!busy && !loadBlocked"
            @add-component="addComponent"
            v-slot="view"
          >
            <div
              class="canvas-sheet"
              :style="{
                width: `${doc.page.width}px`,
                height: `${doc.page.height}px`,
              }"
            >
              <DiagramCanvas
                :view-scale="view.scale"
                :area="view.area"
                :show-grid="view.grid"
                :image-preview="imagePreview"
                :drawing-tool="drawingTool"
                @draw="addLine"
                @cancel-draw="drawingTool = null"
                :document="doc"
                :samples="samples"
                :history="history"
                :selected-id="selectedId"
                :selected-ids="selectedIds"
                @select="editor.select"
                @select-many="editor.selectMany"
                @gesture-start="editor.beginGesture"
                @gesture-end="editor.endGesture"
                @transform="(id, patch) => editor.update(id, patch)"
                @move="editor.move"
                @context="openContextMenu"
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
          </CanvasViewport>
          <EditorContextMenu
            v-if="menuPosition"
            :x="menuPosition.x"
            :y="menuPosition.y"
            :groups="menuGroups"
            @close="contextMenu.close"
          />
          <footer class="canvas-footer">
            <span
              ><i class="status-dot"></i>
              {{
                selectedIds.length > 1
                  ? `已选 ${selectedIds.length} 项`
                  : selected
                    ? `已选择：${selected.name || "未命名图元"}`
                    : "就绪，选择一个图元开始编辑"
              }}</span
            ><span>{{ doc.elements.length }} 个图元</span>
          </footer>
        </section>
        <aside v-show="inspectorOpen" class="properties-panel">
          <div class="inspector-tabs" role="tablist" aria-label="属性面板">
            <button
              v-for="item in inspectorTabs"
              :key="item.id"
              role="tab"
              :id="'tab-' + item.id"
              :aria-controls="'inspector-' + item.id"
              :aria-selected="inspectorTab === item.id"
              @click="inspectorTab = item.id"
            >
              {{ item.name }}
            </button>
          </div>
          <div class="inspector-scroll">
            <section
              v-show="inspectorTab === 'appearance'"
              role="tabpanel"
              id="inspector-appearance"
              aria-labelledby="tab-appearance"
            >
              <template v-if="selected">
                <p v-if="!editor.canEdit(selected.id)" role="status">
                  图元或组合成员已锁定，请在图层列表解锁后编辑。
                </p>
                <div class="selection-heading">
                  <span class="selection-icon"
                    ><el-icon
                      ><Cpu v-if="selected.kind === 'device'" /><EditPen
                        v-else /></el-icon
                  ></span>
                  <div>
                    <strong>{{
                      {
                        line: "自由线条",
                        device: "设备图元",
                        text: "文字图元",
                        metric: "指标图元",
                        chart: "趋势图元",
                      }[selected.kind]
                    }}</strong
                    ><small>修改后即时应用到画布</small>
                  </div>
                </div>
                <el-form
                  label-position="top"
                  class="property-form"
                  @submit.prevent
                >
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
                        :precision="0"
                        controls-position="right"
                        @update:model-value="changePosition('x', $event)"
                    /></el-form-item>
                    <el-form-item label="Y 坐标" for="position-y"
                      ><el-input-number
                        id="position-y"
                        :model-value="selected.y"
                        :precision="0"
                        controls-position="right"
                        @update:model-value="changePosition('y', $event)"
                    /></el-form-item>
                  </div>
                  <p class="field-hint">
                    相对原点的位置，支持负坐标，单位为 px
                  </p>
                  <div class="position-grid">
                    <el-form-item
                      v-for="field in ['width', 'height', 'rotation'] as const"
                      :key="field"
                      :label="
                        { width: '宽度', height: '高度', rotation: '旋转角度' }[
                          field
                        ]
                      "
                      :for="field"
                      ><el-input-number
                        :id="field"
                        :model-value="selected[field] || 0"
                        :min="field === 'rotation' ? 0 : 20"
                        :max="field === 'rotation' ? 359 : undefined"
                        @update:model-value="changePosition(field, $event)"
                    /></el-form-item>
                  </div>
                  <div class="property-section-title separated">外观</div>
                  <el-form-item
                    label="基础颜色"
                    for="base-color"
                    :error="
                      isColor(colorInput) ? '' : '请输入完整的六位十六进制颜色'
                    "
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
                  <FlowPanel
                    :selected="selected"
                    @update="editor.update(selected.id, $event)"
                  />
                  <LineProperties
                    :selected="selected"
                    @update="editor.update(selected.id, $event)"
                  />
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
                  <dt>背景参考尺寸</dt>
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
              <StatesPanel
                :selected="selected"
                :assets="doc.assets"
                :preview="imagePreview"
                @upload="uploadState"
                @default="
                  (id, defaultImageId) => editor.update(id, { defaultImageId })
                "
                @preview="imagePreview = $event"
              />
            </section>
            <section
              v-show="inspectorTab === 'data'"
              role="tabpanel"
              id="inspector-data"
              aria-labelledby="tab-data"
            >
              <DataPanel
                @range="
                  (id, historyMinutes) => editor.update(id, { historyMinutes })
                "
                :selected="selected"
                @bind="(id, binding) => editor.update(id, { binding })"
              />
            </section>
            <section
              v-show="inspectorTab === 'rules'"
              role="tabpanel"
              id="inspector-rules"
              aria-labelledby="tab-rules"
            >
              <RulesPanel
                :assets="doc.assets"
                :selected="selected"
                @change="(id, rules) => editor.update(id, { rules })"
              />
              <InteractionPanel
                :document="doc"
                :selected="selected"
                @change="
                  (id, interaction) => editor.update(id, { interaction })
                "
              />
              <el-button
                class="open-data-debug"
                size="small"
                @click="inspectorTab = 'data'"
                >调试模拟数据</el-button
              >
            </section>
            <section
              v-show="inspectorTab === 'page'"
              role="tabpanel"
              id="inspector-page"
              aria-labelledby="tab-page"
            >
              <div class="page-summary">
                <strong>{{ doc.name }}</strong
                ><span
                  >背景 {{ doc.page.width }} × {{ doc.page.height }} px ·
                  {{ doc.elements.length }} 个图元</span
                >
              </div>
              <BackgroundPanel
                :document="doc"
                :disabled="busy || loadBlocked"
                @change="
                  (background, asset) =>
                    editor.mutate(() => {
                      if (asset) {
                        doc.assets ||= {};
                        doc.assets[asset.id] = asset;
                      }
                      doc.page.background = background;
                    })
                "
              />
            </section>
          </div>
          <div class="property-footer">
            <el-icon><DocumentChecked /></el-icon>{{ lastSaved }}
          </div>
        </aside>
      </main>
    </template>
    <RuntimeView
      v-if="runtime && mode !== 'edit'"
      :document="runtime"
      :mode="mode"
      @exit="publication.exit"
    />
    <el-dialog
      v-model="newPageVisible"
      title="新建组态页面"
      width="440px"
      :close-on-click-modal="false"
    >
      <p class="dialog-intro">
        设置页面名称和背景参考尺寸，绘图区域不受尺寸限制。
      </p>
      <el-form label-position="top" @submit.prevent="createPage">
        <el-form-item label="页面名称" for="new-page-name"
          ><el-input
            id="new-page-name"
            v-model="newPage.name"
            maxlength="60"
            autofocus
        /></el-form-item>
        <div class="position-grid">
          <el-form-item label="背景宽度" for="new-page-width"
            ><el-input-number
              id="new-page-width"
              v-model="newPage.width"
              :min="400"
              :max="3840"
              :precision="0"
              controls-position="right" /></el-form-item
          ><el-form-item label="背景高度" for="new-page-height"
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
          宽度 400–3840 px，高度 300–2160
          px。仅用于背景图片铺放；图元可绘制在任意位置。
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
