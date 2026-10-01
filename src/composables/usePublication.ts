import { ref, type Ref } from "vue";
import { parseDocument, type DiagramDocument } from "../domain/document";
import { loadDocument, saveDocument } from "../storage/localDocument";
const PUBLISHED = "published-project";
const clone = (doc: DiagramDocument): DiagramDocument =>
  parseDocument(JSON.parse(JSON.stringify(doc)));

export function usePublication(draft: Ref<DiagramDocument>) {
  const mode = ref<"edit" | "preview" | "published">("edit");
  const runtime = ref<DiagramDocument | null>(null);
  const publishing = ref(false);
  const publicationError = ref("");
  function preview() {
    publicationError.value = "";
    try {
      runtime.value = clone(draft.value);
      mode.value = "preview";
    } catch (reason) {
      publicationError.value = `预览失败：${reason instanceof Error ? reason.message : "文档无效"}`;
    }
  }
  async function publish() {
    if (publishing.value) return false;
    publishing.value = true;
    publicationError.value = "";
    try {
      const snapshot = clone(draft.value);
      snapshot.savedAt = new Date().toISOString();
      await saveDocument(snapshot, PUBLISHED);
      return true;
    } catch (reason) {
      publicationError.value = `发布失败：${reason instanceof Error ? reason.message : "本机存储不可用"}。草稿和上次发布版本已保留。`;
      return false;
    } finally {
      publishing.value = false;
    }
  }
  async function openPublished() {
    publicationError.value = "";
    try {
      const snapshot = await loadDocument(PUBLISHED);
      if (!snapshot) throw new Error("尚无本机发布版本，请先发布");
      runtime.value = snapshot;
      mode.value = "published";
      history.replaceState(null, "", "#published");
    } catch (reason) {
      publicationError.value =
        reason instanceof Error ? reason.message : "无法打开发布版本";
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  function exit() {
    mode.value = "edit";
    runtime.value = null;
    history.replaceState(null, "", location.pathname + location.search);
  }
  return {
    mode,
    runtime,
    publishing,
    publicationError,
    preview,
    publish,
    openPublished,
    exit,
  };
}
