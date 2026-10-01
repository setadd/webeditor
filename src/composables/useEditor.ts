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
    clipboard = [];
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
  function members(id: string) {
    const item = document.value.elements.find(e => e.id === id);
    return item?.groupId ? document.value.elements.filter(e => e.groupId === item.groupId) : item ? [item] : [];
  }
  function canEdit(id: string) { return members(id).every(e => !e.locked); }
  function select(id: string | null, additive = false) {
    if (!id) { selectedIds.value=[]; return; }
    const ids = members(id).map(e => e.id);
    selectedIds.value = additive ? selectedIds.value.includes(id) ? selectedIds.value.filter(x=>!ids.includes(x)) : [...new Set([...selectedIds.value,...ids])] : ids;
  }
  function move(id: string, x: number, y: number) {
    const item = document.value.elements.find(e=>e.id===id);
    if(!item || !canEdit(id))return;
    const ids = new Set(selectedIds.value.includes(id) ? selectedIds.value.flatMap(id=>members(id).map(e=>e.id)) : members(id).map(e=>e.id));
    const items = document.value.elements.filter(e=>ids.has(e.id)&&canEdit(e.id));
    let dx=x-item.x,dy=y-item.y;
    dx=Math.max(-Math.min(...items.map(e=>e.x)),Math.min(dx,document.value.page.width-Math.max(...items.map(e=>e.x+e.width))));
    dy=Math.max(-Math.min(...items.map(e=>e.y)),Math.min(dy,document.value.page.height-Math.max(...items.map(e=>e.y+e.height))));
    commitMutation(()=>items.forEach(e=>{e.x+=dx;e.y+=dy;}));
  }
  function selectMany(ids: string[]) { selectedIds.value = [...new Set(ids.flatMap(id=>members(id).map(e=>e.id)))]; }
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
  function replaceDraft(value: DiagramDocument) {
    document.value = clone(value);
    document.value.savedAt = null;
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
      if (!item || !canEdit(id)) return;
      if (item.groupId && (patch.x !== undefined || patch.y !== undefined) && patch.width === undefined && patch.height === undefined && patch.line === undefined) {
        const peers=members(id);
        const dx=Math.max(-Math.min(...peers.map(e=>e.x)),Math.min((patch.x??item.x)-item.x,document.value.page.width-Math.max(...peers.map(e=>e.x+e.width))));
        const dy=Math.max(-Math.min(...peers.map(e=>e.y)),Math.min((patch.y??item.y)-item.y,document.value.page.height-Math.max(...peers.map(e=>e.y+e.height))));
        peers.forEach(e=>{e.x+=dx;e.y+=dy;});return;
      }
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
        (e) => !selectedIds.value.includes(e.id) || !canEdit(e.id),
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
    const left=Math.min(...clipboard.map(e=>e.x)),top=Math.min(...clipboard.map(e=>e.y));
    const right=Math.max(...clipboard.map(e=>e.x+e.width)),bottom=Math.max(...clipboard.map(e=>e.y+e.height));
    if(right-left>document.value.page.width || bottom-top>document.value.page.height){error.value="无法粘贴：所选图元整体尺寸超出当前页面，请扩大画布或减少选择。";return;}
    const dx=Math.max(-left,Math.min(24,document.value.page.width-right));
    const dy=Math.max(-top,Math.min(24,document.value.page.height-bottom));
    error.value="";
    const groups = new Map<string,string>();
    for (const item of clipboard) if(item.groupId) groups.set(item.groupId,crypto.randomUUID());
    const items = clipboard.map((e) => ({
      ...clone(e),
      id: crypto.randomUUID(),
      groupId: e.groupId ? groups.get(e.groupId) : undefined,
      x: e.x + dx,
      y: e.y + dy,
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
    replaceDraft,
    add,
    update,
    save,
    select,
    move,
    canEdit,
    selectAll,
    selectMany,
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
