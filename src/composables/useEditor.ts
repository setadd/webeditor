import { computed, ref } from "vue";
import {
  createDocument,
  createElement,
  type DiagramElement,
  type ElementKind,
} from "../domain/document";
import { loadDocument, saveDocument } from "../storage/localDocument";

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "本机存储空间不足。画布内容已保留，请释放空间后重试。";
  }
  return error instanceof Error
    ? error.message
    : "本机存储暂时不可用，请重试。";
}

export function useEditor() {
  const document = ref(createDocument());
  const selectedId = ref<string | null>(null);
  const loading = ref(true);
  const saving = ref(false);
  const error = ref("");
  const loadBlocked = ref(false);
  const revision = ref(0);
  const savedRevision = ref(-1);
  const dirty = computed(() => revision.value !== savedRevision.value);
  const selected = computed(() =>
    document.value.elements.find((item) => item.id === selectedId.value),
  );
  const saveState = computed(() =>
    saving.value ? "正在保存" : dirty.value ? "未保存" : "已保存",
  );

  async function open() {
    loading.value = true;
    error.value = "";
    try {
      const stored = await loadDocument();
      document.value = stored || createDocument();
      selectedId.value = null;
      revision.value = 0;
      savedRevision.value = stored ? 0 : -1;
      loadBlocked.value = false;
    } catch (reason) {
      error.value = describeError(reason);
      loadBlocked.value = true;
    } finally {
      loading.value = false;
    }
  }

  function create(name: string, width: number, height: number) {
    document.value = createDocument(name, width, height);
    selectedId.value = null;
    revision.value = 0;
    savedRevision.value = -1;
    error.value = "";
    loadBlocked.value = false;
  }

  function add(kind: ElementKind) {
    const item = createElement(kind, document.value);
    document.value.elements.push(item);
    selectedId.value = item.id;
    revision.value++;
  }

  function update(
    id: string,
    patch: Partial<Omit<DiagramElement, "id" | "kind">>,
  ) {
    const item = document.value.elements.find((entry) => entry.id === id);
    if (!item) return;
    const next = { ...item, ...patch };
    next.x = Math.max(
      0,
      Math.min(document.value.page.width - item.width, Math.round(next.x)),
    );
    next.y = Math.max(
      0,
      Math.min(document.value.page.height - item.height, Math.round(next.y)),
    );
    if (JSON.stringify(next) === JSON.stringify(item)) return;
    Object.assign(item, next);
    revision.value++;
  }

  async function save(): Promise<boolean> {
    if (saving.value || loading.value || loadBlocked.value) return false;
    saving.value = true;
    error.value = "";
    const snapshot = JSON.parse(JSON.stringify(document.value));
    snapshot.savedAt = new Date().toISOString();
    const savingRevision = revision.value;
    try {
      await saveDocument(snapshot);
      document.value.savedAt = snapshot.savedAt;
      savedRevision.value = savingRevision;
      return true;
    } catch (reason) {
      error.value = "保存失败：" + describeError(reason);
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    document,
    selectedId,
    selected,
    loading,
    saving,
    error,
    dirty,
    loadBlocked,
    saveState,
    open,
    create,
    add,
    update,
    save,
  };
}
