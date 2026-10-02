import { componentPreset, type ComponentId } from "../domain/componentCatalog";
export const componentMime = "application/x-webeditor-component";
export function draggedComponent(event: DragEvent): ComponentId | undefined {
  const value = event.dataTransfer?.getData(componentMime);
  return value ? componentPreset(value)?.id : undefined;
}
