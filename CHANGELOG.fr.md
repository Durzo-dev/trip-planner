# Journal des versions

> 🇬🇧 [English version](CHANGELOG.md)

Ce que chaque version apporte, en deux parties : **ce qui change pour vous**, visible en utilisant le
site, et **sous le capot**, le travail interne, qui n'intéresse que si vous lisez le code.

Quand une version reçoit son tag, `tools/release-notes.mjs` publie la section anglaise
([CHANGELOG.md](CHANGELOG.md)) sur la release GitHub, avec la liste complète des commits repliée en
dessous. Un titre de section vaut exactement `## vX.Y.Z`, les mêmes dans les deux langues. Seules les
versions mineures et majeures sont publiées ([docs/fr/versioning.md](docs/fr/versioning.md)).

---

## v0.2.0

La première release : une page de sortie à partager, et une page d'administration pour organiser des
sorties enregistrées en ligne.

### Ce qui change pour vous

**La page de la sortie.** Le programme en onglets (moments de la journée, ou un onglet par jour,
aujourd'hui en premier), sa progression en direct, la météo à partir de 16 jours avant, une carte des
étapes dans l'ordre de visite avec l'itinéraire à pied, des sondages qui montrent qui a voté pour quoi,
un thème à partir de trois couleurs en mode clair et sombre, en anglais et en français.

**Les étiquettes des activités.** Une liste fixe : rendez-vous, optionnelle, payant, à réserver. Chaque
jour a un rendez-vous, annoncé dans le bandeau. L'étiquette d'un sondage dit si vous y avez répondu.

**La page d'administration.** Connexion par un lien envoyé par e-mail. Créer une sortie, puis la
modifier un jour à la fois : les activités avec leurs horaires, étiquettes et lieux (un lien Google
Maps, celui de « Partager » fonctionne), les dates dans un calendrier qui montre toute la sortie.

**Brouillon, puis publication.** Chaque modification est enregistrée au fil de l'eau dans un brouillon
partagé par les organisateurs. Les participants ne voient rien avant « Publier », dans le bandeau du
bas, qui liste ce qu'il faut corriger avant. Une nouvelle sortie reste cachée à ses invités jusqu'à sa
première publication.

**Réglages.** Langue et apparence derrière l'engrenage, avec la version en bas.

### Sous le capot

- Sorties enregistrées dans Supabase ; qui peut lire ou modifier quoi est imposé par la sécurité par
  ligne de la base, testée sur les vraies migrations.
- Un design system (jetons et composants partagés), tenu par des tests ; les champs date et heure, le
  calendrier et les infobulles sont dessinés avec.
- Versions : le numéro de correctif monte à chaque commit, les versions mineures et majeures reçoivent
  un tag et une release avec leur section du journal.
