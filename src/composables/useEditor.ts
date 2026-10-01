import { computed, ref } from "vue";
import {
  createDocument,
  createElement,
  type DiagramDocument,
  type DiagramElement,
  type ElementKind,
} from "../domain/document";
import { loadDocument, saveDocument } from "../storage/localDocument";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const fingerprint = (doc: DiagramDocument) =>
  JSON.stringify({ ...doc, savedAt: null });
export function useEditor() {
  const document = ref(createDocument());
  const selectedIds = ref<string[]>([]);
  const selectedId = computed({
    get: () => selectedIds.value[0] || null,
    set: (id: string | null) => {
      selectedIds.value = id ? [id] : [];
    },
  });
  const selected = computed(() =>
    document.value.elements.find((e) => e.id === selectedId.value),
  );
  const loading = ref(true),
    saving = ref(false),
    error = ref(""),
    loadBlocked = ref(false);
  const savedContent = ref(fingerprint(document.value));
  const dirty = computed(
    () => fingerprint(document.value) !== savedContent.value,
  );
  const past = ref<DiagramDocument[]>([]),
    future = ref<DiagramDocument[]>([]);
  let gesture: DiagramDocument | null = null;
  let clipboard: DiagramElement[] = [];
  const canUndo = computed(() => past.value.length > 0),
    canRedo = computed(() => future.value.length > 0);
  const saveState = computed(() =>
    saving.value ? "正在保存" : dirty.value ? "未保存" : "已保存",
  );
  function record(before: DiagramDocument) {
    if (fingerprint(before) === fingerprint(document.value)) return;
    past.value.push(before);
    if (past.value.length > 100) past.value.shift();
    future.value = [];
  }
  function commitMutation(fn: () => void) {
    const before = clone(document.value);
    fn();
    if (!gesture) record(before);
  }
  function beginGesture() {
    if (!gesture) gesture = clone(document.value);
  }
  function endGesture() {
    if (gesture) {
      const before = gesture;
      gesture = null;
      record(before);
    }
  }
  function resetHistory() {
    past.value = [];
    future.value = [];
    gesture = null;
    selectedIds.value = [];
  }
  function pruneSelection() {
    selectedIds.value = selectedIds.value.filter((id) =>
      document.value.elements.some((e) => e.id === id),
    );
  }
  function undo() {
    endGesture();
    const previous = past.value.pop();
    if (previous) {
      future.value.push(clone(document.value));
      document.value = previous;
      pruneSelection();
    }
  }
  function redo() {
    const next = future.value.pop();
    if (next) {
      past.value.push(clone(document.value));
      document.value = next;
      pruneSelection();
    }
  }
  function select(id: string | null, additive = false) {
    if (!id) {
      selectedIds.value = [];
      return;
    }
    if (additive) {
      selectedIds.value = selectedIds.value.includes(id)
        ? selectedIds.value.filter((x) => x !== id)
        : [...selectedIds.value, id];
    } else selectedId.value = id;
  }
  function selectAll() {
    selectedIds.value = document.value.elements.map((e) => e.id);
  }
  async function open() {
    loading.value = true;
    error.value = "";
    try {
      document.value = (await loadDocument()) || createDocument();
      savedContent.value = fingerprint(document.value);
      resetHistory();
      loadBlocked.value = false;
    } catch (reason) {
      error.value = String(reason);
      loadBlocked.value = true;
    } finally {
      loading.value = false;
    }
  }
  function create(name: string, width: number, height: number) {
    document.value = createDocument(name, width, height);
    resetHistory();
    savedContent.value = "";
    error.value = "";
    loadBlocked.value = false;
  }
  function add(kind: ElementKind) {
    const item = createElement(kind, document.value);
    commitMutation(() => document.value.elements.push(item));
    selectedId.value = item.id;
  }
  function update(
    id: string,
    patch: Partial<Omit<DiagramElement, "id" | "kind">>,
  ) {
    commitMutation(() => {
      const item = document.value.elements.find((e) => e.id === id);
      if (!item) return;
      const next = { ...item, ...patch };
      next.width = Math.max(
        20,
        Math.min(document.value.page.width, next.width),
      );
      next.height = Math.max(
        20,
        Math.min(document.value.page.height, next.height),
      );
      next.x = Math.max(
        0,
        Math.min(document.value.page.width - next.width, Math.round(next.x)),
      );
      next.y = Math.max(
        0,
        Math.min(document.value.page.height - next.height, Math.round(next.y)),
      );
      Object.assign(item, next);
    });
  }
  function remove() {
    commitMutation(() => {
      document.value.elements = document.value.elements.filter(
        (e) => !selectedIds.value.includes(e.id),
      );
    });
    selectedIds.value = [];
  }
  function copy() {
    clipboard = clone(
      document.value.elements.filter((e) => selectedIds.value.includes(e.id)),
    );
  }
  function paste() {
    if (!clipboard.length) return;
    const items = clipboard.map((e) => ({
      ...clone(e),
      id: crypto.randomUUID(),
      x: Math.min(e.x + 24, document.value.page.width - e.width),
      y: Math.min(e.y + 24, document.value.page.height - e.height),
    }));
    commitMutation(() => document.value.elements.push(...items));
    selectedIds.value = items.map((e) => e.id);
    clipboard = clone(items);
  }
  function duplicate() {
    copy();
    paste();
  }
  async function save() {
    if (saving.value || loading.value || loadBlocked.value) return false;
    saving.value = true;
    error.value = "";
    const snapshot = clone(document.value);
    snapshot.savedAt = new Date().toISOString();
    try {
      await saveDocument(snapshot);
      document.value.savedAt = snapshot.savedAt;
      savedContent.value = fingerprint(snapshot);
      return true;
    } catch (reason) {
      error.value =
        "保存失败：" +
        (reason instanceof Error ? reason.message : "本机存储不可用");
      return false;
    } finally {
      saving.value = false;
    }
  }
  return {
    document,
    selectedIds,
    selectedId,
    selected,
    loading,
    saving,
    error,
    dirty,
    loadBlocked,
    saveState,
    canUndo,
    canRedo,
    open,
    create,
    add,
    update,
    save,
    select,
    selectAll,
    remove,
    copy,
    paste,
    duplicate,
    undo,
    redo,
    commitMutation,
    mutate: commitMutation,
    clearSelection: () => select(null),
    beginGesture,
    endGesture,
  };
}
