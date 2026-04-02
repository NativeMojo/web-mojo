# Documentation Rules

## Where Docs Live
- Framework docs: `docs/web-mojo/` — authoritative when inside this repo.
- Docs index: `docs/web-mojo/README.md` — start here.
- `docs/pending_update/` contains drafts only — not authoritative, never use for implementation decisions.
- `DEV_GUIDE.md` is contributor-facing, not part of the default workflow.
- `docs/web-mojo/AGENT.md` is a drop-in for downstream consumer projects — separate from internal rules.

## When to Update Docs
- When public API, exported behavior, or documented conventions change.
- Update `CHANGELOG.md` when the change is release-facing.
- Update doc indexes if new doc files are added.

## Documentation Quick Lookup
- App shell → `docs/web-mojo/core/WebApp.md`, `core/PortalApp.md`
- Views → `docs/web-mojo/core/View.md`, `core/ViewChildViews.md`, `core/AdvancedViews.md`
- Templates → `docs/web-mojo/core/Templates.md`, `core/DataFormatter.md`
- Data layer → `docs/web-mojo/core/Model.md`, `core/Collection.md`
- Pages → `docs/web-mojo/pages/Page.md`, `pages/FormPage.md`
- HTTP / realtime → `docs/web-mojo/services/Rest.md`, `services/WebSocketClient.md`
- Dialogs / tables / lists → `docs/web-mojo/components/Dialog.md`, `components/TableView.md`, `components/TablePage.md`, `components/ListView.md`
- Extensions → `docs/web-mojo/extensions/*.md`
- Forms → `docs/web-mojo/forms/README.md`
