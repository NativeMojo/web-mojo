# Documentation & Agent File Restructure Prompt

Use this prompt with any AI agent to restructure a project's documentation and agent context files for optimal AI consumption.

---

## Prompt

You are a professional AI prompt engineer. Your job is to audit and restructure this project's documentation and AI agent context files so that AI coding agents get the best possible context without being overloaded.

### Phase 1: Audit the Current State

Read all agent-facing files (CLAUDE.md, Agent.md, memory.md, prompts/, and any similar files at the project root). Then read the documentation directory structure. Answer these questions before making changes:

1. **Duplication** — What content is repeated across multiple files? (e.g., coding rules in both CLAUDE.md and prompts/building.md)
2. **Staleness** — What references are outdated? (dead links, completed work still listed as in-progress, old file paths)
3. **Missing context** — What does an agent need to know that isn't documented? (framework docs, gotchas learned the hard way, current project state)
4. **Overloading** — What files are too large for an agent to consume efficiently? (anything over 400 lines should be split)
5. **Navigation** — Can an agent find what it needs in 1-2 hops? (entry point → topic file, not entry point → index → sub-index → topic)

### Phase 2: Restructure Documentation Files

For any documentation file over 400 lines:

1. Create a folder with the same name as the file (minus `.md`)
2. Split on `##` section boundaries into topic files
3. Merge consecutive small sections (<60 lines) into combined files to avoid trivially small files
4. Create a `README.md` in each folder with:
   - The original title and a 1-2 sentence description
   - A table of contents linking to each sub-file with a brief description
5. Use short, descriptive kebab-case filenames (under 40 chars). Examples: `models.md`, `endpoints-auth.md`, `events-and-security.md`
6. If a sub-file is still over 400 lines (common for "Endpoints" sections), sub-split it further on `###` boundaries, grouping by logical domain
7. Update the parent directory's README.md to link to `folder/README.md` instead of the old `file.md`
8. Delete the original monolithic file
9. Validate all markdown links still resolve

### Phase 3: Restructure Agent Context Files

Apply these principles — each file has ONE job, no duplication between them:

**Entry point file (CLAUDE.md or similar)** — Max ~100 lines. Contains ONLY:
- One-sentence project description
- Thread start protocol (what to read, in what order)
- Critical coding rules (the ones that cause bugs if violated)
- Testing commands
- Documentation structure overview (where things live, not the content itself)
- Source of truth table (file → purpose)
- Links to framework/dependency documentation

Does NOT contain: code examples, architecture diagrams, model descriptions, cross-app relationships. Those belong in the architecture file.

**Architecture file (Agent.md or similar)** — Max ~200 lines. Contains:
- Project directory structure
- App map table (app → purpose → key entry points)
- Cross-app architecture diagram
- Key models per app (1-2 sentences each, not full field lists)
- Authentication methods table
- Links to framework/dependency documentation

Does NOT contain: coding rules (those are in the entry point), mode-specific instructions (those are in prompts/).

**Working memory file (memory.md)** — Max ~100 lines. Contains:
- Current focus / in-progress work
- Gotchas learned the hard way (framework quirks, things that break tests, non-obvious patterns)
- Key decisions made (and why)
- Handoff notes for the next agent session
- Short archive section for completed work (2-3 lines per item max)

Has hygiene rules: cap sections to 5 bullets, remove stale items, prefer outcomes over narrative.

**Mode prompts (prompts/building.md, prompts/planning.md)** — Max ~50 lines each. Contains:
- Mindset for this mode
- Mode-specific rules (subset of entry point rules, plus mode-specific additions)
- Definition of done / output format
- Links to framework documentation
- Documentation update instructions (with correct paths to the new folder structure)

Does NOT contain: full rule lists (reference the entry point instead), architecture details.

**Framework reference file** — Max ~80 lines. Contains:
- Links to online/external framework documentation (source of truth)
- Index of what topics are covered in the external docs
- Quick reference summary of the most commonly needed concepts
- Response format / query parameter reference

### Phase 4: Validate

1. Run a link checker: scan all `.md` files for `[text](path)` links and verify each target exists
2. Verify total agent boot context (entry point + architecture + memory + one prompt) is under 500 lines
3. Verify no content is duplicated across files
4. Verify all documentation folders have a README.md index
5. Verify framework/dependency docs are linked (not copy-pasted) — online docs change, local copies go stale

### Key Principles

- **Token budget matters.** Every line an agent reads costs context window. Cut anything that doesn't directly prevent bugs or speed up navigation.
- **One hop to content.** README.md indexes exist so agents can scan a table of contents and jump to the exact sub-file they need. Never more than 2 levels of indirection.
- **Link, don't copy.** Framework docs, dependency docs, and API specs should be linked to their source of truth, not duplicated locally.
- **Gotchas over tutorials.** Agents already know how to write Python/Django/React. What they don't know is YOUR project's quirks. Prioritize "this will bite you" over "here's how X works."
- **Current state over history.** Memory files should reflect what's true NOW, not a journal of everything that happened.
- **Separate rules from reference.** Rules are "always do X, never do Y" — they go in the entry point. Reference is "here's how X works" — it goes in architecture or docs.
