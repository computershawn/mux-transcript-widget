# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Vite `react-ts` app (React 19, TypeScript ~6, Vite 8) that is being built into a Mux player + synced transcript widget. `PLAN.md` holds the approved design, the build steps, and a Delivery table showing which steps are merged. Don't assume Mux SDKs, a test framework, or any other dependencies are installed — check `package.json` before using one.

## Commands

- `npm run dev` — Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then production build to `dist/`
- `npm run lint` — Oxlint (config in `.oxlintrc.json`)
- `npm run preview` — serve the built `dist/`
- `npm test` — Vitest, single run (`npm run test:watch` for watch mode)
- Single file / single test: `npx vitest run src/path/file.test.ts -t "test name"`

Vitest config lives in `vite.config.ts` (`test` key, jsdom environment). `src/test/setup.ts` registers jest-dom matchers and RTL cleanup. Globals are off, so import `describe`/`test`/`expect`/`vi` from `vitest`. Test files sit in `src/` and are type-checked by `npm run build`.

## Workflow

The widget is delivered as a series of small PRs, one per `PLAN.md` step, so each can be reviewed on its own.

- `feature/transcript-widget` is cut from `main`. Step PRs merge into it; when every step is done, one final PR merges it into `main`.
- Each step gets a branch named `transcript/s<N>-<slug>` (the names are listed in `PLAN.md`), cut from the up-to-date feature branch, with its PR targeting `feature/transcript-widget`. Step branches can't live under `feature/transcript-widget/…`, because git can't have a branch named both `feature/transcript-widget` and `feature/transcript-widget/<something>`.
- Do **one step at a time**, and have the user review it locally before anything is pushed:
  1. Create the step branch, implement the step, and make sure tests, lint and build pass.
  2. Stage the changes (`git add`) and **stop without committing or pushing**. The user reviews the staged diff in VS Code's Source Control view (or with `git diff --cached`).
  3. Answer questions and make requested changes, staging them too.
  4. Only after the user approves: commit, push, and open the PR.
- Start the next step only after the user has merged the previous PR and asked for it. "Continue" or "resume" means the next step, not the rest of the plan.
- Keep each PR to that step's scope. If a step's diff grows past about 300 lines (excluding `package-lock.json`), propose splitting it.
- Merge with merge commits, not squash, so branches cut before a merge stay valid without rebasing.
- There's no CI. Before pushing, `npm test`, `npm run lint` and `npm run build` must all pass; say so in the PR description.
- In each step's PR, update that step's row in `PLAN.md`'s Delivery table. If the implementation departs from the plan, update the plan in the same PR and point it out.

## TypeScript / build config

- `tsconfig.json` is a solution file referencing `tsconfig.app.json` (covers `src/`) and `tsconfig.node.json` (covers `vite.config.ts`). `tsc -b` checks both.
- `noEmit` is on; Vite (via `@vitejs/plugin-react`, Oxc-based) does the actual transpiling.
- Strictness that commonly breaks builds: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (type-only imports must use `import type`), and `erasableSyntaxOnly` (no `enum`, `namespace`, or constructor parameter properties).
- Imports may use explicit `.tsx`/`.ts` extensions (`allowImportingTsExtensions`), as `src/main.tsx` does.

## Lint rules

Oxlint with `react`, `typescript`, `oxc` plugins. `react/rules-of-hooks` is an error; `react/only-export-components` warns (constant exports allowed) — keep component files exporting only components so Fast Refresh works.

## Local files

`NOTES.md` is gitignored and is the user's personal log of agent mistakes and fixes. Don't edit it unless asked.
