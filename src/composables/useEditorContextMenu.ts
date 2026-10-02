import { computed, ref } from "vue";
import type { useEditor } from "./useEditor";
import type { useLayers } from "./useLayers";
import type { MenuAction } from "../components/EditorContextMenu.vue";

export function useEditorContextMenu(
  editor: ReturnType<typeof useEditor>,
  layers: ReturnType<typeof useLayers>,
) {
  const position = ref<{
    x: number;
    y: number;
    point?: { x: number; y: number };
  }>();
  function open(
    event: MouseEvent,
    id: string | null,
    point?: { x: number; y: number },
  ) {
    editor.endGesture();
    if (!id || !editor.selectedIds.value.includes(id)) editor.select(id);
    position.value = { x: event.clientX, y: event.clientY, point };
  }
  function close() {
    position.value = undefined;
  }
  const groups = computed<MenuAction[][]>(() => {
    const items = editor.document.value.elements.filter((e) =>
      editor.selectedIds.value.includes(e.id),
    );
    const editable =
      items.length > 0 && items.every((e) => editor.canEdit(e.id));
    const result: MenuAction[][] = [
      [
        {
          label: "撤销",
          shortcut: "Ctrl+Z",
          disabled: !editor.canUndo.value,
          run: editor.undo,
        },
        {
          label: "重做",
          shortcut: "Ctrl+Y",
          disabled: !editor.canRedo.value,
          run: editor.redo,
        },
      ],
      [
        {
          label: "复制",
          shortcut: "Ctrl+C",
          disabled: !items.length,
          run: editor.copy,
        },
        {
          label: "粘贴",
          shortcut: "Ctrl+V",
          disabled: !editor.canPaste.value,
          run: () => editor.pasteAt(position.value?.point),
        },
        {
          label: "重复",
          shortcut: "Ctrl+D",
          disabled: !items.length,
          run: editor.duplicate,
        },
        {
          label: "删除",
          shortcut: "Delete",
          disabled: !editable,
          danger: true,
          run: editor.remove,
        },
      ],
    ];
    if (items.length) {
      result.push(
        [
          ...Object.entries({
            top: "置顶",
            bottom: "置底",
            up: "上移一层",
            down: "下移一层",
          }).map(([direction, label]) => ({
            label,
            disabled: !editable,
            run: () => layers.order(direction),
          })),
        ],
        [
          {
            label: "组合",
            disabled: !editable || items.length < 2,
            run: layers.group,
          },
          {
            label: "取消组合",
            disabled: !editable || !items.some((e) => e.groupId),
            run: layers.ungroup,
          },
          {
            label: items.some((e) => e.locked) ? "解锁" : "锁定",
            run: layers.toggleSelectedLock,
          },
          {
            label: items.every((e) => e.visible === false) ? "显示" : "隐藏",
            disabled: !editable,
            run: layers.toggleSelectedVisibility,
          },
        ],
      );
      if (items.length > 1)
        result.push([
          ...Object.entries({
            left: "左对齐",
            right: "右对齐",
            top: "顶对齐",
            bottom: "底对齐",
            centerX: "水平居中",
            centerY: "垂直居中",
          }).map(([direction, label]) => ({
            label,
            disabled: !editable,
            run: () => layers.align(direction),
          })),
          {
            label: "水平等距",
            disabled: !editable || items.length < 3,
            run: () => layers.distribute("x"),
          },
          {
            label: "垂直等距",
            disabled: !editable || items.length < 3,
            run: () => layers.distribute("y"),
          },
        ]);
    }
    result.push([
      {
        label: "全选",
        shortcut: "Ctrl+A",
        disabled: !editor.document.value.elements.length,
        run: editor.selectAll,
      },
    ]);
    return result;
  });
  return { position, groups, open, close };
}
