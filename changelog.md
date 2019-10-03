# Architect Deploy changelog

---

## [1.1.5 - 1.1.6] 2019-10-02

### Fixed

- Fixed issue where with `@static fingerprint true` enabled, the `static.json` file would not be copied into deployed functions' shared dirs; fixes #43, thanks @dawnerd + @jgallen23!
- Removed `eslint` from production dependencies


### Changed

- Updated dependencies

---

<!-- TODO backfill, please! -->

---

## [1.0.4]

### Added

- `changelog.md` _meta_
- New `@static` config option: `folder` to override `public`
