# Trip Planner

> 🇫🇷 [Version française](README.fr.md)

**Version 0.1.0**

**Interactive trip plans for outings with friends**: a shareable page with the schedule, live weather, a map of the route, polls on activities and the progress of the day.

> Static web app built with Vite + TypeScript. Guests open a link: nothing to install.

## 🌐 Try it

[![Open the example trip](https://img.shields.io/badge/Open-Example_trip-7B61D9?style=for-the-badge&logo=googlechrome&logoColor=white)](https://durzo-dev.github.io/trip-planner/)
[![Open the multi-day example](https://img.shields.io/badge/Open-Multi--day_example-4F93E2?style=for-the-badge&logo=googlechrome&logoColor=white)](https://durzo-dev.github.io/trip-planner/?trip=bordeaux-weekend-2026-11)

Add `&now=2026-11-28T14:45` to the address to see the day as it unfolds.

---

## ✨ Features

### Schedule
- 🗓️ **Tabs under the banner**: Morning / Afternoon / Evening for a one-day trip, one tab per day for a longer one
- 📍 **Today first**: on a multi-day trip, today is always the first tab on the left; past days sit further left, greyed
- ⏱️ **Live progress**: the time column fills up with the theme gradient, the current slot is marked, finished slots turn grey
- 🔗 **Google Maps link** for every place, and for every alternative

### Map
- 🗺️ **Stops in visiting order**, numbered like the schedule; a stop turns grey once visited
- 🖱️ **Map as a table of contents**: clicking a stop scrolls the schedule to it
- 🚶 **Walking directions** in Google Maps for the whole day, or from the meeting point

### Polls
- 🗳️ **Who voted for what**: voters' initials on each option, names on hover
- 🔄 **The winner takes the slot**: venue, text, address and map stop follow the option with the most votes; a tie keeps the organiser's pick
- ♻️ **Linked polls**: an option can reuse the venue that lost another poll (a second escape game, for instance)

### Header
- ⏳ **Countdown** to the trip
- 👥 **Participants**: the list shows on hover
- 🤝 **Meeting time**: hovering it highlights the activity, clicking scrolls to it

### Page
- 🌤️ **Live weather** from [Open-Meteo](https://open-meteo.com), from 16 days before the date
- 🎨 **Theme from three colours** (gradient start, gradient end, accent), with **light and dark modes**
- 🌍 **English and French interface**, following the browser language (English otherwise)
- 📱 **Phone and desktop**: one column on phones; on desktop the weather and the map stay put while the schedule scrolls

---

## 🧭 Write a trip

Each trip is one file, `public/trips/<id>.json`, opened with `?trip=<id>`. It follows
[`schema/trip.schema.json`](schema/trip.schema.json), which editors such as VS Code check as you type.
Start from one of the examples:

| File | Content |
|---|---|
| `bordeaux-2026-11-28.json` | One day, with polls |
| `bordeaux-weekend-2026-11.json` | Four days |

- An **item** is a time slot; `places` lists the places visited, in order, and each one becomes a map stop
- A **poll-driven item** has `poll` (a key of `polls`) and `choices` (one per option, same order): the winning choice becomes the activity
- **Times before 06:00** belong to the previous evening (`"end": "01:30"`)
- `illustration` picks a line drawing from `src/illustrations.ts`; `photo` shows a picture banner instead

---

## 🧑‍💻 Development

### Prerequisites
- [Node.js LTS](https://nodejs.org) (v22 or higher)

### Run in development
```bash
git clone https://github.com/Durzo-dev/trip-planner.git
cd trip-planner
npm install
npm run dev
```

| Parameter | Example | Effect |
|---|---|---|
| `trip` | `?trip=bordeaux-weekend-2026-11` | Loads `public/trips/<trip>.json` (default: `bordeaux-2026-11-28`) |
| `now` | `?now=2026-11-28T14:45` | Pretends it is that local date and time, to preview the day's progress |

### Build
```bash
npm run build
```
The site appears in the `dist/` folder, served from `/trip-planner/`; set `BASE_PATH=/` to build for another host.
Every push to `main` is tested, built and published to GitHub Pages by GitHub Actions.

### Run the unit tests
```bash
npm test
```
[Vitest](https://vitest.dev) covers the trip clock, poll results and how activities resolve.

---

## 🗂️ Project structure

```
trip-planner/
├── public/trips/           # Trip files, one JSON per trip
├── schema/                 # JSON schema of a trip
├── src/
│   ├── main.ts             # Entry point: loads the trip, wires the page
│   ├── types.ts            # Data model
│   ├── plan.ts             # Poll results, resolved activities, map stops, directions
│   ├── time.ts             # Trip-day clock (a night out belongs to its evening)
│   ├── weather.ts          # Open-Meteo client
│   ├── theme.ts            # Colour tokens derived from the trip theme
│   ├── i18n.ts             # English and French interface strings
│   └── ui/                 # Header, tabs, map, schedule and weather panels
├── docs/mockup.html        # The validated mock-up the project starts from
└── .github/workflows/      # Tests, build and GitHub Pages deployment
```

Each module opens with a comment saying what it does and why.

---

## 🛠️ Tech stack

| Technology | Role |
|---|---|
| [Vite](https://vite.dev) | Dev server and build |
| [TypeScript](https://www.typescriptlang.org) | Typed data model and interface |
| [Open-Meteo](https://open-meteo.com) | Weather forecast, free, no key |
| [Vitest](https://vitest.dev) | Unit tests |
| GitHub Pages | Hosting |

No front-end framework.

---

## ☕ Support

If you enjoy this project and want to say thanks, a small donation is always appreciated!

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.me/valentinP34)

---

## 📄 License

No license has been chosen yet: all rights reserved until then.

---

## 👤 Author

**Valentin**, [@Durzo-dev](https://github.com/Durzo-dev)
