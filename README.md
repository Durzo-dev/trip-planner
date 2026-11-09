# Trip Planner

> 🇫🇷 [Version française](README.fr.md)

**Version 0.1.0**

**Interactive trip plans for outings with friends**: a shareable page with the schedule, live weather, a map of the route, polls on activities and the progress of the day.

> Static web app built with Vite + TypeScript. Guests open a link: nothing to install.

## 🌐 Try it

[![Try the example trip](https://img.shields.io/badge/Try_it-Example_trip-7B61D9?style=for-the-badge&logo=googlechrome&logoColor=white)](https://durzo-dev.github.io/trip-planner/)

The example opens with a test bar under the tabs: pick colours, switch between light and dark mode, turn
the illustrations off, switch to the multi-day example, or simulate the day to watch it unfold hour by hour.

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
- 🌍 **English and French interface**: a language picker, remembered on the device; otherwise the browser language (English if it is neither)
- 📱 **Phone and desktop**: one column on phones; on desktop the weather and the map stay put while the schedule scrolls

### Admin page (`admin.html`)
- 🔐 **Sign in with an e-mail link**, no password (Google sign-in optional)
- 🆕 **Create a trip**: title, first and last day, time zone; the days come with Morning / Afternoon / Evening
- ✏️ **Add, edit and delete activities**: times, title, label, description, places (coordinates or a Google Maps link)
- 📅 **Change the dates**: move the whole trip by a number of days, change one day's date, add or remove a day; the meeting point follows
- 💾 **Safe saving**: nothing is saved while something is wrong (each problem is listed), and two organisers saving at once cannot overwrite each other
- 🛡️ **Access enforced by the database**: only members see a stored trip, only its organisers edit it

---

## 🧭 Write a trip

A trip is either created on the admin page (stored in Supabase), or written as one file, `public/trips/<id>.json`; both open with `?trip=<id>`. It follows
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

### Connect the trip server (Supabase)
The trip files work without it; the admin page and stored trips need it.
1. Create a free project on [Supabase](https://supabase.com)
2. In its **SQL Editor**, run the files of `supabase/migrations/` in order
3. Copy `.env.example` to `.env.local` and fill in the project URL and the **anon** key (Project Settings → API); never the `service_role` key
4. In **Authentication → URL Configuration**, add `http://localhost:5173/**` to the redirect URLs
5. For the published site, add the same values as repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions → Variables)

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
[Vitest](https://vitest.dev) covers the trip clock, poll results, how activities resolve and the admin edits; the database's access rules are tested against the real migrations in an embedded Postgres ([PGlite](https://pglite.dev)).

---

## 🗂️ Project structure

```
trip-planner/
├── public/trips/           # Trip files, one JSON per trip
├── schema/                 # JSON schema of a trip
├── supabase/migrations/    # Database tables and access rules (row-level security), with their tests
├── src/
│   ├── main.ts             # Entry point: loads the trip, wires the page
│   ├── db.ts               # Supabase access (stored trips)
│   ├── admin/              # Admin page: pure edit functions and the page itself
│   ├── types.ts            # Data model
│   ├── plan.ts             # Poll results, resolved activities, map stops, directions
│   ├── time.ts             # Trip-day clock (a night out belongs to its evening)
│   ├── weather.ts          # Open-Meteo client
│   ├── theme.ts            # Colour tokens derived from the trip theme
│   ├── i18n.ts             # Interface language
│   ├── locales/            # Interface strings, one file per language
│   └── ui/                 # Header, tabs, map, schedule and weather panels
├── admin.html              # Admin page
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
| [Supabase](https://supabase.com) | Database, sign-in and access rules for stored trips |
| [Vitest](https://vitest.dev) | Unit tests |
| GitHub Pages | Hosting |

No front-end framework.

---

## ☕ Support

If you enjoy this project and want to say thanks, a small donation is always appreciated!

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.me/valentinP34)

---

## 📄 License

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

You are free to use, modify and redistribute this project, provided you:
- Credit the original author
- Do not use it for commercial purposes
- Distribute modified versions under the same license

🔗 [Read the full license](https://creativecommons.org/licenses/by-nc-sa/4.0/)

---

## 👤 Author

**Durzo**, [@Durzo-dev](https://github.com/Durzo-dev)
