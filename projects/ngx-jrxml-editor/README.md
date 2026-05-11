# ngx-jrxml-editor

A web-based JRXML template editor for **JasperReports 7+**, packaged as an Angular 19+ library.

The library produces standards-compliant `.jrxml` XML you can hand to any JasperReports server / engine for compilation and rendering.

## Install

```bash
npm install ngx-jrxml-editor
```

Peer requirements: `@angular/common` and `@angular/core` `^19.2`.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { JasperEditorComponent } from 'ngx-jrxml-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [JasperEditorComponent],
  template: `
    <lib-jasper-editor
      [jrxml]="jrxml()"
      (jrxmlChange)="jrxml.set($event)"
      (reportChange)="onModel($event)" />
  `,
  styles: ['lib-jasper-editor { display: block; height: 100vh; }'],
})
export class AppComponent {
  jrxml = signal<string>(initialJrxml);

  onModel(model: import('ngx-jrxml-editor').JasperReport): void {
    // Optional: react to the parsed model directly instead of (jrxmlChange).
  }
}
```

The component fills its host. Give the host element an explicit height (`100vh`, flex child, etc.) — it does not size itself.

## Public API

### `<lib-jasper-editor>`

| Input | Type | Description |
|-------|------|-------------|
| `jrxml` | `string \| null` | JRXML XML string. Parsed on change; parse errors render an inline error panel. |
| `report` | `JasperReport \| null` | Pre-parsed model (alternative to `jrxml`). Wins over `jrxml` if both provided. |

| Output | Type | Description |
|--------|------|-------------|
| `reportChange` | `JasperReport` | Fires on every model mutation (drag, edit, paste, delete, datasource change…). |
| `jrxmlChange` | `string` | Same trigger, serialized to JRXML. Debounce in your host if you wire to a network save. |

### Programmatic codec

For non-UI use cases (server-side conversion, validation, transformations):

```ts
import { parseJrxml, serializeJrxml } from 'ngx-jrxml-editor';

const model = parseJrxml(xmlString);
model.fields = [...(model.fields ?? []), { name: 'created_at', class: 'java.util.Date' }];
const updated = serializeJrxml(model);
```

`parseJrxml` and `serializeJrxml` are pure functions with **no Angular dependency** — safe to use in workers, Node scripts, or non-Angular frontends.

### Model types

All model interfaces are exported from the package root: `JasperReport`, `Band`, `BandSection`, `AnyElement` (union of `StaticTextElement | TextFieldElement | ImageElement | LineElement | RectangleElement | EllipseElement | FrameElement | BreakElement | SubreportElement | TableElement | BarcodeElement | ChartElement | CrosstabElement | ElementGroup`), `TableComponent`, `TableColumn`, `TableCell`, `Barcode4jComponent`, `Barcode4jType`, `ChartType`, `ChartDataset` (`PieDataset | CategoryDataset`), `CategorySeries`, `CrosstabRowGroup`, `CrosstabColumnGroup`, `CrosstabMeasure`, `CrosstabBucket`, `HyperlinkFields`, `Field`, `Parameter`, `Variable`, `Group`, `Style`, `ConditionalStyle`, `TextStyle`, `Pen`, `BoxBorders`, `SubDataset`, `Query`. The validator helper is exported as `validateReport(report)` returning `ValidationIssue[]`.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` (or `Cmd/Ctrl + Y`) | Redo |
| `Cmd/Ctrl + C` / `Cmd/Ctrl + X` / `Cmd/Ctrl + V` | Copy / cut / paste selected element |
| `Delete` / `Backspace` | Delete selected element(s) |
| `Arrow keys` | Nudge selection by 1 px |
| `Shift + Arrow keys` | Nudge selection by 10 px |
| `Cmd/Ctrl + ]` / `Cmd/Ctrl + [` | Bring forward / send backward |
| `Cmd/Ctrl + Shift + ]` / `Cmd/Ctrl + Shift + [` | Bring to front / send to back |
| `Cmd/Ctrl + G` / `Cmd/Ctrl + Shift + G` | Group selected elements / ungroup |
| `Cmd/Ctrl + F` (in source view) | Open find / replace |
| `Esc` | Close context menu / find panel |

Shortcuts are suppressed while focus is in any `<input>`, `<textarea>`, `<select>`, or contenteditable.

## What's supported

**Elements:** staticText, textField, image, line, rectangle, ellipse, frame, break, subreport, elementGroup (with toolbar wrap / unwrap), table (`jr:table` with sub-dataset, columns, table/column header/footer + detail cells), barcode (`jr:barcode4j` — all 14 1D + 2D types incl. QR / DataMatrix / PDF417), chart (pie / pie3D / bar / bar3D / stackedBar / line / area / stackedArea with pie & category datasets, multi-series, axis labels, legend toggle), crosstab (row groups, column groups, measures, sub-dataset binding).

**Bands:** background, title, pageHeader, columnHeader, detail (multiple), columnFooter, pageFooter, lastPageFooter, summary, noData, plus full **group header / footer** band rendering (multi-band per group) with selection, drag, resize, and an inspector group manager.

**Datasource:** fields, parameters, variables, query string, sub-datasets. Drag any field / parameter / variable row from the Data tab onto the canvas to create a bound `$F{}` / `$P{}` / `$V{}` textField in one gesture.

**Inspector:** position, fore/backcolor, font, paragraph, box (per-side padding + pen), kind-specific editors (textField evaluation, image scale / cache / lazy / onError, barcode type + bindings, chart bindings, line direction, rectangle radius). Cross-cutting: `printWhenExpression`, `isPrintRepeatedValues`, `printWhenGroupChanges`, hyperlink fields (textField + image), subreport parameter mapping (`<subreportParameter>` rows + parametersMap / connection / dataSource expressions). Lock & hide-in-editor toggles round-trip through JR custom properties.

**Styles:** text styling (font name, size, bold, italic, underline, strikethrough, alignment), pen (line width / style / color), box borders (per-side pen + padding), fore/backcolor, mode, conditional styles round-trip.

**Source view:** live two-way XML editing with syntax highlighting (XML + Java/JR-expressions inside CDATA), find / replace (`Cmd/Ctrl + F`), parse-error line marker.

**Validation:** the right panel's "Check" tab lists every detected issue: empty required expressions, references to undeclared `$F{}` / `$P{}` / `$V{}`, duplicate field/parameter/variable/style/group names, multiple default styles, and crosstab/chart structural problems. Click an issue to jump to its element. The tab title shows a live error/warning badge.

**Expression picker:** every expression input across the editor (textField / image / subreport / chart / barcode / crosstab / hyperlink / printWhen / conditional-style condition) shows an autocomplete dropdown when you type `$F{`, `$P{`, `$V{`, or `$R{`. Suggestions filter live, navigate with `Up`/`Down`, accept with `Enter` or `Tab`.

## Out of scope

- Live PDF preview. The editor only produces JRXML; rendering happens server-side via your JasperReports engine.
- Resize handles for elements nested inside table cells (use the inspector to change x/y/width/height — frames are supported).
- Round-trip preservation of custom `<crosstabCell>` and `<crosstabRowHeader>`/`<crosstabColumnHeader>` content. We round-trip the structural definition (groups, measures, dataset run); cell contents are regenerated as empty shells on save.

## Architecture notes

- **Pure model layer** under `lib/model` and **pure codec layer** under `lib/jrxml` — no Angular imports. Round-tripped via `fast-xml-parser` with stable attribute ordering matching JasperReports conventions.
- **Signal-based state** (`EditorStore`) — single source of truth for the report model, current selection, undo/redo history (capped 100), and clipboard. All mutations are immutable.
- **Standalone components throughout**, OnPush change detection, no `NgModule`s.

See the [project README](https://github.com/FlorianRauscha/ngx-jrxml-editor/blob/main/README.md) for repo layout, milestones, and CHANGELOG.

## License

[MIT](https://github.com/FlorianRauscha/ngx-jrxml-editor/blob/main/LICENSE)
