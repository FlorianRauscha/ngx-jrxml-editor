import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JasperIconComponent } from '../icon/jasper-icon.component';
import { ExpressionInputComponent } from '../inspector/expression-input.component';
import type { ConditionalStyle, Pen, Style, TextStyle } from '../model/style';
import { EditorStore } from '../state/editor-store';

@Component({
  selector: 'lib-jasper-styles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, JasperIconComponent, ExpressionInputComponent],
  styles: [
    `
      :host {
        display: block;
        background: #f7f8fb;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 12px;
        height: 100%;
        overflow-y: auto;
      }
      .js-empty {
        padding: 24px 16px;
        color: #888;
        text-align: center;
      }
      .js-toolbar {
        padding: 12px 16px;
        border-bottom: 1px solid #e1e4eb;
        background: #fff;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .js-toolbar button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #4a6cf7;
        color: #fff;
        border: none;
        border-radius: 3px;
        padding: 4px 10px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
      }
      details.js-style {
        border-bottom: 1px solid #e1e4eb;
      }
      details.js-style > summary {
        list-style: none;
        cursor: pointer;
        padding: 10px 16px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 22px;
        align-items: center;
        gap: 6px;
        background: #fff;
      }
      details.js-style > summary::-webkit-details-marker {
        display: none;
      }
      .js-summary-name {
        font-weight: 600;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .js-summary-name .js-default {
        margin-left: 6px;
        font-weight: normal;
        font-size: 10px;
        text-transform: uppercase;
        color: #4a6cf7;
        letter-spacing: 0.06em;
      }
      .js-del {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        background: transparent;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        cursor: pointer;
        color: #888;
        line-height: 1;
      }
      .js-del:hover {
        color: #b00020;
        border-color: #b00020;
      }
      .js-body {
        padding: 12px 16px;
        background: #fbfcfe;
      }
      .js-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .js-row label {
        color: #555;
      }
      .js-row input,
      .js-row select {
        width: 100%;
        min-width: 0;
        height: 26px;
        padding: 0 6px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font-family: inherit;
        font-size: 12px;
        background: #fff;
        box-sizing: border-box;
        line-height: 1;
      }
      .js-toggle-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .js-toggle-row .js-toggles {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .js-toggle-row .js-toggles label {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #fff;
        border: 1px solid #cfd3dc;
        padding: 3px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        color: #555;
        height: 26px;
        box-sizing: border-box;
      }
      .js-section-h {
        margin: 12px 0 6px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #888;
        font-weight: 600;
      }
      .js-color {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 30px;
        gap: 4px;
        align-items: center;
      }
      .js-color input[type='color'] {
        width: 30px;
        height: 26px;
        padding: 1px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        cursor: pointer;
        background: #fff;
        box-sizing: border-box;
      }
      .js-cond {
        border: 1px solid #d8dbe3;
        border-radius: 4px;
        padding: 8px 10px;
        margin-bottom: 8px;
        background: #fff;
      }
      .js-cond-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 22px;
        gap: 6px;
        align-items: center;
        margin-bottom: 6px;
      }
      .js-cond-head .js-cond-label {
        font-size: 10px;
        font-weight: 600;
        color: #4a6cf7;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .js-cond textarea {
        width: 100%;
        min-height: 36px;
        padding: 4px 6px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font: inherit;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
        background: #fff;
        box-sizing: border-box;
        resize: vertical;
        margin-bottom: 6px;
      }
      .js-add-cond {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: transparent;
        color: #4a6cf7;
        border: 1px dashed #4a6cf7;
        border-radius: 3px;
        padding: 4px 10px;
        font-size: 11px;
        font-family: inherit;
        cursor: pointer;
      }
      .js-add-cond:hover {
        background: #f5f8ff;
      }
    `,
  ],
  template: `
    <div class="js-toolbar">
      <button type="button" (click)="addStyle()">
        <lib-icon name="plus" [size]="12" /> Add style
      </button>
    </div>
    @if (styles().length === 0) {
      <div class="js-empty">No styles defined.</div>
    }
    @for (s of styles(); track s.name; let i = $index) {
      <details class="js-style">
        <summary>
          <span class="js-summary-name">
            {{ s.name || '(unnamed)' }}
            @if (s.isDefault) { <span class="js-default">default</span> }
          </span>
          <button type="button" class="js-del" (click)="remove(i, $event)" title="Delete style">
            <lib-icon name="x" [size]="12" />
          </button>
        </summary>
        <div class="js-body">
          <div class="js-row">
            <label>name</label>
            <input
              type="text"
              [ngModel]="s.name"
              (ngModelChange)="patch(i, { name: $event })"
            />
          </div>
          <div class="js-row">
            <label>parent</label>
            <select
              [ngModel]="s.parentStyle ?? ''"
              (ngModelChange)="patch(i, { parentStyle: $event || undefined })"
            >
              <option value="">(none)</option>
              @for (p of styles(); track p.name) {
                @if (p.name !== s.name) {
                  <option [value]="p.name">{{ p.name }}</option>
                }
              }
            </select>
          </div>
          <div class="js-toggle-row">
            <label>flags</label>
            <div class="js-toggles">
              <label>
                <input
                  type="checkbox"
                  [ngModel]="s.isDefault ?? false"
                  (ngModelChange)="setDefault(i, $event)"
                />
                default
              </label>
            </div>
          </div>

          <div class="js-section-h">Colors</div>
          <div class="js-row">
            <label>forecolor</label>
            <div class="js-color">
              <input
                type="text"
                placeholder="#000000"
                [ngModel]="s.forecolor ?? ''"
                (ngModelChange)="patch(i, { forecolor: $event || undefined })"
              />
              <input
                type="color"
                [ngModel]="s.forecolor || '#000000'"
                (ngModelChange)="patch(i, { forecolor: $event })"
              />
            </div>
          </div>
          <div class="js-row">
            <label>backcolor</label>
            <div class="js-color">
              <input
                type="text"
                placeholder="(transparent)"
                [ngModel]="s.backcolor ?? ''"
                (ngModelChange)="patch(i, { backcolor: $event || undefined })"
              />
              <input
                type="color"
                [ngModel]="s.backcolor || '#ffffff'"
                (ngModelChange)="patch(i, { backcolor: $event })"
              />
            </div>
          </div>
          <div class="js-row">
            <label>mode</label>
            <select
              [ngModel]="s.mode ?? ''"
              (ngModelChange)="patch(i, { mode: $event || undefined })"
            >
              <option value="">(default)</option>
              <option value="Opaque">Opaque</option>
              <option value="Transparent">Transparent</option>
            </select>
          </div>

          <div class="js-section-h">Font</div>
          <div class="js-row">
            <label>family</label>
            <input
              type="text"
              placeholder="SansSerif"
              [ngModel]="s.text?.fontName ?? ''"
              (ngModelChange)="patchText(i, { fontName: $event || undefined })"
            />
          </div>
          <div class="js-row">
            <label>size</label>
            <input
              type="number"
              [ngModel]="s.text?.size ?? null"
              (ngModelChange)="patchText(i, { size: toIntOrUndefined($event) })"
            />
          </div>
          <div class="js-toggle-row">
            <label>style</label>
            <div class="js-toggles">
              <label>
                <input
                  type="checkbox"
                  [ngModel]="s.text?.isBold ?? false"
                  (ngModelChange)="patchText(i, { isBold: $event })"
                />
                bold
              </label>
              <label>
                <input
                  type="checkbox"
                  [ngModel]="s.text?.isItalic ?? false"
                  (ngModelChange)="patchText(i, { isItalic: $event })"
                />
                italic
              </label>
              <label>
                <input
                  type="checkbox"
                  [ngModel]="s.text?.isUnderline ?? false"
                  (ngModelChange)="patchText(i, { isUnderline: $event })"
                />
                underline
              </label>
            </div>
          </div>
          <div class="js-row">
            <label>align</label>
            <select
              [ngModel]="s.text?.hTextAlign ?? ''"
              (ngModelChange)="patchText(i, { hTextAlign: $event || undefined })"
            >
              <option value="">(default)</option>
              <option value="Left">Left</option>
              <option value="Center">Center</option>
              <option value="Right">Right</option>
              <option value="Justified">Justified</option>
            </select>
          </div>

          <div class="js-section-h">Border</div>
          <div class="js-row">
            <label>width</label>
            <input
              type="number"
              step="0.5"
              placeholder="0"
              [ngModel]="s.pen?.lineWidth ?? null"
              (ngModelChange)="patchPen(i, { lineWidth: toNumOrUndefined($event) })"
            />
          </div>
          <div class="js-row">
            <label>style</label>
            <select
              [ngModel]="s.pen?.lineStyle ?? ''"
              (ngModelChange)="patchPen(i, { lineStyle: $event || undefined })"
            >
              <option value="">(default)</option>
              <option value="Solid">Solid</option>
              <option value="Dashed">Dashed</option>
              <option value="Dotted">Dotted</option>
              <option value="Double">Double</option>
            </select>
          </div>
          <div class="js-row">
            <label>color</label>
            <div class="js-color">
              <input
                type="text"
                placeholder="#000000"
                [ngModel]="s.pen?.lineColor ?? ''"
                (ngModelChange)="patchPen(i, { lineColor: $event || undefined })"
              />
              <input
                type="color"
                [ngModel]="s.pen?.lineColor || '#000000'"
                (ngModelChange)="patchPen(i, { lineColor: $event })"
              />
            </div>
          </div>

          <div class="js-section-h">Conditions</div>
          @for (c of s.conditionalStyles ?? []; track $index; let ci = $index) {
            <div class="js-cond">
              <div class="js-cond-head">
                <span class="js-cond-label">when #{{ ci + 1 }}</span>
                <button type="button" class="js-del" (click)="removeCondition(i, ci)" title="Remove condition">
                  <lib-icon name="x" [size]="12" />
                </button>
              </div>
              <lib-expression-input
                [multiline]="true"
                placeholder="Boolean expression — e.g. $F{amount} < 0"
                [value]="c.conditionExpression"
                (valueChange)="patchCondition(i, ci, { conditionExpression: $event })"
              />
              <div style="height: 6px;"></div>
              <div class="js-row">
                <label>forecolor</label>
                <div class="js-color">
                  <input
                    type="text"
                    placeholder="(inherit)"
                    [ngModel]="c.forecolor ?? ''"
                    (ngModelChange)="patchCondition(i, ci, { forecolor: $event || undefined })"
                  />
                  <input
                    type="color"
                    [ngModel]="c.forecolor || '#000000'"
                    (ngModelChange)="patchCondition(i, ci, { forecolor: $event })"
                  />
                </div>
              </div>
              <div class="js-row">
                <label>backcolor</label>
                <div class="js-color">
                  <input
                    type="text"
                    placeholder="(inherit)"
                    [ngModel]="c.backcolor ?? ''"
                    (ngModelChange)="patchCondition(i, ci, { backcolor: $event || undefined })"
                  />
                  <input
                    type="color"
                    [ngModel]="c.backcolor || '#ffffff'"
                    (ngModelChange)="patchCondition(i, ci, { backcolor: $event })"
                  />
                </div>
              </div>
              <div class="js-row">
                <label>mode</label>
                <select
                  [ngModel]="c.mode ?? ''"
                  (ngModelChange)="patchCondition(i, ci, { mode: $event || undefined })"
                >
                  <option value="">(inherit)</option>
                  <option value="Opaque">Opaque</option>
                  <option value="Transparent">Transparent</option>
                </select>
              </div>
              <div class="js-toggle-row">
                <label>style</label>
                <div class="js-toggles">
                  <label>
                    <input
                      type="checkbox"
                      [ngModel]="c.text?.isBold ?? false"
                      (ngModelChange)="patchConditionText(i, ci, { isBold: $event || undefined })"
                    />
                    bold
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      [ngModel]="c.text?.isItalic ?? false"
                      (ngModelChange)="patchConditionText(i, ci, { isItalic: $event || undefined })"
                    />
                    italic
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      [ngModel]="c.text?.isUnderline ?? false"
                      (ngModelChange)="patchConditionText(i, ci, { isUnderline: $event || undefined })"
                    />
                    underline
                  </label>
                </div>
              </div>
              <div class="js-row">
                <label>border w</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="(inherit)"
                  [ngModel]="c.pen?.lineWidth ?? null"
                  (ngModelChange)="patchConditionPen(i, ci, { lineWidth: toNumOrUndefined($event) })"
                />
              </div>
              <div class="js-row">
                <label>border c</label>
                <div class="js-color">
                  <input
                    type="text"
                    placeholder="(inherit)"
                    [ngModel]="c.pen?.lineColor ?? ''"
                    (ngModelChange)="patchConditionPen(i, ci, { lineColor: $event || undefined })"
                  />
                  <input
                    type="color"
                    [ngModel]="c.pen?.lineColor || '#000000'"
                    (ngModelChange)="patchConditionPen(i, ci, { lineColor: $event })"
                  />
                </div>
              </div>
            </div>
          }
          <button type="button" class="js-add-cond" (click)="addCondition(i)">
            <lib-icon name="plus" [size]="12" /> Add condition
          </button>
        </div>
      </details>
    }
  `,
})
export class JasperStylesComponent {
  private readonly store = inject(EditorStore);

  protected readonly styles = computed<Style[]>(() => this.store.report()?.styles ?? []);

  protected toIntOrUndefined(v: unknown): number | undefined {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }

  protected toNumOrUndefined(v: unknown): number | undefined {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  protected addStyle(): void {
    this.store.updateReport((r) => {
      const existing = r.styles ?? [];
      const name = uniqueName('Style', existing);
      return { ...r, styles: [...existing, { name }] };
    });
  }

  protected remove(i: number, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      styles.splice(i, 1);
      return { ...r, styles: styles.length > 0 ? styles : undefined };
    });
  }

  protected patch(i: number, patch: Partial<Style>): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      styles[i] = { ...styles[i], ...patch };
      return { ...r, styles };
    });
  }

  /** Toggle isDefault, ensuring at most one style is the default. */
  protected setDefault(i: number, on: boolean): void {
    this.store.updateReport((r) => {
      const styles = (r.styles ?? []).map((s, idx) => {
        if (idx === i) return { ...s, isDefault: on || undefined };
        return s.isDefault ? { ...s, isDefault: undefined } : s;
      });
      return { ...r, styles };
    });
  }

  protected patchText(i: number, patch: Partial<TextStyle>): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const merged: TextStyle = { ...styles[i].text, ...patch };
      const cleaned = stripUndefined(merged);
      styles[i] = { ...styles[i], text: cleaned };
      return { ...r, styles };
    });
  }

  protected patchPen(i: number, patch: Partial<Pen>): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const merged: Pen = { ...styles[i].pen, ...patch };
      const cleaned = stripUndefined(merged);
      styles[i] = { ...styles[i], pen: cleaned };
      return { ...r, styles };
    });
  }

  // ---------- Conditional styles ---------------------------------------------

  protected addCondition(i: number): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const list = [...(styles[i].conditionalStyles ?? []), { conditionExpression: '' } satisfies ConditionalStyle];
      styles[i] = { ...styles[i], conditionalStyles: list };
      return { ...r, styles };
    });
  }

  protected removeCondition(i: number, ci: number): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const list = [...(styles[i].conditionalStyles ?? [])];
      if (!list[ci]) return r;
      list.splice(ci, 1);
      styles[i] = {
        ...styles[i],
        conditionalStyles: list.length > 0 ? list : undefined,
      };
      return { ...r, styles };
    });
  }

  protected patchCondition(i: number, ci: number, patch: Partial<ConditionalStyle>): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const list = [...(styles[i].conditionalStyles ?? [])];
      const cur = list[ci];
      if (!cur) return r;
      list[ci] = { ...cur, ...patch };
      styles[i] = { ...styles[i], conditionalStyles: list };
      return { ...r, styles };
    });
  }

  protected patchConditionText(i: number, ci: number, patch: Partial<TextStyle>): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const list = [...(styles[i].conditionalStyles ?? [])];
      const cur = list[ci];
      if (!cur) return r;
      const merged: TextStyle = { ...cur.text, ...patch };
      const cleaned = stripUndefined(merged);
      list[ci] = { ...cur, text: cleaned };
      styles[i] = { ...styles[i], conditionalStyles: list };
      return { ...r, styles };
    });
  }

  protected patchConditionPen(i: number, ci: number, patch: Partial<Pen>): void {
    this.store.updateReport((r) => {
      const styles = [...(r.styles ?? [])];
      if (!styles[i]) return r;
      const list = [...(styles[i].conditionalStyles ?? [])];
      const cur = list[ci];
      if (!cur) return r;
      const merged: Pen = { ...cur.pen, ...patch };
      const cleaned = stripUndefined(merged);
      list[ci] = { ...cur, pen: cleaned };
      styles[i] = { ...styles[i], conditionalStyles: list };
      return { ...r, styles };
    });
  }
}

function uniqueName(prefix: string, existing: Style[]): string {
  const taken = new Set(existing.map((s) => s.name));
  for (let n = 1; n < 1000; n++) {
    const candidate = `${prefix}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${prefix}-${Date.now()}`;
}

function stripUndefined<T extends object>(obj: T): T | undefined {
  const out: Record<string, unknown> = {};
  let any = false;
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
    any = true;
  }
  return any ? (out as T) : undefined;
}
