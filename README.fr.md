# Trip Planner

> 🇬🇧 [English version](README.md)

**Version 0.1.0**

**Plannings interactifs pour les sorties entre amis** : une page à partager avec le programme, la météo en direct, le plan du trajet, des sondages sur les activités et l'avancement de la journée.

> Application web statique, construite avec Vite + TypeScript. Les invités ouvrent un lien : rien à installer.

## 🌐 Essayer

[![Essayer la sortie d'exemple](https://img.shields.io/badge/Essayer-Sortie_d'exemple-7B61D9?style=for-the-badge&logo=googlechrome&logoColor=white)](https://durzo-dev.github.io/trip-planner/)

L'exemple s'ouvre avec un bandeau de test sous les onglets : choisir les couleurs, passer en mode clair ou
sombre, masquer les illustrations, basculer sur l'exemple de plusieurs jours, ou simuler la journée pour la
voir se dérouler heure par heure.

---

## ✨ Fonctionnalités

### Programme
- 🗓️ **Onglets sous le bandeau** : Matin / Après-midi / Soirée pour une sortie d'un jour, un onglet par jour pour une sortie plus longue ; quand ils ne tiennent pas, des flèches apparaissent du côté caché, et on peut aussi les faire glisser à la souris ou avec la molette
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
- ⚙️ **Réglages** (engrenage à côté des informations de la sortie) : langue, et apparence (auto, clair, sombre), mémorisées sur l'appareil ; la page change de langue sur place, sans se recharger ; les organisateurs de la sortie y trouvent aussi l'accès à sa page d'administration
- 🌍 **Interface en anglais et en français** : la langue choisie dans les réglages, sinon celle du navigateur (anglais si ce n'est aucune des deux)
- 📱 **Téléphone et ordinateur** : une colonne sur téléphone ; sur ordinateur, la météo et le plan restent fixes pendant que le programme défile

### Page d'administration (`admin.html`)
- 🔐 **Connexion par lien envoyé par e-mail**, sans mot de passe (connexion Google en option)
- 🆕 **Créer une sortie** : titre, premier et dernier jour, fuseau horaire ; chaque jour arrive avec Matin / Après-midi / Soirée
- ✏️ **Ajouter, modifier et supprimer des activités** : horaires, titre, étiquette, description, lieux (un lien Google Maps, celui de « Partager » fonctionne, ou des coordonnées ; quand le lien ne contient pas la position, elle est trouvée à partir de l'adresse) ; chaque activité se range dans le matin, l'après-midi ou la soirée selon son heure de début (midi et 18 h)
- 🗂️ **Un jour à la fois** : une barre défilante des jours pour en choisir un, des flèches de chaque côté pour passer de l'un à l'autre
- 📅 **Changer les dates** : décaler toute la sortie de quelques jours, changer la date d'un jour, ajouter ou retirer un jour ; le rendez-vous suit
- 💾 **Enregistrement sûr** : rien n'est enregistré tant qu'il reste un problème (chacun est listé), et deux organisateurs qui enregistrent en même temps ne s'écrasent pas
- 🛡️ **Accès contrôlé par la base** : seuls les membres voient une sortie enregistrée, seuls ses organisateurs la modifient

---

## 🧭 Écrire une sortie

Une sortie se crée sur la page d'administration (enregistrée dans Supabase), ou s'écrit dans un fichier, `public/trips/<id>.json` ; les deux s'ouvrent avec `?trip=<id>`. Il suit
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

### Connecter le serveur des sorties (Supabase)
Les fichiers de sortie s'en passent ; la page d'administration et les sorties enregistrées en ont besoin.
1. Créer un projet gratuit sur [Supabase](https://supabase.com)
2. Dans son **SQL Editor**, exécuter les fichiers de `supabase/migrations/` dans l'ordre
3. Copier `.env.example` en `.env.local` et y mettre l'URL du projet et la clé **anon** (Project Settings → API) ; jamais la clé `service_role`
4. Dans **Authentication → URL Configuration**, ajouter `http://localhost:5173/**` aux adresses de redirection
5. Pour le site publié, ajouter les mêmes valeurs en variables du dépôt `SUPABASE_URL` et `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions → Variables)

### Voir tous les écrans
Avec `npm run dev` lancé, ouvrir [`/trip-planner/preview.html`](http://localhost:5173/trip-planner/preview.html) :
tous les écrans du planning et de l'administration, avec des données d'exemple, côte à côte en taille ordinateur
et téléphone, dans la langue et le mode choisis. Les écrans d'administration utilisent une doublure de Supabase
en mémoire (`?mock` dans l'adresse) : aucun compte n'est nécessaire. Cette page et la doublure n'existent qu'en
développement.

### Design system
Couleurs, tailles de texte, espacements, rayons et ombres sont des jetons dans `src/styles/tokens.css` ;
les composants partagés (boutons, pastilles, champs, fenêtre…) sont dans `src/styles/components.css`.
Les tests refusent les valeurs brutes ailleurs.
Page de référence : [`/trip-planner/design-system.html`](http://localhost:5173/trip-planner/design-system.html).
Détails : [docs/fr/design-system.md](docs/fr/design-system.md).

### Hooks git
```bash
npm run setup-hooks
```
Installe un hook de pre-commit qui lance la vérification de types et les tests avant chaque commit
(contourner : `git commit --no-verify`).

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
[Vitest](https://vitest.dev) couvre l'horloge du jour de sortie, les résultats des sondages, la résolution des activités et les modifications de l'admin ; les règles d'accès de la base sont testées sur les vraies migrations dans un Postgres embarqué ([PGlite](https://pglite.dev)).

---

## 🗂️ Structure du projet

```
trip-planner/
├── public/trips/           # Fichiers des sorties, un JSON par sortie
├── schema/                 # Schéma JSON d'une sortie
├── supabase/migrations/    # Tables et règles d'accès de la base (sécurité par ligne), avec leurs tests
├── tools/                  # Installation du hook git
├── docs/en, docs/fr/       # Notes de contributeur, un dossier par langue (design system)
├── src/
│   ├── main.ts             # Point d'entrée : charge la sortie, assemble la page
│   ├── db.ts               # Accès à Supabase (sorties enregistrées, connexion)
│   ├── dataSource.ts       # Supabase, ou la doublure de développement avec ?mock
│   ├── dev/                # Développement seulement : page d'aperçu des écrans et doublure de Supabase
│   ├── admin/              # Page d'administration : fonctions de modification pures et la page elle-même
│   ├── types.ts            # Modèle de données
│   ├── plan.ts             # Résultats des sondages, activités résolues, étapes du plan, itinéraires
│   ├── time.ts             # Horloge du jour de sortie (une soirée appartient à son jour)
│   ├── weather.ts          # Client Open-Meteo
│   ├── theme.ts            # Couleurs dérivées du thème de la sortie
│   ├── i18n.ts             # Langue de l'interface
│   ├── locales/            # Textes de l'interface, un fichier par langue
│   ├── styles/             # Design system : jetons et composants partagés
│   └── ui/                 # Bandeau, onglets, plan, programme et météo
├── admin.html              # Page d'administration
├── preview.html            # Aperçu des écrans (développement seulement)
├── design-system.html      # Référence du design system (développement seulement)
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
| [Supabase](https://supabase.com) | Base de données, connexion et règles d'accès des sorties enregistrées |
| [Nominatim](https://nominatim.org) (OpenStreetMap) | Position d'un lieu à partir de son adresse, quand son lien ne la contient pas ; l'adresse est envoyée à OpenStreetMap |
| GitHub Pages | Hébergement |

Pas de framework front-end.

---

## ☕ Soutenir le projet

Si ce projet vous est utile et que vous souhaitez me remercier, un petit don est toujours apprécié !

[![Faire un don via PayPal](https://img.shields.io/badge/Faire_un_don-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.me/valentinP34)

---

## 📄 Licence

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

Vous pouvez librement utiliser, modifier et redistribuer ce projet, **à condition de** :
- Créditer l'auteur original
- Ne pas en faire un usage commercial
- Redistribuer les versions modifiées sous la même licence

🔗 [Lire la licence complète](https://creativecommons.org/licenses/by-nc-sa/4.0/)

---

## 👤 Auteur

**Durzo**, [@Durzo-dev](https://github.com/Durzo-dev)
