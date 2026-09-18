# Domain documentation

Use a root CONTEXT-MAP.md to route to relevant domain glossaries:

- docs/trident/CONTEXT.md: Trident business vocabulary shared by its apps.
- packages/ui/CONTEXT.md: reusable UI design vocabulary.

Create these lazily as terminology is resolved. Missing files do not
block work. Until a map exists, read a root CONTEXT.md if present.

Keep glossaries limited to domain meaning. Maintain API explanations,
examples and implementation guidance beside their owning code or package.

Read relevant decisions in docs/adr/ and packages/ui/docs/adr/.
Create decision records only for choices that are hard to reverse,
surprising without context and involve a real trade-off.

Use agreed glossary terms. Surface conflicts with existing decisions.
Keep planned work and historical TODO reconciliation in the backlog.
