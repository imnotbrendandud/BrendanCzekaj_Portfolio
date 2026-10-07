import type { Active, DroppableContainer, KeyboardCoordinateGetter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Keyboard dragging (Space, arrow keys, Space) that only steps between the
 * places the dragged item can actually land.
 *
 * dnd-kit's sortableKeyboardCoordinates picks the next position from every
 * droppable on the page. When lists nest (a role's bullets and stack chips
 * inside the role, a list block's items inside the block), pressing ↓ on a
 * role steps it onto its own first bullet, which the collision rules then
 * reject, and the role never moves. Handing it only the containers `accepts`
 * allows fixes that. It reads nothing but getEnabled() and get() from the
 * container list, so a scoped view of those two is enough.
 */
export function scopedKeyboardCoordinates(
  accepts: (active: Active, container: DroppableContainer) => boolean,
): KeyboardCoordinateGetter {
  return (event, args) => {
    const { context } = args;
    const active = context.active;
    if (!active) return sortableKeyboardCoordinates(event, args);
    const all = context.droppableContainers;
    const allowed = all.getEnabled().filter((container) => accepts(active, container));
    const scoped = {
      getEnabled: () => allowed,
      get: (id: Parameters<typeof all.get>[0]) => all.get(id),
    } as unknown as typeof all;
    return sortableKeyboardCoordinates(event, {
      ...args,
      context: { ...context, droppableContainers: scoped },
    });
  };
}
