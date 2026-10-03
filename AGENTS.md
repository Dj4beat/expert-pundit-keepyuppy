# Repository Guidelines

## Project Structure & Module Organization

This workspace currently contains no application source, tests, assets, or package manifests. No language or framework has been established. When adding the initial implementation, document its structure in `README.md` and keep related modules together. If appropriate for the chosen framework, use `src/` for source, `tests/` for tests, and `assets/` for static resources; these directories do not exist yet.

## Build, Test, and Development Commands

No build, test, or local development commands are currently configured. When introducing tooling, provide reproducible setup instructions and list the actual commands in `README.md`. Include dependency installation, local execution, automated tests, and production builds where applicable. Do not assume commands such as `npm test` work until the corresponding configuration exists.

## Coding Style & Naming Conventions

Follow the conventions of the language and framework selected for the first implementation. Use consistent indentation and descriptive names throughout each module. Prefer small, focused files and avoid unrelated changes. Add formatter and linter configuration alongside the initial code so contributors can reproduce style checks.

## Testing Guidelines

No testing framework or coverage threshold is configured. Introduce tests with meaningful application behavior, and document how to run them. Use descriptive test names that identify the behavior and expected result. Cover bug fixes with regression tests where practical.

## Commit & Pull Request Guidelines

No readable Git history is available to establish existing commit conventions. Use short, imperative commit subjects, such as `Add initial game loop`. Keep commits focused. Pull requests should explain the change, list validation performed, link relevant issues, and include screenshots or recordings for visible interface changes. Explicitly note any checks that could not run.

## Security & Configuration

Keep credentials and local environment files out of version control. When configuration becomes necessary, document required variables and provide placeholder values rather than secrets.
