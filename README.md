# @lazylingo/core

[![CI](https://github.com/doossee/lazylingo-core/actions/workflows/ci.yml/badge.svg)](https://github.com/doossee/lazylingo-core/actions/workflows/ci.yml)

Shared TypeScript core for LazyLingo. Consumed by `lazylingo-app` (PWA + Tauri) and `lazylingo-extension`.

Implementation follows in Plan 2 of the LazyLingo refactor — see `LazyLingo/docs/superpowers/plans/`.

## Responsibilities (planned)

- GitHub vault sync (Device Flow auth, Contents API I/O, conflict handling)
- Dictionary lookup (Free Dictionary API + MyMemory translation, normalized into a single `LookupResult` shape)
- SRS scheduler (interval/ease/due-date math)
- Shared types (`Flashcard`, `LookupResult`, `Deck`, etc.)

## Scripts

```bash
npm test          # vitest watch
npm run test:run  # vitest single pass
npm run build     # tsc → dist/
```
