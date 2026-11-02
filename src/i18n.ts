/** UI strings in English and French. The browser language picks French when it starts with "fr", English otherwise.
 *  Trip content (titles, descriptions) is written in the trip file and is not translated. */

export type Lang = "en" | "fr";

export const lang: Lang = (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
export const locale = lang === "fr" ? "fr-FR" : "en-GB";

const en = {
  daysLeft: (n: number) => `In ${n} days`,
  tomorrow: "Tomorrow",
  today: "Today",
  over: "Trip over",
  participants: (n: number) => `${n} participants`,
  participantsTitle: "Participants",
  meetingAt: (t: string) => `Meet at ${t}`,
  example: "EXAMPLE",
  weatherTitle: "Weather",
  weatherTooFar: (d: string) => `The forecast will show up automatically from ${d}.`,
  weatherPast: "No forecast for past days.",
  weatherUnavailable: "Weather is unavailable right now.",
  weatherLoading: "Loading the forecast…",
  rain: "rain",
  sunset: (t: string) => `Sunset at ${t}`,
  routeTitle: "The route",
  routeHint: "Schematic walking map. Click a stop to show it in the schedule.",
  fullRoute: "Full route",
  fromMeeting: "From the meeting point",
  mapsLink: "Maps",
  stopTitle: (n: number) => `Stop ${n} on the map`,
  otherOptions: "Other options",
  now: "NOW",
  groupChoice: (n: number) => `GROUP CHOICE · ${n} ${n > 1 ? "VOTES" : "VOTE"}`,
  tie: "TIE · ORGANISER'S PICK",
  voted: (a: number, b: number) => `${a} / ${b} voted`,
  notVotedYet: (names: string) => `Not voted yet: ${names}.`,
  votesHint: "Hover an option to see who voted. Votes are kept on this device for now.",
  noVotes: "No votes yet",
  votes: (n: number) => `${n} ${n > 1 ? "votes" : "vote"}`,
  you: "You",
  todayBadge: "Today",
  themeDark: "Dark mode",
  themeLight: "Light mode",
  dayTabs: "Trip days",
  demoNote: "Example trip: sample participants and votes, schematic map.",
  colours: "Colours",
  gradient: "Gradient",
  gradientStart: "Gradient start",
  gradientEnd: "Gradient end",
  accent: "Accent",
  illustrations: "Illustrations",
  multiDayDemo: "Multi-day demo",
  simulate: "Simulate the day",
  simDay: "Simulated day",
  simTime: "Simulated time",
  partTabs: "Parts of the day",
  loadError: "This trip could not be loaded.",
  timeFormat: (h: number, m: string) => `${h}:${m}`,
  colon: ":",
};

const fr: typeof en = {
  daysLeft: (n) => `Dans ${n} jours`,
  tomorrow: "C'est demain",
  today: "C'est aujourd'hui",
  over: "Sortie passée",
  participants: (n) => `${n} participants`,
  participantsTitle: "Participants",
  meetingAt: (t) => `Rendez-vous ${t}`,
  example: "EXEMPLE",
  weatherTitle: "Météo",
  weatherTooFar: (d) => `Les prévisions s'afficheront automatiquement à partir du ${d}.`,
  weatherPast: "Pas de prévisions pour les jours passés.",
  weatherUnavailable: "Météo indisponible pour le moment.",
  weatherLoading: "Chargement des prévisions…",
  rain: "pluie",
  sunset: (t) => `Coucher du soleil à ${t}`,
  routeTitle: "Le trajet",
  routeHint: "Plan schématique à pied. Cliquez sur une étape pour l'afficher dans le programme.",
  fullRoute: "Trajet complet",
  fromMeeting: "Depuis le rendez-vous",
  mapsLink: "Maps",
  stopTitle: (n) => `Étape ${n} sur le plan`,
  otherOptions: "Autres options",
  now: "EN COURS",
  groupChoice: (n) => `CHOIX DU GROUPE · ${n} ${n > 1 ? "VOTES" : "VOTE"}`,
  tie: "ÉGALITÉ · CHOIX INITIAL",
  voted: (a, b) => `${a} / ${b} ont voté`,
  notVotedYet: (names) => `Pas encore voté : ${names}.`,
  votesHint: "Survolez une option pour voir qui a voté. Les votes restent sur cet appareil pour l'instant.",
  noVotes: "Aucun vote pour l'instant",
  votes: (n) => `${n} ${n > 1 ? "votes" : "vote"}`,
  you: "Vous",
  todayBadge: "Aujourd'hui",
  themeDark: "Mode sombre",
  themeLight: "Mode clair",
  dayTabs: "Jours de la sortie",
  demoNote: "Sortie d'exemple : participants et votes fictifs, plan schématique.",
  colours: "Couleurs",
  gradient: "Dégradé",
  gradientStart: "Début du dégradé",
  gradientEnd: "Fin du dégradé",
  accent: "Accent",
  illustrations: "Illustrations",
  multiDayDemo: "Démo plusieurs jours",
  simulate: "Simuler le jour J",
  simDay: "Jour simulé",
  simTime: "Heure simulée",
  partTabs: "Moments de la journée",
  loadError: "Impossible de charger cette sortie.",
  timeFormat: (h, m) => `${h} h ${m}`,
  colon: " :",
};

export const t = lang === "fr" ? fr : en;

/** "13:05" → "13 h 05" (fr) / "13:05" (en). */
export function formatTime(hm: string): string {
  const [h, m] = hm.split(":");
  return t.timeFormat(Number(h), m);
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC", ...options });
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
