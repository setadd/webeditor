import type { Ref } from "vue";
import type { DiagramDocument } from "../domain/document";
export function useLayers(
  document: Ref<DiagramDocument>,
  selection: Ref<string[]>,
  mutate: (fn: () => void) => void,
) {
  const selected = () =>
    document.value.elements.filter((e) => selection.value.includes(e.id));
  const editable = () =>
    selected().length > 0 &&
    selected().every(
      (e) =>
        !e.locked &&
        (!e.groupId ||
          !document.value.elements.some(
            (p) => p.groupId === e.groupId && p.locked,
          )),
    );
  function toggle(id: string, field: "locked" | "visible") {
    mutate(() => {
      const item = document.value.elements.find((e) => e.id === id);
      if (item)
        item[field] =
          field === "locked" ? !item.locked : item.visible === false;
    });
  }
  function order(direction: string) {
    if (!editable()) return;
    mutate(() => {
      const items = document.value.elements;
      const ids = new Set(selection.value);
      if (direction === "top" || direction === "bottom") {
        const chosen = items.filter((e) => ids.has(e.id)),
          others = items.filter((e) => !ids.has(e.id));
        document.value.elements =
          direction === "top" ? [...others, ...chosen] : [...chosen, ...others];
      } else if (direction === "up") {
        for (let i = items.length - 2; i >= 0; i--)
          if (ids.has(items[i]!.id) && !ids.has(items[i + 1]!.id))
            [items[i], items[i + 1]] = [items[i + 1]!, items[i]!];
      } else {
        for (let i = 1; i < items.length; i++)
          if (ids.has(items[i]!.id) && !ids.has(items[i - 1]!.id))
            [items[i], items[i - 1]] = [items[i - 1]!, items[i]!];
      }
    });
  }
  function group() {
    if (!editable() || selected().length < 2) return;
    mutate(() => {
      const id = crypto.randomUUID();
      selected().forEach((e) => (e.groupId = id));
    });
  }
  function ungroup() {
    if (!editable()) return;
    mutate(() => {
      selected().forEach((e) => delete e.groupId);
    });
  }
  function align(action: string) {
    if (!editable() || selected().length < 2) return;
    mutate(() => {
      const items = selected(),
        left = Math.min(...items.map((e) => e.x)),
        right = Math.max(...items.map((e) => e.x + e.width)),
        top = Math.min(...items.map((e) => e.y)),
        bottom = Math.max(...items.map((e) => e.y + e.height));
      for (const e of items) {
        if (action === "left") e.x = left;
        if (action === "right") e.x = right - e.width;
        if (action === "centerX") e.x = (left + right - e.width) / 2;
        if (action === "top") e.y = top;
        if (action === "bottom") e.y = bottom - e.height;
        if (action === "centerY") e.y = (top + bottom - e.height) / 2;
      }
    });
  }
  function distribute(axis: "x" | "y") {
    if (!editable() || selected().length < 3) return;
    mutate(() => {
      const items = selected().sort((a, b) => a[axis] - b[axis]);
      const size = axis === "x" ? "width" : "height";
      const first = items[0]!,
        last = items.at(-1)!;
      const gap =
        (last[axis] +
          last[size] -
          first[axis] -
          items.reduce((sum, e) => sum + e[size], 0)) /
        (items.length - 1);
      let position = first[axis];
      for (const item of items) {
        item[axis] = position;
        position += item[size] + gap;
      }
    });
  }
  return { toggle, order, group, ungroup, align, distribute };
}
