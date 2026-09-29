# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repo is currently the unmodified Vite `react-ts` template (React 19, TypeScript ~6, Vite 8). `src/App.tsx` still has the template demo content; no transcript-widget code exists yet. Don't assume Mux SDKs, a test framework, or any other dependencies are installed — check `package.json` before using one.

## Commands

- `npm run dev` — Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then production build to `dist/`
- `npm run lint` — Oxlint (config in `.oxlintrc.json`)
- `npm run preview` — serve the built `dist/`

No test runner is configured yet.

## TypeScript / build config

- `tsconfig.json` is a solution file referencing `tsconfig.app.json` (covers `src/`) and `tsconfig.node.json` (covers `vite.config.ts`). `tsc -b` checks both.
- `noEmit` is on; Vite (via `@vitejs/plugin-react`, Oxc-based) does the actual transpiling.
- Strictness that commonly breaks builds: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (type-only imports must use `import type`), and `erasableSyntaxOnly` (no `enum`, `namespace`, or constructor parameter properties).
- Imports may use explicit `.tsx`/`.ts` extensions (`allowImportingTsExtensions`), as `src/main.tsx` does.

## Lint rules

Oxlint with `react`, `typescript`, `oxc` plugins. `react/rules-of-hooks` is an error; `react/only-export-components` warns (constant exports allowed) — keep component files exporting only components so Fast Refresh works.

## Local files

`notes.md` is gitignored and is the user's personal log of agent mistakes and fixes. Don't edit it unless asked.
