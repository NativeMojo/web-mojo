---
name: dr_start requires real date
description: Backend does not accept dr_start=today — must use an actual YYYY-MM-DD date string
type: feedback
---

Never use `dr_start=today` or `dr_end=today` in API calls. The backend does not recognize `today` as a valid value. Always compute the actual date, e.g. `new Date().toISOString().slice(0, 10)`.

**Why:** Backend only accepts real date values for date range params.
**How to apply:** Any time you write a `dr_start` or `dr_end` query param, use a computed ISO date string.
