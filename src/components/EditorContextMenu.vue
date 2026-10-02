<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
export interface MenuAction {
  label: string;
  run: () => void;
  disabled?: boolean;
  shortcut?: string;
  danger?: boolean;
}
const props = defineProps<{ x: number; y: number; groups: MenuAction[][] }>();
const emit = defineEmits<{ close: [] }>();
const menu = ref<HTMLElement>();
const position = ref({ left: props.x, top: props.y });
const previousFocus = document.activeElement as HTMLElement | null;
async function place() {
  await nextTick();
  if (!menu.value) return;
  const rect = menu.value.getBoundingClientRect();
  position.value = {
    left: Math.max(8, Math.min(props.x, window.innerWidth - rect.width - 8)),
    top: Math.max(8, Math.min(props.y, window.innerHeight - rect.height - 8)),
  };
  menu.value.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
}
function outside(event: Event) {
  if (!menu.value?.contains(event.target as Node)) emit("close");
}
function key(event: KeyboardEvent) {
  if (event.key === "Escape" || event.key === "Tab") {
    if (event.key === "Escape") event.preventDefault();
    event.stopImmediatePropagation();
    emit("close");
  } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const items = [
      ...menu.value!.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ),
    ];
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length;
    items[index]?.focus();
  } else if (
    event.ctrlKey ||
    event.metaKey ||
    event.key === "Delete" ||
    event.key === "Backspace"
  ) {
    emit("close");
  }
}
function execute(action: MenuAction) {
  if (action.disabled) return;
  action.run();
  emit("close");
}
function close() {
  emit("close");
}
watch(() => [props.x, props.y], place);
onMounted(() => {
  void place();
  window.addEventListener("pointerdown", outside, true);
  window.addEventListener("keydown", key, true);
  window.addEventListener("resize", close);
  window.addEventListener("blur", close);
  window.addEventListener("wheel", outside, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", outside, true);
  window.removeEventListener("keydown", key, true);
  window.removeEventListener("resize", close);
  window.removeEventListener("blur", close);
  window.removeEventListener("wheel", outside, true);
  if (
    menu.value?.contains(document.activeElement) &&
    previousFocus?.isConnected
  )
    previousFocus.focus();
});
</script>
<template>
  <Teleport to="body">
    <div
      ref="menu"
      class="editor-context-menu"
      role="menu"
      aria-label="画布操作"
      :style="{ left: position.left + 'px', top: position.top + 'px' }"
      @contextmenu.prevent
    >
      <template v-for="(group, index) in groups" :key="index">
        <div v-if="index" class="menu-divider" role="separator"></div>
        <button
          v-for="action in group"
          :key="action.label"
          role="menuitem"
          :aria-label="action.label"
          :disabled="action.disabled"
          :class="{ danger: action.danger }"
          @click="execute(action)"
        >
          <span>{{ action.label }}</span
          ><kbd v-if="action.shortcut">{{ action.shortcut }}</kbd>
        </button>
      </template>
    </div>
  </Teleport>
</template>
<style scoped>
.editor-context-menu {
  position: fixed;
  z-index: 4000;
  width: 218px;
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 6px;
  border: 1px solid #46515e;
  border-radius: 8px;
  background: #252c34;
  color: #e0e8f2;
  box-shadow: 0 8px 30px #0005;
}
button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 30px;
  padding: 5px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
button:hover:not(:disabled),
button:focus-visible {
  background: #354b46;
  color: #6ae2c0;
  outline: none;
}
button:disabled {
  opacity: 0.35;
  cursor: default;
}
.danger {
  color: #ff9999;
}
kbd {
  font: inherit;
  color: #93a1b1;
  font-size: 11px;
}
.menu-divider {
  height: 1px;
  background: #3b444f;
  margin: 5px 4px;
}
</style>
