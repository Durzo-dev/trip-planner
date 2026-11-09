/**
 * Line icons drawn in the text colour (currentColor), so they follow the theme and the button's state.
 */
const chevron = (points: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="${points}"/></svg>`;

export const CHEVRON_BACK = chevron("15 5 8 12 15 19");
export const CHEVRON_FORWARD = chevron("9 5 16 12 9 19");
