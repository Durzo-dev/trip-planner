# Trip planner

[English](README.md)

Des plannings interactifs pour les sorties et voyages entre amis, partagés par simple lien : les invités n'installent rien.

Chaque sortie est un fichier JSON. La page l'affiche : programme, météo en direct, plan du trajet, sondages sur les activités et avancement de la journée.

## Fonctionnalités

- **Programme** découpé en moments de la journée (sortie d'un jour) ou en jours (sortie sur plusieurs jours), avec des onglets sous le bandeau.
  - Plusieurs jours : le jour actuel est toujours le premier onglet à gauche ; les jours passés sont plus à gauche, grisés ; les jours à venir à droite.
- **Avancement en direct** le jour J : la colonne d'horaire se remplit avec le dégradé du thème, le créneau en cours est signalé, les créneaux terminés et les étapes du plan se grisent.
- **Plan** des étapes dans l'ordre de visite ; un clic sur une étape fait défiler le programme jusqu'à elle. Itinéraires Google Maps pour toute la journée ou depuis le rendez-vous.
- **Sondages** : qui a voté quoi (au survol), et l'option la plus votée remplace l'activité (lieu, texte, adresse, étape du plan). En cas d'égalité, le choix de l'organisateur est gardé.
- **Météo** via [Open-Meteo](https://open-meteo.com) (gratuit, sans clé), affichée à partir de 16 jours avant la date.
- **Bandeau** : compte à rebours, participants (info-bulle), heure de rendez-vous (le survol met l'activité en surbrillance, le clic y fait défiler).
- **Thème** construit à partir de trois couleurs (début et fin du dégradé, accent), modes clair et sombre.
- **Interface en anglais et en français**, selon la langue du navigateur (anglais sinon). Le contenu de la sortie est affiché tel qu'il est écrit.

## Démarrer

Nécessite Node.js 22.

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse indiquée par Vite. Paramètres d'URL utiles :

| Paramètre | Exemple | Effet |
| --- | --- | --- |
| `trip` | `?trip=bordeaux-weekend-2026-11` | Charge `public/trips/<trip>.json` (par défaut : `bordeaux-2026-11-28`) |
| `now` | `?now=2026-11-28T14:45` | Simule cette date et cette heure locales, pour voir l'avancement de la journée |

Autres scripts : `npm test` (tests unitaires), `npm run typecheck`, `npm run build`, `npm run preview`.

## Écrire une sortie

Ajouter `public/trips/<id>.json` en suivant [`schema/trip.schema.json`](schema/trip.schema.json) (les éditeurs comme VS Code le valident grâce au champ `$schema`). Les deux sorties d'exemple sont un bon point de départ :

- `bordeaux-2026-11-28.json` : une journée, avec sondages ;
- `bordeaux-weekend-2026-11.json` : quatre jours.

Principes :

- Un **item** est un créneau. `places` liste les lieux visités, dans l'ordre ; chaque lieu devient une étape numérotée du plan.
- Un **item piloté par un sondage** a `poll` (une clé de `polls`) et `choices` (un par option du sondage, dans le même ordre) : le choix gagnant devient l'activité. `repeatLoserOf` reprend le lieu qui a perdu un autre sondage (par exemple un 2e escape game).
- Les heures avant 6 h appartiennent à la soirée précédente (`"end": "01:30"`).
- `illustration` choisit un des dessins au trait de `src/illustrations.ts` ; `photo` affiche une photo en bandeau à la place.

## Organisation du projet

```
public/trips/      fichiers des sorties (un JSON par sortie)
schema/            schéma JSON d'une sortie
src/
  types.ts         modèle de données
  plan.ts          résultats des sondages, activités résolues, étapes du plan, itinéraires
  time.ts          horloge du jour de sortie (une soirée appartient à son jour)
  weather.ts       client Open-Meteo
  theme.ts         couleurs dérivées du thème de la sortie
  i18n.ts          textes de l'interface en anglais et en français
  ui/              bandeau, onglets, plan, programme et météo
docs/mockup.html   la maquette validée dont part ce projet
```

## Déploiement

Le workflow GitHub Actions teste et compile chaque push, puis publie `main` sur GitHub Pages. Dans les réglages du dépôt, choisir **Pages → Source → GitHub Actions**. Le site est servi sous `/trip-planner/` ; définir `BASE_PATH=/` pour un autre hébergeur.

## Licence

Aucune licence n'est encore choisie : tous droits réservés d'ici là.
