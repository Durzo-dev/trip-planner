# Trip planner

[Français](README.fr.md)

Interactive trip plans for outings and holidays with friends, shared with a simple link: guests install nothing.

Each trip is one JSON file. The page renders it: schedule, live weather, a map of the route, polls on activities and the progress of the day.

## Features

- **Schedule** split into parts of the day (one-day trip) or into days (multi-day trip), with tabs under the banner.
  - Multi-day: today is always the first tab on the left; past days sit further left, greyed; future days to the right.
- **Live progress** on the day: the time column fills up with the theme gradient, the current slot is marked, finished slots and map stops turn grey.
- **Map** of the stops in visiting order; clicking a stop scrolls the schedule to it. Google Maps directions for the whole day or from the meeting point.
- **Polls**: who voted for what (hover), and the option with the most votes replaces the activity (venue, text, address, map stop). A tie keeps the organiser's pick.
- **Weather** from [Open-Meteo](https://open-meteo.com) (free, no key), shown from 16 days before the date.
- **Header**: countdown, participants (tooltip), meeting time (hover highlights the activity, click scrolls to it).
- **Theme** built from three colours (gradient start, gradient end, accent), light and dark modes.
- **Interface in English and French**, following the browser language (English otherwise). Trip content is shown as written.

## Getting started

Requires Node.js 22.

```bash
npm install
npm run dev
```

Then open the URL printed by Vite. Useful query parameters:

| Parameter | Example | Effect |
| --- | --- | --- |
| `trip` | `?trip=bordeaux-weekend-2026-11` | Loads `public/trips/<trip>.json` (default: `bordeaux-2026-11-28`) |
| `now` | `?now=2026-11-28T14:45` | Pretends it is that local date and time, to preview the day's progress |

Other scripts: `npm test` (unit tests), `npm run typecheck`, `npm run build`, `npm run preview`.

## Writing a trip

Add `public/trips/<id>.json`, following [`schema/trip.schema.json`](schema/trip.schema.json) (editors such as VS Code validate it through the `$schema` field). The two example trips are a good starting point:

- `bordeaux-2026-11-28.json`: one day, with polls;
- `bordeaux-weekend-2026-11.json`: four days.

Key ideas:

- An **item** is a time slot. `places` lists the places visited, in order; each place becomes a numbered map stop.
- A **poll-driven item** has `poll` (a key of `polls`) and `choices` (one per poll option, same order): the winning choice becomes the activity. `repeatLoserOf` reuses the venue that lost another poll (e.g. a second escape game).
- Times before 06:00 belong to the previous evening (`"end": "01:30"`).
- `illustration` picks one of the line drawings in `src/illustrations.ts`; `photo` shows a picture banner instead.

## Project layout

```
public/trips/      trip files (one JSON per trip)
schema/            JSON schema of a trip
src/
  types.ts         data model
  plan.ts          poll results, resolved activities, map stops, directions
  time.ts          trip-day clock (a night out belongs to its evening)
  weather.ts       Open-Meteo client
  theme.ts         colour tokens derived from the trip theme
  i18n.ts          English and French interface strings
  ui/              header, tabs, map, schedule and weather panels
docs/mockup.html   the validated mock-up this project starts from
```

## Deployment

The GitHub Actions workflow tests and builds every push, then publishes `main` to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**. The site is served from `/trip-planner/`; set `BASE_PATH=/` to build for another host.

## License

No license has been chosen yet: all rights reserved until then.
