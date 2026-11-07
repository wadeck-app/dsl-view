# Compilation DSL (dsl-renderer) — artefact pré-compilé + validation anticipée

> **Statut (2026-11-07) : terminé**, sous des noms de fichiers différents de ceux prévus ci-dessous : `src/build/dslCompiler.ts`, `src/registryHash.ts`, `src/compiledDslArtifact.ts` (version de format et types de diagnostics), `src/dslKeys.ts` (`KNOWN_DSL_KEYS`, exporté d'ici et non de `DslRenderer.tsx`), prop `compiled` de `GenericPageRunner`, export `./build/dslCompiler`. Les codes de diagnostic sont passés de 3 à 14. La fonctionnalité est documentée dans `dsl-renderer-consumer-reference.md`. Ce fichier s'appelait `tranquil-snuggling-gray.md` ; la date est celle de sa dernière modification.

## Contexte

Besoin initial : pouvoir "compiler" un DSL YAML pour mise en cache afin d'accélérer le rendu. Confirmé par l'utilisateur comme couvrant trois axes à la fois :
1. Coût du parsing YAML à chaque mount (`GenericPageRunner.tsx:52`, `parseYaml(yamlText)` via `js-yaml`, aucun cache au-delà du `useMemo` par instance de composant).
2. Coût de la validation Zod en dev (`DslRenderer.tsx`, `nodeSchema`/`ctxSchema.safeParse` à chaque render en dev).
3. Détection d'erreurs DSL au build/CI plutôt qu'à l'affichage utilisateur (aucun mécanisme existant aujourd'hui).

Un besoin plus large de "bundler des plugins/modules" pour `app-core` a été discuté avec la session `app-core-owner`. Scope confirmé par l'utilisateur : packaging zip/lien, install/replace/uninstall, DSL-only (pas de composants custom, référence dsl-ui existant), une version à la fois, pas de nouveau modèle de sécurité — et `app-core-owner` a été explicite : **"this is purely a packaging/distribution question, not a rendering one"**. Le packaging/install lui-même est donc hors scope de ce plan (domaine app-core). Le rôle de `dsl-renderer` ici se limite à fournir un **format d'artefact DSL compilé stable** que l'outillage de packaging pourra consommer plus tard — sans concevoir ce packaging.

Constat clé qui rend ce plan possible sans casser l'existant : dans `GenericPageRunner.tsx`, tout le code en aval de la ligne 52 (`parseYaml`) travaille sur l'objet `doc` déjà parsé, jamais sur la chaîne YAML brute. On peut donc brancher une source alternative à `yamlText` sans toucher au reste du composant.

Autre constat : les validations dev-only de `DslRenderer.tsx` (clés `$` inconnues, `nodeSchema`) sont **entièrement statiques** (déterminables sans donnée runtime) — la compilation peut les répliquer au build. En revanche `ctxSchema` et la vérification `$context.expose` dépendent de données `$sources` fetchées à runtime — **non vérifiables au build**, donc la compilation complète les garde-fous runtime existants, elle ne les remplace pas (aucun garde-fou retiré).

## Approche

### A. Compilateur pur Node

**Nouveau fichier `packages/dsl-renderer/src/registryHash.ts`**
- `computeRegistryFingerprint(registry: ComponentRegistry): string` — hash non-cryptographique (FNV-1a) sur, par composant trié par nom : `name|category|hasNodeSchema|hasCtxSchema|clés allowedChildren triées`. Isomorphique (zéro `fs`/`path`), utilisable aussi bien côté Node (compilateur) que navigateur (`GenericPageRunner`).
- Limite documentée en commentaire : signal de dérive best-effort, ne détecte pas un changement du contenu interne d'un `nodeSchema` si la présence/forme déclarée ne change pas.

**Nouveau fichier `packages/dsl-renderer/src/build/dslCompiler.ts`**
- `COMPILED_DSL_FORMAT_VERSION = 1`
- Types : `CompiledDslDiagnostic { severity, type, nodePath, code, message }`, `CompiledDslArtifact { formatVersion, registryFingerprint, compiledAt, sourcePath?, doc, diagnostics }`.
- `compileDslDocument(yamlText, registry, options?): CompiledDslArtifact` :
  - Parse comme `GenericPageRunner.tsx:52`, destructure comme `GenericPageRunner.tsx:55`.
  - Parcourt l'arbre et réplique uniquement les checks statiques de `DslRenderer.tsx` : clés `$` inconnues (nécessite d'exporter `KNOWN_DSL_KEYS`, actuellement `const` privée ligne 20), type de composant inconnu (déjà actif même en prod aujourd'hui), `nodeSchema.safeParse(node)`.
  - Cas spécial `ExtensionSlot` (nécessite d'exporter `EXTENSION_SLOT_TYPE`) : pas de lookup registry, pas de récursion dans `items` (résolu uniquement à runtime via `$sources`).
  - Récursion dans les enfants **uniquement** via `entry.allowedChildren` (seule métadonnée existante qui dit où se trouvent les nœuds enfants dans les props d'un composant) — un composant sans `allowedChildren` est une impasse pour le walker ; limite documentée, pas un nouveau contrat inventé.
  - `$if` n'est jamais évalué statiquement — le walker descend dans toutes les branches, y compris celles qui ne rendraient jamais pour un `ctx` donné (comportement correct : un nœud malformé doit être signalé peu importe la branche).
  - **Explicitement non vérifié**, documenté en commentaire : `ctxSchema` et "`$context.expose` référence une clé ctx manquante" (dépendent de données `$sources` runtime).
- `compileDslPagesDir(pagesDir, registry)` : même pattern que `pageTypesGenerator.ts:285-288` (`fs.readdirSync` + filtre `.yaml`), retourne `{ results, hasErrors }`.
- Format = JSON brut (`doc` est déjà un objet YAML parsé, `diagnostics` sont des objets plats), versionné par `formatVersion` — pas de couche de sérialisation custom.

### B. Consommation dans `GenericPageRunner` (non-breaking)

**Modifier `packages/dsl-renderer/src/GenericPageRunner.tsx`**
- `yamlText` devient optionnel ; nouvelle prop optionnelle `compiled?: CompiledDslArtifact`.
- Remplacement de la ligne 52 :
  - Ni `compiled` ni `yamlText` → `throw` explicite (erreur de programmation, pas de rendu silencieux).
  - `compiled.formatVersion !== COMPILED_DSL_FORMAT_VERSION` → `throw` explicite (forme potentiellement incompatible, pas sûr de deviner).
  - `compiled` présent avec fingerprint différent du registry courant → `console.warn` **inconditionnel** (pas seulement dev — un artefact stale en prod est exactement le cas "dérive de configuration silencieuse" que la règle UX/DX du projet vise), puis rendu quand même (les garde-fous runtime de `DslRenderer.tsx` restent le filet de sécurité).
  - Sinon : `doc = compiled ? compiled.doc : parseYaml(yamlText!)`. Rien d'autre ne change (confirmé : tout l'aval ne dépend que de `doc`).
- Aucune modification des checks dev-only de `DslRenderer.tsx` — ils continuent de tourner même sur un artefact compilé (défense en profondeur, pas de garde-fou retiré). Une optimisation future pour les sauter sur du contenu déjà validé est possible mais **différée** (ajouterait un couplage "trust this node" non nécessaire pour répondre aux besoins actuels).

### C. Détection d'erreurs en CI (fail-fast)

Aucun binaire `bin` n'existe dans ce repo (confirmé, recherche exhaustive) — le seul modèle de distribution d'outillage est `exports` subpath + plugin Vite optionnel (`pageTypesGenerator`, `entriesGenerator`). On suit ce pattern :
- `package.json` de `dsl-renderer` : ajouter `"./build/dslCompiler"` dans `exports` (même forme que les subpaths existants).
- Une app consommatrice écrit son propre petit script (hors dsl-renderer, ex. `scripts/check-dsl.ts`) qui importe son `ComponentRegistry` déjà construit, appelle `compileDslPagesDir`, affiche les diagnostics, et `process.exit(hasErrors ? 1 : 0)` — câblé en étape CI (`npm run dsl:check`). Même modèle que `pageTypesGenerator` aujourd'hui.
- Pas de wrapper Vite plugin dans cette itération (over-engineering vis-à-vis du besoin actuel — à ajouter plus tard si un besoin d'intégration dev/HMR automatique apparaît réellement).

### D. Détection de staleness du registry

Déjà intégrée dans B : fingerprint calculé à la compilation, recalculé et comparé au rendu, mismatch → `console.warn` systématique (jamais silencieux) nommant `sourcePath` si disponible, rendu quand même avec `doc` de l'artefact.

## Fichiers à modifier/créer

- `packages/dsl-renderer/src/engine/DslRenderer.tsx` — exporter `KNOWN_DSL_KEYS` et `EXTENSION_SLOT_TYPE` (actuellement `const` privées).
- `packages/dsl-renderer/src/registryHash.ts` — nouveau.
- `packages/dsl-renderer/src/registryHash.test.ts` — nouveau.
- `packages/dsl-renderer/src/build/dslCompiler.ts` — nouveau.
- `packages/dsl-renderer/src/build/dslCompiler.test.ts` — nouveau.
- `packages/dsl-renderer/src/GenericPageRunner.tsx` — prop `compiled`, branchement décrit en B.
- `packages/dsl-renderer/src/GenericPageRunner.test.tsx` — nouveaux cas (voir vérification).
- `packages/dsl-renderer/src/index.ts` — exporter `computeRegistryFingerprint`, les types `CompiledDslArtifact`/`CompiledDslDiagnostic`, `COMPILED_DSL_FORMAT_VERSION`.
- `packages/dsl-renderer/package.json` — ajouter le subpath `"./build/dslCompiler"`.

## Hors scope (explicite, pour traçabilité)

- Tout mécanisme zip/package/install/replace/uninstall (domaine app-core).
- Sauter les re-checks dev-only de `DslRenderer.tsx` pour du contenu déjà compilé/validé (optimisation future possible, différée).
- Hash cryptographiquement fort du contenu des schémas Zod (le fingerprint structurel best-effort est volontairement plus simple, limite documentée).
- Wrapper Vite plugin pour le compile-check (ajouté seulement si besoin réel démontré).

## Vérification

- `dslCompiler.test.ts` (vitest) :
  - YAML valide + registry correspondant → zéro diagnostic, `doc`/`formatVersion`/`registryFingerprint` corrects.
  - `$type` inconnu → diagnostic `unknown-component-type` avec `nodePath` correct.
  - clé `$` inconnue (ex. `$typo`) → diagnostic `unknown-directive`.
  - composant dont `nodeSchema` rejette le nœud → diagnostic `node-schema` avec le chemin/message Zod.
  - nœud `ExtensionSlot` → zéro diagnostic, pas de récursion dans `items`.
  - récursion via `allowedChildren` sur un conteneur → chemin d'erreur correct (ex. `$.children[1]`).
  - composant sans `allowedChildren` → le walker ne descend dans aucune de ses props (documente la limite au lieu de la cacher).
  - `compileDslPagesDir` sur un dossier temporaire de test (un YAML valide + un cassé) → `hasErrors === true`, bon fichier identifié.
- `registryHash.test.ts` : même registry deux fois → même fingerprint ; ajout/retrait d'un composant, présence `nodeSchema`/`ctxSchema`, clés `allowedChildren` → fingerprint change ; changement du corps de `render` → fingerprint inchangé (documenté comme attendu).
- `GenericPageRunner.test.tsx` : chemin `yamlText` inchangé (régression) ; `compiled` produit le même rendu que le `yamlText` équivalent ; aucune prop fournie → `throw` ; `formatVersion` incohérent → `throw` ; `registryFingerprint` incohérent → un seul `console.warn`, rendu quand même.
- `npm run build` (tsc) dans `packages/dsl-renderer` : succès, `dist/registryHash.*` et `dist/build/dslCompiler.*` émis.
- `npx vitest run` dans `packages/dsl-renderer` : suite complète verte (pas de régression sur les 163 tests existants + nouveaux).
- Vérifier par `Grep` que `registryHash.ts` n'importe rien de `fs`/`path`/`url` (reste sûr pour le bundle navigateur qui inclut aussi `GenericPageRunner.tsx`).
