# Trip Planner

> 🇬🇧 [English version](README.md)

**Version 0.1.0**

**Plannings interactifs pour les sorties entre amis** : une page à partager avec le programme, la météo en direct, le plan du trajet, des sondages sur les activités et l'avancement de la journée.

> Application web statique, construite avec Vite + TypeScript. Les invités ouvrent un lien : rien à installer.

## 🌐 Essayer

[![Ouvrir la sortie d'exemple](https://img.shields.io/badge/Ouvrir-Sortie_d'exemple-7B61D9?style=for-the-badge&logo=googlechrome&logoColor=white)](https://durzo-dev.github.io/trip-planner/)
[![Ouvrir l'exemple sur plusieurs jours](https://img.shields.io/badge/Ouvrir-Exemple_sur_plusieurs_jours-4F93E2?style=for-the-badge&logo=googlechrome&logoColor=white)](https://durzo-dev.github.io/trip-planner/?trip=bordeaux-weekend-2026-11)

Ajoutez `&now=2026-11-28T14:45` à l'adresse pour voir la journée se dérouler.

---

## ✨ Fonctionnalités

### Programme
- 🗓️ **Onglets sous le bandeau** : Matin / Après-midi / Soirée pour une sortie d'un jour, un onglet par jour pour une sortie plus longue
- 📍 **Le jour actuel en premier** : sur plusieurs jours, le jour actuel est toujours le premier onglet à gauche ; les jours passés sont plus à gauche, grisés
- ⏱️ **Avancement en direct** : la colonne d'horaire se remplit avec le dégradé du thème, le créneau en cours est signalé, les créneaux terminés se grisent
- 🔗 **Lien Google Maps** pour chaque lieu, et pour chaque alternative

### Plan
- 🗺️ **Étapes dans l'ordre de visite**, numérotées comme le programme ; une étape se grise une fois passée
- 🖱️ **Le plan sert de sommaire** : un clic sur une étape fait défiler le programme jusqu'à elle
- 🚶 **Itinéraire à pied** dans Google Maps pour toute la journée, ou depuis le rendez-vous

### Sondages
- 🗳️ **Qui a voté quoi** : initiales des votants sur chaque option, prénoms au survol
- 🔄 **L'option gagnante prend le créneau** : lieu, texte, adresse et étape du plan suivent l'option la plus votée ; en cas d'égalité, le choix de l'organisateur est gardé
- ♻️ **Sondages liés** : une option peut reprendre le lieu qui a perdu un autre sondage (un 2e escape game, par exemple)

### Bandeau
- ⏳ **Compte à rebours** jusqu'à la sortie
- 👥 **Participants** : la liste s'affiche au survol
- 🤝 **Heure de rendez-vous** : le survol met l'activité en surbrillance, le clic y fait défiler

### Page
- 🌤️ **Météo en direct** via [Open-Meteo](https://open-meteo.com), à partir de 16 jours avant la date
- 🎨 **Thème à partir de trois couleurs** (début et fin du dégradé, accent), avec **modes clair et sombre**
- 🌍 **Interface en anglais et en français**, selon la langue du navigateur (anglais sinon)
- 📱 **Téléphone et ordinateur** : une colonne sur téléphone ; sur ordinateur, la météo et le plan restent fixes pendant que le programme défile

---

## 🧭 Écrire une sortie

Chaque sortie est un fichier, `public/trips/<id>.json`, ouvert avec `?trip=<id>`. Il suit
[`schema/trip.schema.json`](schema/trip.schema.json), que les éditeurs comme VS Code vérifient pendant la saisie.
Partez d'un des exemples :

| Fichier | Contenu |
|---|---|
| `bordeaux-2026-11-28.json` | Une journée, avec sondages |
| `bordeaux-weekend-2026-11.json` | Quatre jours |

- Un **item** est un créneau ; `places` liste les lieux visités, dans l'ordre, et chacun devient une étape du plan
- Un **item piloté par un sondage** a `poll` (une clé de `polls`) et `choices` (un par option, dans le même ordre) : le choix gagnant devient l'activité
- **Les heures avant 6 h** appartiennent à la soirée précédente (`"end": "01:30"`)
- `illustration` choisit un dessin au trait de `src/illustrations.ts` ; `photo` affiche une photo en bandeau à la place

---

## 🧑‍💻 Développement

### Prérequis
- [Node.js LTS](https://nodejs.org) (v22 ou supérieur)

### Lancer en développement
```bash
git clone https://github.com/Durzo-dev/trip-planner.git
cd trip-planner
npm install
npm run dev
```

| Paramètre | Exemple | Effet |
|---|---|---|
| `trip` | `?trip=bordeaux-weekend-2026-11` | Charge `public/trips/<trip>.json` (par défaut : `bordeaux-2026-11-28`) |
| `now` | `?now=2026-11-28T14:45` | Simule cette date et cette heure locales, pour voir l'avancement de la journée |

### Compiler
```bash
npm run build
```
Le site apparaît dans le dossier `dist/`, servi sous `/trip-planner/` ; définir `BASE_PATH=/` pour un autre hébergeur.
Chaque push sur `main` est testé, compilé et publié sur GitHub Pages par GitHub Actions.

### Lancer les tests unitaires
```bash
npm test
```
[Vitest](https://vitest.dev) couvre l'horloge du jour de sortie, les résultats des sondages et la résolution des activités.

---

## 🗂️ Structure du projet

```
trip-planner/
├── public/trips/           # Fichiers des sorties, un JSON par sortie
├── schema/                 # Schéma JSON d'une sortie
├── src/
│   ├── main.ts             # Point d'entrée : charge la sortie, assemble la page
│   ├── types.ts            # Modèle de données
│   ├── plan.ts             # Résultats des sondages, activités résolues, étapes du plan, itinéraires
│   ├── time.ts             # Horloge du jour de sortie (une soirée appartient à son jour)
│   ├── weather.ts          # Client Open-Meteo
│   ├── theme.ts            # Couleurs dérivées du thème de la sortie
│   ├── i18n.ts             # Textes de l'interface en anglais et en français
│   └── ui/                 # Bandeau, onglets, plan, programme et météo
├── docs/mockup.html        # La maquette validée dont part le projet
└── .github/workflows/      # Tests, compilation et déploiement GitHub Pages
```

Chaque module s'ouvre sur un commentaire qui dit ce qu'il fait et pourquoi.

---

## 🛠️ Stack technique

| Technologie | Rôle |
|---|---|
| [Vite](https://vite.dev) | Serveur de développement et compilation |
| [TypeScript](https://www.typescriptlang.org) | Modèle de données et interface typés |
| [Open-Meteo](https://open-meteo.com) | Prévisions météo, gratuites, sans clé |
| [Vitest](https://vitest.dev) | Tests unitaires |
| GitHub Pages | Hébergement |

Pas de framework front-end.

---

## ☕ Soutenir le projet

Si ce projet vous est utile et que vous souhaitez me remercier, un petit don est toujours apprécié !

[![Faire un don via PayPal](https://img.shields.io/badge/Faire_un_don-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.me/valentinP34)

---

## 📄 Licence

Aucune licence n'est encore choisie : tous droits réservés d'ici là.

---

## 👤 Auteur

**Valentin**, [@Durzo-dev](https://github.com/Durzo-dev)
