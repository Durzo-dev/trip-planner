/**
 * Lets a horizontally scrolling strip (the day tabs) be scrolled with the mouse: drag it, turn the
 * wheel over it, or use the arrows shown at an end that has more to see. Touch screens already scroll it
 * natively. A drag never counts as a click on a tab.
 */

/** Pixels the pointer must travel before a press becomes a drag (below it, it stays a click). */
export const DRAG_THRESHOLD = 5;

/** Scroll position while dragging: content follows the pointer, clamped to what can scroll. */
export function dragScrollLeft(startLeft: number, startX: number, x: number, maxLeft: number): number {
  return Math.max(0, Math.min(maxLeft, startLeft - (x - startX)));
}

/** Which arrows to show: one at each end that still has hidden content (1 px of slack for rounding). */
export function arrowState(scrollLeft: number, clientWidth: number, scrollWidth: number): { back: boolean; forward: boolean } {
  return { back: scrollLeft > 1, forward: scrollLeft + clientWidth < scrollWidth - 1 };
}

/** Arrow buttons around the strip; a click scrolls by most of its visible width. */
/** `item` picks the strip's entries; `signal` removes every listener and observer when the strip is redrawn. */
export function enableScrollArrows(el: HTMLElement, back: HTMLButtonElement, forward: HTMLButtonElement, item = ".tab", signal?: AbortSignal): void {
  // Measured to the last tab, not scrollWidth: the spacer that lets today reach the left edge is not content
  const contentEnd = () => {
    const tabs = el.querySelectorAll<HTMLElement>(item);
    const last = tabs[tabs.length - 1];
    return last ? el.scrollLeft + last.getBoundingClientRect().right - el.getBoundingClientRect().left : el.scrollWidth;
  };
  const update = () => {
    const s = arrowState(el.scrollLeft, el.clientWidth, contentEnd());
    back.hidden = !s.back;
    forward.hidden = !s.forward;
  };
  const step = (dir: number) => el.scrollBy({ left: dir * Math.max(80, el.clientWidth * 0.7), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  back.addEventListener("click", () => step(-1), { signal });
  forward.addEventListener("click", () => step(1), { signal });
  el.addEventListener("scroll", update, { passive: true, signal });
  observe(new ResizeObserver(update), (o) => o.observe(el), signal);
  observe(new MutationObserver(update), (o) => o.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] }), signal);
  update();
}

export function enableDragScroll(el: HTMLElement, signal?: AbortSignal): void {
  let startX = 0;
  let startLeft = 0;
  let pressed = false;
  let dragged = false;
  const overflows = () => el.scrollWidth > el.clientWidth + 1;

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !overflows()) return;
    pressed = true;
    dragged = false;
    startX = e.clientX;
    startLeft = el.scrollLeft;
  }, { signal });
  window.addEventListener("pointermove", (e) => {
    if (!pressed) return;
    if (!dragged && Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return;
    dragged = true;
    el.classList.add("dragging");
    el.scrollLeft = dragScrollLeft(startLeft, startX, e.clientX, el.scrollWidth - el.clientWidth);
  }, { signal });
  window.addEventListener("pointerup", () => {
    if (!pressed) return;
    pressed = false;
    el.classList.remove("dragging");
  }, { signal });
  // The click that ends a drag must not select the tab under the pointer
  el.addEventListener("click", (e) => {
    if (!dragged) return;
    dragged = false;
    e.stopPropagation();
    e.preventDefault();
  }, { capture: true, signal });
  // A vertical wheel scrolls the strip sideways while the pointer is over it
  el.addEventListener("wheel", (e) => {
    if (!overflows() || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
    if (next === el.scrollLeft) return; // at an end: let the page scroll
    el.scrollLeft = next;
    e.preventDefault();
  }, { passive: false, signal });
  const mark = () => el.classList.toggle("can-drag", overflows());
  observe(new ResizeObserver(mark), (o) => o.observe(el), signal);
  observe(new MutationObserver(mark), (o) => o.observe(el, { childList: true }), signal);
  mark();
}

/** Starts an observer and disconnects it when the signal aborts. */
function observe<O extends { disconnect(): void }>(o: O, start: (o: O) => void, signal?: AbortSignal): void {
  start(o);
  signal?.addEventListener("abort", () => o.disconnect(), { once: true });
}
