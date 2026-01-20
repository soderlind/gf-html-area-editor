# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.2.3] - 2026-01-20

### Changed
- Fix naming in composer.json for better package discoverability

## [0.2.2] - 2026-01-20

### Added
- Heading format dropdown (P, H2-H6) in the editor toolbar
- Media Library button to insert images

### Changed
- Compact format dropdown with shorter labels (P, H2 instead of Paragraph, Heading 2)

## [0.2.1] - 2026-01-20

### Fixed
- Fixed duplicate preview containers showing "No content" alongside actual content
- Preview now properly replaces Gravity Forms default container instead of appending

## [0.2.0] - 2026-01-20

### Added
- Live preview of HTML content in form editor field boxes
- Real-time preview updates as you edit content
- All HTML fields show rendered content when form editor loads

### Fixed
- Event race conditions with duplicate jQuery event bindings
- Editor double initialization issues
- Preview update flooding when typing rapidly (added debouncing)

### Changed
- Namespaced jQuery events (`.gfte`) to prevent conflicts with other plugins
- Improved timing for preview updates to ensure Gravity Forms has finished rendering

## [0.1.0] - 2026-01-20

### Added
- Initial release
- Rich text editor (TinyMCE) for Gravity Forms HTML field content setting
- Visual and Text mode switching support
- WordPress Media Library integration for inserting images
- Content sanitization on frontend output using `wp_kses()`
- Support for merge tags in the rich text editor
- Allowed HTML elements: p, br, ul, ol, li, h2-h6, strong, b, em, i, a, img
