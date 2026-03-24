---
name: Workspace Package Manifest Rules
description: 'Use when editing any package.json in the monorepo. Covers workspace dependency versions, dependency placement, and package manifest conventions.'
applyTo: '**/package.json'
---

# Workspace Package Manifest Rules

- Use `workspace:*` for internal package references
- Keep build tools in `devDependencies`, not `dependencies`
- Follow semver and show `^major.minor.patch` for packages
- When package installation is required, use root-level ` pnpm --filter <package-name> add <dependency>` as described in `.github/copilot-instructions.md`
- In `packages/ui/package.json`, preserve exports for both `/src` (development) and `/` (built) entry points
