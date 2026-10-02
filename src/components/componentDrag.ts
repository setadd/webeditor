import type { ElementKind } from "../domain/document";
export const componentMime = "application/x-webeditor-component";
export function draggedComponent(event: DragEvent): ElementKind | undefined {
  const value = event.dataTransfer?.getData(componentMime);
  return value === "device" ||
    value === "chart" ||
    value === "metric" ||
    value === "text"
    ? value
    : undefined;
}
