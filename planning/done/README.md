# Done Archive

This folder stores resolved planning items from `planning/requests/` and `planning/issues/`.

Use it as a lightweight completion archive so active queues stay clean while the project keeps a searchable history of what was requested, what changed, and how it was validated.

## What Belongs Here

Move an item here only after it is fully resolved:

- completed feature requests
- completed enhancements
- fixed bugs or regressions
- finished refactors with documented outcomes

## Before Moving a File Here

Update the file first:

1. Set the status to resolved.
2. Fill in the `Resolution` section.
3. Record the resolution date.
4. List the main files changed.
5. Note any tests or validation performed.
6. Note doc or changelog updates if they were required.

## Resolution Notes Should Include

- final status
- short summary of what changed
- root cause for bugs
- files changed
- tests added or run
- validation performed
- any follow-up work still needed

## Archive Rules

- Keep the original file whenever possible; do not rewrite history.
- Preserve the original request or issue context.
- Keep filenames clear and searchable.
- Prefer kebab-case filenames.
- If related follow-up work is needed, create a new file in `requests/` or `issues/` and link back to the archived item.

## Important

Files in `planning/done/` are historical planning records, not implementation source of truth.

The actual source of truth remains:

- framework code in `src/`
- framework docs in `docs/web-mojo/`
- active decisions in `memory.md`

Use this folder to understand prior work, not to infer current API behavior without checking the code and docs.