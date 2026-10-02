import type { DiagramElement } from "./document";

/** Axis-aligned world bounds after each element's rotation. */
export function visualBounds(items: readonly DiagramElement[]) {
  if (!items.length) return null;
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const item of items) {
    const radians = ((item.rotation || 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians)),
      sin = Math.abs(Math.sin(radians));
    const halfWidth = (item.width * cos + item.height * sin) / 2;
    const halfHeight = (item.width * sin + item.height * cos) / 2;
    const x = item.x + item.width / 2,
      y = item.y + item.height / 2;
    left = Math.min(left, x - halfWidth);
    top = Math.min(top, y - halfHeight);
    right = Math.max(right, x + halfWidth);
    bottom = Math.max(bottom, y + halfHeight);
  }
  return { left, top, right, bottom };
}
