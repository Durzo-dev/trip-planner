/**
 * Line icons drawn in the text colour (currentColor), so they follow the theme and the button's state.
 */
const chevron = (points: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="${points}"/></svg>`;

export const CHEVRON_BACK = chevron("15 5 8 12 15 19");
export const CHEVRON_FORWARD = chevron("9 5 16 12 9 19");

export const CALENDAR =
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>`;
