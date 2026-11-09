# Versions et releases

*[English version](../en/versioning.md)*

Format `majeure.mineure.correctif`, affiché en bas de la fenêtre des réglages.

## Les trois niveaux

| Niveau | Quand | Comment |
|---|---|---|
| **majeure** | Sur demande explicite | `npm run bump major` |
| **mineure** | Quand une fonctionnalité est validée après l'avoir testée | `npm run bump minor` |
| **correctif** | À chaque commit | Automatique (hook `pre-commit`) |

Une mineure remet le correctif à 0 ; une majeure remet les deux.

## Où vit la version

`package.json` fait référence. La page la lit à la construction : `vite.config.ts` en tire
`__APP_VERSION__`, donc aucun fichier généré n'est nécessaire. `tools/bump-version.mjs` la réécrit avec
les trois fichiers qui la répètent :
- les deux champs `version` racine de `package-lock.json` ;
- la ligne `**Version x.y.z**` de `README.md` et de `README.fr.md`.

`tools/version.test.mjs` leur interdit de diverger.

## Ce qui se passe à chaque commit

```
git commit
   │
   ├─ merge / rebase / cherry-pick ?  →  rien n'est touché
   ├─ vérification de types, puis la suite de tests
   │     └─ échec  →  commit refusé, aucun fichier modifié
   ├─ incrément du correctif, tous les fichiers ensemble
   │     ├─ version déjà changée à la main  →  pas de second incrément
   │     └─ un fichier sans sa version  →  aucune écriture
   ├─ ces fichiers rejoignent le commit
   └─ post-commit : mineure ou majeure changée ?  →  tag vX.Y.Z + rappel de git push --follow-tags
```

Trois ordres comptent :
- **les vérifications avant l'incrément** : un échec ne laisse pas une version incrémentée sans commit ;
- **dans le script, toutes les vérifications avant la moindre écriture** : un README sans sa ligne de
  version ne laisse pas `package.json` incrémenté seul ;
- **le tag en `post-commit`** : au `pre-commit`, le commit qui porte la version n'existe pas encore.

Les décisions (incrémenter ou non, quel tag) sont des fonctions de `tools/bump-version.mjs` que les
hooks appellent, donc testées ; le corps des hooks est écrit par `tools/setup-hooks.mjs`.

## Publier une version

1. Écrire sa section dans `CHANGELOG.md` et `CHANGELOG.fr.md`, titrée exactement `## vX.Y.Z` : « ce
   qui change pour vous », puis « sous le capot ».
2. `npm run bump minor` (ou `major`), puis committer : le hook n'incrémente pas une seconde fois, et le
   `post-commit` pose le tag.
3. `git push --follow-tags`.

Sur un tag `v*`, `.github/workflows/release.yml` publie la release GitHub. Sa note
(`tools/release-notes.mjs`, testé) est la section du tag dans `CHANGELOG.md`, avec les sujets de commit
repliés dessous ; sans section, les sujets depuis le tag précédent. Les deux se terminent par un lien
de comparaison. Le corps des messages de commit n'est jamais publié.

Le site, lui, n'attend pas de release : `deploy.yml` le publie à chaque push sur `main`.

## Commandes

```bash
npm run setup-hooks      # après un clone : git ne versionne pas .git/hooks
npm run bump minor       # ou major ; jamais patch, le hook s'en charge
npm run bump sync        # réécrit les autres fichiers depuis package.json
git push --follow-tags   # git push seul n'envoie pas les tags
```

`git commit --no-verify` saute les vérifications et l'incrément, pour un commit de travail en cours. Le
`post-commit` tourne quand même : un tag est posé si la version a changé.

## Pièges

- **`git commit --amend` incrémente à nouveau** : un hook `pre-commit` ne sait pas distinguer un amend
  de façon fiable. Amender avec `git commit --amend --no-verify`.
- **Les tags ne partent pas seuls** : `git push --follow-tags`, que le `post-commit` rappelle chaque
  fois qu'il en pose un.
- **`fetch-depth: 0` dans `release.yml`** : sans lui, `git describe` ne voit aucun tag antérieur et
  chaque release se dit la première (un test y veille).
- **Pas de section « À paraître » dans le journal** : seul `## vX.Y.Z` est repris ; une section titrée
  autrement ne serait jamais publiée.
