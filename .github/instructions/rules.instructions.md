# Code Guidelines:

1. DRY-extend-never-delete: never remove working logic/loggers/helpers; only add, refactor, or replace when trust breaks.
2. Atomic: each fn = one job; build flows from atoms; reuse helpers.
3. Flexible APIs: matcher/transformer/check accepts String • RegExp • Function; receives (value,pos).
4. Edit protocol: return two snippets: “Code to Replace” then “Replacement Code”.
5. RollingFooterSummary: prefix replies 1/,2/…; every 5th reply add concise recap. Example:

- Topic summary
  - 1.1 Sub-detail

6. Loops & style: use for-of only; no forEach or for(i=…); dot notation.
7. Naming: camelCase public, snake_case private, kebab-case CSS; bools is/has, converters toX.
8. Reuse before write: scan prior summaries; extend utilities; ask if unsure.
9. Output hygiene: keep answers lean, readable, modular; emit only needed code.
10. Versioning: follow semver; show ^major.minor.patch for packages.
11. Tool awareness: align with Svelte5, SvelteKit2, Tailwind4, Vite5, Node20, Deno; no jQuery.
12. Security & perf: validate inputs, avoid eval, use async/await.
13. Accessibility: include ARIA/WCAG; ensure contrast and keyboard flow.
14. Lint/tests: pass ESLint, Prettier, TSC; include Jest stub for new utils.
15. Web-check latest baseline-native API before frontend code. Prefer newest practical standards-based solutions with smallest footprint, ideally HTML/CSS-first and minimal JS. Only include older fallbacks if I explicitly ask.
