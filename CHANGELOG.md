# Changelog

All notable changes to **ngx-jrxml-editor** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-07

First publishable cut. Covers the milestone series M1–M7.

### Added

#### JRXML codec (M1)
- Pure-TypeScript model layer mirroring JasperReports 7's JRXML structure (`JasperReport`, `Band`, `BandSection`, `AnyElement` union, `TableComponent`, `Field`, `Parameter`, `Variable`, `Group`, `Style`, `TextStyle`, `Pen`, `BoxBorders`, `SubDataset`, `Query`).
- `parseJrxml(xml)` and `serializeJrxml(model)` — round-trippable codec built on `fast-xml-parser` with stable attribute ordering matching JR conventions and CDATA preservation for text / expressions / queries.
- 4 Vitest tests covering model fidelity, idempotent round-trip, CDATA preservation, and table-component model identity.

#### Read-only canvas (M2)
- `<lib-jasper-canvas>` renders a band-stacked page surface with margins.
- `<lib-jasper-band>` positions absolute-coordinate elements over a 10px grid background.
- `<lib-jasper-element>` per-kind renderers for staticText (with full font/alignment), textField (placeholder italic), image (striped placeholder), line (border-based), rectangle (radius support), ellipse, frame (recursive), break (dashed), subreport (dashed placeholder), table (cell grid).

#### Selection + property inspector (M3)
- Click element → 2px blue outline, inspector populated.
- `JasperInspectorComponent` form controls for: position (x/y/width/height), forecolor/backcolor, per-kind props (text content, expression, pattern, font family/size/bold/italic/underline, alignment, scaleImage, line direction, rectangle radius, subreport expression).
- Two-way binding via `[(jrxml)]` / `[(report)]` — emits `(reportChange)` and `(jrxmlChange)` on every mutation.
- Signal-based `EditorStore` with immutable updates; element addressing via `ElementPath` walking through nested frames.

#### Palette + drop-to-create (M4)
- `<lib-jasper-palette>` lists 10 element kinds with monospace icons.
- Native HTML5 drag/drop with custom MIME (`application/x-jasper-element-kind`).
- Drop on band surface creates the element at the drop coordinates (sensible defaults per kind, fresh UUID).

#### History, drag, copy/paste, delete (M5)
- 100-entry undo/redo stack with transactions so a drag becomes a single Undo entry.
- Drag selected element to reposition (3px threshold to differentiate from click).
- Copy/paste with deep clone + fresh UUIDs + +10/+10 offset.
- Delete via toolbar or `Delete`/`Backspace` key.
- Toolbar with Undo/Redo/Copy/Paste/Delete; buttons disabled based on store signals.
- Keyboard shortcuts: `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` (or `Cmd/Ctrl+Y`), `Cmd/Ctrl+C`, `Cmd/Ctrl+V`, `Delete`, `Backspace`. Suppressed inside form controls.

#### Resize, snap, datasource (M6)
- 8-handle resize on selected top-level elements (corners + edge midpoints, appropriate cursors).
- Grid snap (5px) applied to drag-to-move and resize.
- Tabbed right panel: **Properties** | **Data**.
- `<lib-jasper-datasource>` UI for fields, parameters, variables (add / edit name + class / remove). Class dropdown preset to common Java types.

#### Table cells become first-class (M7)
- Real cell rendering (in JR row order: tableHeader → columnHeader → detailCell → columnFooter → tableFooter), each cell's children rendered via `<lib-jasper-element>` with cell-extended paths.
- Cells are drop targets for the palette.
- Click cell child → select that child; inspector shows its props as usual.
- `ElementPath` extended with `tableCell: { column, role, indices }` segment; codec/path utilities updated.

### Notes

- The library is **framework-agnostic at the codec layer** — `model/` and `jrxml/` import nothing from Angular.
- Angular **standalone components** throughout, **OnPush** change detection, **signals** for state.
- ESM-only (FESM2022) per `ng-packagr` defaults.

[Unreleased]: https://github.com/FlorianRauscha/ngx-jrxml-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FlorianRauscha/ngx-jrxml-editor/releases/tag/v0.1.0
