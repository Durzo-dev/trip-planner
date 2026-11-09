# Design system

> 🇬🇧 [English version](../en/design-system.md)

## Rôle

Garder toutes les pages cohérentes : un seul jeu de couleurs, de tailles de texte, d'espacements, de
rayons et d'ombres, et un seul jeu de composants partagés (boutons, pastilles, champs…). Les pages ne
font que leur mise en page.

## Fichiers

| Fichier | Contenu |
|---|---|
| `src/styles/tokens.css` | Les jetons : le **seul** endroit où s'écrivent couleurs, tailles de texte, rayons et ombres en valeur brute |
| `src/styles/components.css` | Règles de base et composants partagés, construits avec les jetons |
| `src/styles.css`, `src/admin/admin.css` | Mise en page et éléments propres au planning et à l'administration |
| `src/theme.ts` | Recalcule les couleurs du thème (accent, bandeau, surfaces…) à partir des trois couleurs d'une sortie, en clair et en sombre |
| `design-system.html`, `src/dev/designSystem.ts` | Page de référence (développement seulement) : chaque jeton et composant, dessiné avec les vraies feuilles de style |
| `src/styles/designSystem.test.ts` | Les gardes (voir plus bas) |

## Jetons

| Famille | Variables | Usage |
|---|---|---|
| Tailles de texte | `--text-2xs` (10) … `--text-3xl` (24), `--text-title`, `--text-date` | Chaque `font-size` |
| Graisses | `--weight-light` … `--weight-bold` | Chaque `font-weight` |
| Espacements | `--space-1` (4) … `--space-8` (32) | Écarts et marges internes des composants |
| Rayons | `--radius-xs` (4) … `--radius-xl` (14), `--radius-pill`, `--radius-round` | Chaque `border-radius` |
| Ombres | `--shadow-sm`, `--shadow-pop`, `--shadow-bar`, `--shadow-dialog`, `--backdrop` | Élévation |
| Couleurs fixes | `--white`, `--danger`, `--highlight`, `--sky-*`, `--face-*`… | Identiques pour toutes les sorties |
| Couleurs du thème | `--accent`, `--accent-ink`, `--bg`, `--surface`, `--fg`, `--muted`, `--line`, `--tint`, `--banner-*`… | Suivent les couleurs de la sortie ; les valeurs de `tokens.css` sont des valeurs de secours |

Mode sombre : les couleurs fixes qui en ont besoin (`--danger*`) sont redéfinies dans les blocs sombres
de `tokens.css` ; les couleurs du thème sont recalculées par `theme.ts`.

## Composants

`components.css` documente chacun dans un commentaire au-dessus de ses règles : `.btn` (`.add`,
`.edit`, `.danger`, `[data-armed]`, `.fill`, `.small`), `.link-btn`, `.chip` (`.live`), infobulles (`.tip`, `.who`),
`.panel`, formulaire (`.form`, `.row`, `.field` avec `.narrow` / `.tiny`, `.hint`), `.seg`,
`dialog.dialog`, `.msg` (`.bad`), `.tag` (`.all`, `.now`, `.vote`, `.tie`), `.arrow-btn` (`.lg`), `.settings-btn`, `.error`.

### Couleur des boutons

La couleur d'un bouton dit ce qu'il fait, sur toutes les pages :

| Action | Classe | Couleur |
|---|---|---|
| Naviguer (ouvrir, revenir, aller à) | `.btn`, `.link-btn` | Accent |
| Ajouter ou valider (ajouter, créer, enregistrer, terminer, envoyer) | `.btn.add` | Vert (`--success`) |
| Modifier (modifier, appliquer un changement) | `.btn.edit` | Jaune (`--edit`) |
| Supprimer ou abandonner | `.btn.danger` | Rouge (`--danger`) |

`.fill` signale l'action principale d'un groupe, dans sa couleur.

## Étendre

- **Une nouvelle valeur** (une taille, une couleur) : ajouter un jeton dans `tokens.css`, dans sa famille,
  avec un commentaire sur son usage ; pour une couleur qui doit changer en sombre, aussi dans les deux
  blocs sombres.
- **Un nouveau composant utilisé par plus d'une page** : l'ajouter à `components.css` avec un commentaire
  qui liste ses variantes, puis le montrer sur la page de référence (`src/dev/designSystem.ts`).
- **Un élément propre à une page** : dans la feuille de style de cette page, avec les jetons.
- Couleur posée depuis le code (un `style` en ligne, un SVG) : `var(--jeton)`, jamais une couleur brute.

## Tester

`npm test` lance les gardes :
- aucune couleur brute (`#…`, `rgb()`, `hsl()`) dans une feuille de style autre que `tokens.css`, ni dans
  le code hors de `theme.ts` ;
- aucun `font-size` ni `border-radius` écrit en pixels hors de `tokens.css` ;
- aucun `var(--…)` que rien ne définit (attrape un jeton mal orthographié).

Pour voir le résultat : `npm run dev`, puis
[`/trip-planner/design-system.html`](http://localhost:5173/trip-planner/design-system.html), aussi listée
sur la page d'aperçu.

## Pièges

- Les gardes ignorent `src/dev/` (outils d'aperçu au look neutre volontaire) et les fichiers de test.
- Les espacements ne sont pas gardés : les composants utilisent l'échelle `--space-*`, les mises en page
  peuvent encore employer d'autres valeurs.
- `tokens.css` et `components.css` doivent être importés avant la feuille de la page (voir `src/main.ts`,
  `src/admin/main.ts`).
