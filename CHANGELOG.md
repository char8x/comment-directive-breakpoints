# Change Log

## [0.4.0]

### Added

- **Multi-language Support**: Integration with Tree-Sitter for reliable parsing across languages including Python, Go, Rust, Java, Ruby.
- **Intelligent Autocompletion**: Context-aware code suggestions for expressions in logpoints and conditional breakpoints.

## [0.3.0]

### Added

- **Real-time Synchronization**: Automatic breakpoint generation and updates upon saving files.
- **Workspace Scanning**: Commands to generate breakpoints for the entire workspace or only currently opened files.
- **Configurable Behavior**: Extension settings for toggling automatic generation on save and managing supported languages.

## [0.2.0]

### Added

- **Directive-Based Breakpoints**: Support for standard (`@bp`), logpoints (`@bp.log`), conditional (`@bp.expr`), and hit-count (`@bp.hit`) breakpoints using comment annotations.
- **Initial State Control**: Support for `.disable` suffix to create initially disabled breakpoints (e.g., `// @bp.disable`).

## [0.1.0]

- Initial release
