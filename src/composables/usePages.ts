import { type Ref } from "vue";
import {
  createDocument,
  type DiagramDocument,
  type DiagramPageSnapshot,
} from "../domain/document";

export function pageSnapshots(
  document: DiagramDocument,
): DiagramPageSnapshot[] {
  return [
    { name: document.name, page: document.page, elements: document.elements },
    ...(document.otherPages || []),
  ];
}
export function activatePage(document: DiagramDocument, id: string) {
  if (document.page.id === id) return;
  const pages = pageSnapshots(document);
  const target = pages.find((page) => page.page.id === id);
  if (!target) return;
  document.name = target.name;
  document.page = target.page;
  document.elements = target.elements;
  document.otherPages = pages.filter((page) => page.page.id !== id);
}
export function usePages(
  document: Ref<DiagramDocument>,
  mutate: (change: () => void) => void,
) {
  function addPage(name: string, width: number, height: number) {
    mutate(() => {
      const next = createDocument(name, width, height);
      document.value.otherPages = pageSnapshots(document.value);
      document.value.name = next.name;
      document.value.page = next.page;
      document.value.elements = next.elements;
    });
  }
  function switchPage(id: string) {
    if (id !== document.value.page.id)
      mutate(() => activatePage(document.value, id));
  }
  function rename(name: string) {
    if (name.trim() && name.trim() !== document.value.name)
      mutate(() => {
        document.value.name = name.trim();
      });
  }
  return { addPage, switchPage, rename };
}
