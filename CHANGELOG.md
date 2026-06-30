# Changelog

All notable changes to **High Summoner** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com/) and
[Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-06-30

### Added
- **Avatar** class feature (level 1) in the `class-archetype` pack, granting the
  archetype's avatar companion.

## [1.0.0] - 2026-06-30

### Added
- Initial release.
- **High Summoner** class archetype for the Pathfinder 2e Summoner (`class-archetype` pack).
- **Avatar** — an eidolon-style summoned companion (`avatar` pack), plus the custom
  `avatar` trait (registered as a creature, equipment, and feat trait with tooltips).
- **Luster** weapon trait.
- Themed **spells** (`spells` pack).
- Optional **PF2e Dailies** integration: an Egi Companion avatar can prepare two
  familiar abilities during daily preparations (`scripts/egi-dailies.js`).
- Avatars suppress the character sheet's attribute-boost **EDIT** glow, matching how
  the system treats eidolons (`scripts/avatar-sheet.js`; uses lib-wrapper with a
  render-hook fallback).

[1.0.1]: https://github.com/EikoSakura/high-summoner/releases/tag/v1.0.1
[1.0.0]: https://github.com/EikoSakura/high-summoner/releases/tag/v1.0.0
