/**
 * Field labels stay on one line (see .field > .lbl in components.css). When one is cut, hovering it
 * scrolls the hidden end into view, back and forth, then stops when the pointer leaves.
 * One listener for the whole page, so labels drawn later need nothing.
 */
const SPEED = 40; // pixels per second

export function enableLabelMarquee(root: Document | HTMLElement = document): void {
  root.addEventListener("mouseover", (e) => {
    const field = (e.target as Element).closest?.(".field");
    const label = field?.querySelector<HTMLElement>(":scope > .lbl");
    if (!label || label.classList.contains("marquee")) return;
    const overflow = label.scrollWidth - label.clientWidth;
    if (overflow <= 1) return;
    label.innerHTML = `<span>${label.innerHTML}</span>`;
    label.style.setProperty("--overflow", `${overflow}px`);
    label.style.setProperty("--marquee-time", `${Math.max(1.2, overflow / SPEED)}s`);
    label.classList.add("marquee");
    field!.addEventListener("mouseleave", () => {
      label.classList.remove("marquee");
      label.innerHTML = label.firstElementChild!.innerHTML;
    }, { once: true });
  });
}
