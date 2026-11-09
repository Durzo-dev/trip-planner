# Changelog

> 🇫🇷 [Version française](CHANGELOG.fr.md)

What each version brings, in two parts: **what changes for you**, visible when using the site, and
**under the hood**, the internal work, of interest only if you read the code.

When a version is tagged, `tools/release-notes.mjs` publishes its section on the GitHub release, with the
full list of commits folded under it. A section title must be exactly `## vX.Y.Z`: without one, the
release falls back to the list of commits. Only minor and major versions are released
([docs/en/versioning.md](docs/en/versioning.md)).

---

## v0.2.0

The first release: a shareable trip page, and an admin page to organise trips stored online.

### What changes for you

**The trip page.** The schedule in tabs (parts of the day, or one tab per day, today first), its live
progress, the weather from 16 days before, a map of the stops in visiting order with walking
directions, polls showing who voted for what, a theme from three colours with light and dark modes,
in English and French.

**Activity labels.** A fixed set: meeting point, optional, paid, book ahead. Each day has one meeting
point, announced in the banner. A poll's label says whether you have answered it.

**The admin page.** Sign in with a link sent by e-mail. Create a trip, then edit it one day at a time:
activities with their times, labels and places (a Google Maps link, the Share one works), dates in a
calendar that shows the whole trip.

**Draft, then publish.** Every change is saved as you go into a draft shared by the organisers.
Participants see nothing until "Publish", in the bar at the bottom, which lists what must be fixed
first. A new trip stays hidden from its guests until its first publication.

**Settings.** Language and appearance behind the gear, with the version at the bottom.

### Under the hood

- Trips stored in Supabase; who may read or change what is enforced by the database's row-level
  security, tested against the real migrations.
- A design system (tokens and shared components), held by tests; date and time fields, the calendar
  and tooltips drawn with it.
- Versions: the patch number goes up on every commit, minor and major versions are tagged and released
  with their changelog section.
