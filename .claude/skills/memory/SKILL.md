---
name: memory
description: Display the current state of Claude Code project memory
user-invocable: true
---

Display the current state of Claude Code project memory for this project.

## Workflow

1. Read the memory index at `~/.claude/projects/-Users-ians-Projects-mojo-web-mojo/memory/MEMORY.md`.
2. List all memory files in that directory.
3. Read each memory file.
4. Present a summary table with columns: Name, Type, Description, Content Preview.

## Rules

- Read-only — do not modify any memory files.
- If the memory directory or MEMORY.md does not exist, report that no memory has been saved yet.
