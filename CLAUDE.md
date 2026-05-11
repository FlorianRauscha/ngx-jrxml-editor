# CLAUDE.md

Project context for future Claude sessions. Keep concise; update when architecture shifts.

## What this project is

A web-based JRXML template editor for **JasperReports 7+**, packaged as an Angular 19+ library. The editor produces JR 7 compact JRXML on save and accepts both compact and legacy form on load. Live PDF preview is **out of scope** — the editor only edits templates; rendering is the host application's job.

Public package name: `ngx-jrxml-editor`. Repo layout is an Angular workspace with one publishable library + one demo host app.

## Repo layout

```
ngx-jrxml-editor/
├── projects/
│   ├── ngx-jrxml-editor/          # the publishable library (npm: ngx-jrxml-editor)
│   │   └── src/lib/
│   │       ├── model/             # pure-TS JRXML model types (no Angular)
│   │       ├── jrxml/             # parser + serializer (no Angular)
│   │       ├── canvas/            # rendering + drag/resize/drop
│   │       │   └── elements/      # one component per element kind
│                                  #   (static-text, text-field, image, line,
│                                  #    rect, ellipse, frame, break, subreport,
│                                  #    element-group, barcode, table)
│   │       ├── palette/           # left-side element palette
│   │       ├── inspector/         # right-side property panel
│   │       ├── datasource/        # right-side Data tab (fields/params/vars)
│   │       ├── page-settings/     # right-side Page tab (paper, margins, bands)
│   │       ├── source/            # JRXML source view with highlighting
│   │       ├── toolbar/           # top toolbar (undo/redo/zoom/view-toggle)
│   │       ├── icon/              # JasperIconComponent (Lucide SVG paths)
│   │       ├── state/             # EditorStore, paths, snap, uuid, factory
│   │       └── jasper-editor.component.ts   # top-level shell
│   └── demo/                      # local Angular 19 app for manual testing
├── test/                          # Vitest round-trip tests
├── README.md / CHANGELOG.md / LICENSE / CLAUDE.md
└── ngx-jrxml-editor-0.1.0.tgz     # last npm pack (gitignored)
```

The **`model/`** and **`jrxml/`** folders are pure TypeScript with **no Angular imports**. They can be reused outside Angular (Node scripts, web workers, other frameworks).

## Architectural choices

- **Standalone components throughout**, OnPush change detection, **signals** for state. No `NgModule`s, no NgRx — `EditorStore` is a small `@Injectable()` exposed via the editor component's providers.
- **Single source of truth = `EditorStore.report` signal.** Every mutation goes through one of the store methods and ends up calling `_report.set(...)` with a new immutable model.
- **Undo/redo** is a stack of `{ report, selection }` snapshots in `_past[]` / `_future[]`. `beginTransaction()` / `commitTransaction()` group mousemove-driven mutations (drag, resize) into single undo entries.
- **JRXML codec emits JR 7 compact form** (`<element kind="...">` with inline attrs, `<expression>` instead of `<textFieldExpression>`, sections without `<band>` wrapper for non-detail). The parser accepts BOTH compact AND legacy form for input.
- **Tables** stay in the legacy `<componentElement>/<jr:table>` namespace form on serialize — JR 7 still accepts it and it's safer than guessing the new component schema. Same for `<jr:barcode4j>`.
- **Element addressing** uses `ElementPath = { section, bandIndex, indices: number[], tableCell? }`. The optional `tableCell: { column, role, indices }` segment lets selection point inside table cells.
- **Zoom** uses CSS `zoom` (not `transform: scale`) so layout, scrollbars, and pointer-event coordinates all respect the zoom factor with zero math.
- **Icons** are inlined SVG path strings sourced from Lucide (MIT). Single `JasperIconComponent` with a `@switch` on `name` — only icons referenced in templates land in the bundle.

## Key conventions

- TypeScript **strict mode**. Always use `minmax(0, 1fr)` in CSS Grid templates inside flex containers — otherwise children overflow their flex parent.
- Inputs use the new `input.required<T>()` / `input<T>()` signal-based syntax. Outputs use `output<T>()`.
- Component templates use the `@if` / `@for` / `@switch` control flow blocks. Avoid `*ngIf` / `*ngFor`.
- Component CSS encapsulation is the Angular default. Inline styles applied via `[innerHTML]` get stripped by the sanitizer — for those cases (the Source view's syntax highlighting), use `DomSanitizer.bypassSecurityTrustHtml`.
- For pointer-event handlers, **always wrap `setPointerCapture` / `releasePointerCapture` in try/catch** — they throw on synthetic events in tests.
- **Always set `min-width: 0` on flex children** that may receive content wider than their allocation (e.g. `:host`, `.je-body`, `lib-jasper-toolbar`). Without it, default `min-width: auto` lets content force the parent wider than the viewport.
- After Edit-replacing source-view code that contains literal control characters (`\x01`, `\x1F`), prefer Python via Bash — the Edit tool sometimes can't match strings containing them.
- **CDATA/text trimming**: `fast-xml-parser` is configured with `trimValues: true` because the pretty-printer adds indentation around CDATA, and JR doesn't carry semantic leading/trailing whitespace inside `<text>`/`<expression>`.
- **`crypto.randomUUID()` is the v4 source**; we wrap it in `state/uuid.ts` with a `getRandomValues`-based fallback that constructs RFC-compliant UUIDs (the manual route used to produce malformed strings — fixed).

## Build / test / run

```bash
# Library build (development → no TS terser; production → minified, partial-Ivy)
ng build ngx-jrxml-editor [--configuration=development|production]

# Demo app
ng serve demo --port 4321 --no-open
# After significant library changes, the vite cache often serves stale chunks.
# Reset with: kill $(lsof -ti tcp:4321); rm -rf .angular/cache; ng serve demo …

# Round-trip tests
npx vitest run

# Build + pack a release tarball
ng build ngx-jrxml-editor --configuration=production
npm pack ./dist/ngx-jrxml-editor --pack-destination .
```

The demo app is wired up with two-way `[(jrxml)]` binding plus Load/Save buttons in the banner so you can drop real-world `.jrxml` files into the editor.

## Editor surface (current feature set)

- **3-column layout** at ≥ 1100 px: palette | canvas | tabbed right panel (Properties / Data / Page / Styles). Below 1100 px the side panels become slide-in drawers with a backdrop. Toggle via `☰` and `⚙` icons.
- **Toolbar**: Undo / Redo / Copy / Paste / Delete / Align (L · H-center · R · T · V-center · B) / Distribute (H · V) / Zoom (− / 100% / +) / Design ↔ Source. Align buttons enable with 2+ selected; distribute with 3+.
- **Multi-selection**: shift/⌘/ctrl-click an element to toggle it in the selection; drag any selected element to move every selected element by the same delta in one undo entry; drag on empty band surface for a marquee that selects all top-level elements whose bbox intersects (shift to add, plain replaces). The inspector switches to a count + alignment hint when 2+ are selected.
- **Canvas**: rulers (10 px minor / 50 px major / 100 px label, scale with zoom), per-band header strip with section name, drag-to-resize band heights, drag-to-move + 8-handle resize on selected element, drop targets on bands and table cells.
- **Element kinds (v1)**: staticText, textField, image, line, rectangle, ellipse, frame, break, subreport, table (`jr:table`), barcode (`jr:barcode4j` with all 14 types). Charts and crosstabs are deferred.
- **Inspector**: position / colors / kind-specific editors for staticText, textField, image, line, rectangle, subreport, barcode (type, code expression, text position, checksum, module width, orientation, QR ECL, pattern). Font controls are extracted to a single `<ng-template>` shared by staticText and textField.
- **Data tab**: fields / parameters / variables CRUD with Java type dropdown.
- **Page tab**: paper presets (A3/A4/A5/Letter/Legal/Tabloid + Custom), Portrait/Landscape, margins, columns, **Bands** (toggle each section on/off, edit heights, add/remove detail bands).
- **Source view**: textarea + highlighted-overlay editor with line-number gutter (vertical-scroll synced via `transform: translateY(-scrollTop)`). XML syntax highlighting plus Java/JR-expression highlighting inside CDATA: `$F{}` / `$P{}` / `$V{}` / `$R{}` refs, string literals, numbers, Java keywords, common types. Live two-way: every keystroke re-parses; parse errors show in an inline red bar.
- **Keyboard shortcuts**: `⌘Z` / `⇧⌘Z` (or `⌘Y`) / `⌘C` / `⌘V` / `Delete`. Suppressed inside form controls.

## State signal map (`EditorStore`)

| Signal | Purpose |
|---|---|
| `report` | Current `JasperReport \| null` |
| `selections` | `ElementPath[]` — full multi-selection |
| `selection` | `ElementPath \| null` — primary (first) selected, computed |
| `selectionCount` / `hasMultiSelection` | Counts derived from `selections` |
| `selectedElement` | `getElementAt(report, selection)` (primary only) |
| `selectedElements` | All resolved selected elements |
| `canUndo` / `canRedo` / `canPaste` | Toolbar button enablement |
| `zoom` | CSS zoom factor (0.25 – 4) |

Mutations: `setReport`, `select` / `setSelections` / `addSelection` / `toggleSelection`, `updateSelected`, `updateMany`, `updateReport`, `updateBand`, `addBand`, `removeBand`, `addElement`, `addElementToCell`, `deleteSelected` (deletes every selected, bottom-up so indices don't shift), `copySelected`, `paste`, `setZoom` / `zoomIn` / `zoomOut` / `resetZoom`, `beginTransaction` / `commitTransaction`.

## Things to know before changing things

- **Test fixtures use intentionally non-v4 UUIDs** like `11111111-1111-1111-1111-111111111111`. They're shaped like UUIDs but visually distinct so it's easy to spot them in test output. Real templates parsed via Load get the original UUIDs preserved; new elements get proper v4s from `state/uuid.ts`.
- **Vite's library cache is sticky.** After substantial library changes, `kill $(lsof -ti tcp:4321) && rm -rf .angular/cache && ng serve demo` is often necessary — otherwise you'll keep seeing the previous bundle even after a successful rebuild.
- **The `dist/` folder is what `npm publish` would ship.** Always rebuild before tarball — `npm pack ./dist/ngx-jrxml-editor` (not the project root, which would pack the workspace).
- **Round-trip tests live in `/test`** (not in the library project). They run via Vitest, not Karma. Don't move them.
- **The demo's `samples.ts`** has a `SAMPLE_TABLE` with the `jr:` namespaced legacy form — useful for testing both schemas in one click. The `simple.jrxml` fixture is also legacy form for the same reason.
- **Don't reintroduce `crypto.randomUUID?.() ?? String(Date.now())`** as a fallback. We have a real RFC-compliant fallback in `state/uuid.ts` now; the older shortcut produced malformed UUIDs.
- **`<lib-jasper-editor>`'s two-way `[(jrxml)]` binding tracks `lastEmittedXml` to break the input/emit echo loop.** Without that guard, every store mutation would round-trip through the parent, hit `setReport`, and wipe the undo stack. If you change the input plumbing, preserve this guard or undo silently breaks.
- **`JasperElementComponent` is now a thin dispatcher.** Each element kind has its own component under `canvas/elements/`. Selection/click/drag-to-move logic lives in `canvas/element-interaction.directive.ts` and is applied via `hostDirectives: [{ directive: ElementInteractionDirective, inputs: ['libElementInteraction: element', 'libElementPath: path'] }]` on every per-kind component. Per-kind components read `element` and `path` by injecting the directive. Frames, element groups, and tables import the dispatcher via `forwardRef(() => JasperElementComponent)` to break the recursive cycle.
