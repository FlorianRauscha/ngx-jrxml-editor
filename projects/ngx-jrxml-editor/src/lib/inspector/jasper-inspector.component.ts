import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type {
  AnyElement,
  Barcode4jComponent,
  Barcode4jType,
  BarcodeElement,
  BoxBorders,
  CategoryDataset,
  CategorySeries,
  ChartElement,
  ChartType,
  CrosstabColumnGroup,
  CrosstabElement,
  CrosstabMeasure,
  CrosstabRowGroup,
  ElementCommon,
  FrameElement,
  ImageElement,
  LineElement,
  PieDataset,
  RectangleElement,
  StaticTextElement,
  SubreportElement,
  TextFieldElement,
} from '../model/element';
import type { Pen, Style, TextStyle } from '../model/style';
import { JasperIconComponent } from '../icon/jasper-icon.component';
import { ExpressionInputComponent } from './expression-input.component';
import { EditorStore } from '../state/editor-store';
import { resolveStyle } from '../state/style-resolver';
import { WORKSPACE_FILES_PROVIDER } from '../state/workspace-files-provider';

@Component({
  selector: 'lib-jasper-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgTemplateOutlet, JasperIconComponent, ExpressionInputComponent],
  styles: [
    `
      :host {
        display: block;
        background: #f7f8fb;
        border-left: 1px solid #d8dbe3;
        font-family: -apple-system, system-ui, sans-serif;
        font-size: 12px;
        height: 100%;
        overflow-y: auto;
      }
      .ji-empty {
        padding: 24px 16px;
        color: #888;
        text-align: center;
      }
      header {
        padding: 12px 16px;
        border-bottom: 1px solid #e1e4eb;
        font-weight: 600;
        background: #fff;
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ji-flag-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background: #fff;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        cursor: pointer;
        color: #555;
        padding: 0;
      }
      .ji-flag-btn:hover {
        background: #f3f5f9;
        border-color: #4a6cf7;
        color: #4a6cf7;
      }
      .ji-flag-btn.on {
        background: #4a6cf7;
        border-color: #4a6cf7;
        color: #fff;
      }
      .ji-flag-spacer {
        flex: 1;
      }
      .ji-kind {
        color: #4a6cf7;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
      }
      section {
        padding: 12px 16px;
        border-bottom: 1px solid #e1e4eb;
      }
      section h3 {
        margin: 0 0 8px 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #888;
        font-weight: 600;
      }
      .ji-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .ji-row label {
        color: #555;
      }
      .ji-row input,
      .ji-row select,
      .ji-row textarea {
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
      .ji-row select {
        appearance: none;
        -webkit-appearance: none;
        background-image:
          linear-gradient(45deg, transparent 50%, #888 50%),
          linear-gradient(-45deg, transparent 50%, #888 50%);
        background-position:
          calc(100% - 11px) center,
          calc(100% - 6px) center;
        background-size: 5px 5px, 5px 5px;
        background-repeat: no-repeat;
        padding-right: 22px;
      }
      .ji-row textarea {
        resize: vertical;
        height: auto;
        min-height: 48px;
        padding: 4px 6px;
        line-height: 1.4;
      }
      /* Pair two ji-rows in a single line (e.g., x/y, width/height) so the
         outer label still anchors at the section's left edge. */
      .ji-pair {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr) 32px minmax(0, 1fr);
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      .ji-pair > label {
        color: #555;
      }
      .ji-pair input,
      .ji-pair select {
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
      .ji-toggle-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .ji-toggle-row .ji-toggles {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .ji-toggle-row .ji-toggles label {
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
      .ji-toggle-row .ji-toggles input[type='checkbox'] {
        width: auto;
        height: auto;
        margin: 0;
      }
      .ji-color {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 30px;
        gap: 4px;
        align-items: center;
      }
      .ji-color input[type='color'] {
        width: 30px;
        height: 26px;
        padding: 1px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        cursor: pointer;
        background: #fff;
        box-sizing: border-box;
      }
    `,
  ],
  template: `
    @if (element(); as el) {
      <header>
        <span class="ji-kind">{{ el.kind }}</span>
        <span class="ji-flag-spacer"></span>
        <button
          type="button"
          class="ji-flag-btn"
          [class.on]="store.selectionLocked()"
          (click)="store.toggleSelectionLocked()"
          [title]="store.selectionLocked() ? 'Unlock' : 'Lock (prevents selection on canvas)'"
        >
          <lib-icon [name]="store.selectionLocked() ? 'lock' : 'unlock'" [size]="14" />
        </button>
        <button
          type="button"
          class="ji-flag-btn"
          [class.on]="store.selectionHidden()"
          (click)="store.toggleSelectionHidden()"
          [title]="store.selectionHidden() ? 'Show in editor' : 'Hide in editor (still rendered at runtime)'"
        >
          <lib-icon [name]="store.selectionHidden() ? 'eye-off' : 'eye'" [size]="14" />
        </button>
      </header>
      <section>
        <h3>Style</h3>
        <div class="ji-row">
          <label>style</label>
          <select
            [ngModel]="el.style ?? ''"
            (ngModelChange)="patchCommon({ style: $event || undefined })"
          >
            <option value="">(none)</option>
            @for (s of availableStyles(); track s.name) {
              <option [value]="s.name">{{ s.name }}{{ s.isDefault ? ' (default)' : '' }}</option>
            }
          </select>
        </div>
      </section>
      <section>
        <h3>Position</h3>
        <div class="ji-row">
          <label>x</label>
          <input
            type="number"
            [ngModel]="el.x"
            (ngModelChange)="patchCommon({ x: toInt($event) })"
          />
        </div>
        <div class="ji-row">
          <label>y</label>
          <input
            type="number"
            [ngModel]="el.y"
            (ngModelChange)="patchCommon({ y: toInt($event) })"
          />
        </div>
        <div class="ji-row">
          <label>width</label>
          <input
            type="number"
            [ngModel]="el.width"
            (ngModelChange)="patchCommon({ width: toInt($event) })"
          />
        </div>
        <div class="ji-row">
          <label>height</label>
          <input
            type="number"
            [ngModel]="el.height"
            (ngModelChange)="patchCommon({ height: toInt($event) })"
          />
        </div>
        <div class="ji-row">
          <label>forecolor</label>
          <div class="ji-color">
            <input
              type="text"
              [placeholder]="resolved()?.forecolor ?? '#000000'"
              [ngModel]="el.forecolor ?? ''"
              (ngModelChange)="patchCommon({ forecolor: $event || undefined })"
            />
            <input
              type="color"
              [ngModel]="el.forecolor || resolved()?.forecolor || '#000000'"
              (ngModelChange)="patchCommon({ forecolor: $event })"
            />
          </div>
        </div>
        <div class="ji-row">
          <label>backcolor</label>
          <div class="ji-color">
            <input
              type="text"
              [placeholder]="resolved()?.backcolor ?? '(transparent)'"
              [ngModel]="el.backcolor ?? ''"
              (ngModelChange)="patchCommon({ backcolor: $event || undefined })"
            />
            <input
              type="color"
              [ngModel]="el.backcolor || resolved()?.backcolor || '#ffffff'"
              (ngModelChange)="patchCommon({ backcolor: $event })"
            />
          </div>
        </div>
      </section>

      <section>
        <h3>Print When</h3>
        <div class="ji-row">
          <label>expression</label>
          <lib-expression-input
            [multiline]="true"
            placeholder="Boolean expression. Empty = always print."
            [value]="el.printWhenExpression ?? ''"
            (valueChange)="patchCommon({ printWhenExpression: $event || undefined })"
          />
        </div>
        <div class="ji-toggle-row">
          <label>flags</label>
          <div class="ji-toggles">
            <label>
              <input
                type="checkbox"
                [ngModel]="el.isPrintRepeatedValues ?? true"
                (ngModelChange)="patchCommon({ isPrintRepeatedValues: $event ? undefined : false })"
              />
              repeated values
            </label>
            <label>
              <input
                type="checkbox"
                [ngModel]="el.removeLineWhenBlank ?? false"
                (ngModelChange)="patchCommon({ removeLineWhenBlank: $event || undefined })"
              />
              remove blank line
            </label>
          </div>
        </div>
        <div class="ji-row">
          <label>print when group</label>
          <select
            [ngModel]="el.printWhenGroupChanges ?? ''"
            (ngModelChange)="patchCommon({ printWhenGroupChanges: $event || undefined })"
          >
            <option value="">(none)</option>
            @for (g of reportGroupNames(); track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>
      </section>

      @switch (el.kind) {
        @case ('staticText') {
          <section>
            <h3>Text</h3>
            <div class="ji-row">
              <label>content</label>
              <textarea
                [ngModel]="asStaticText(el).text"
                (ngModelChange)="patchStaticText({ text: $event })"
              ></textarea>
            </div>
          </section>
          @if (textStyleOf(el); as ts) {
            <ng-container *ngTemplateOutlet="fontTpl; context: { $implicit: ts }" />
          }
          <ng-container *ngTemplateOutlet="boxTpl; context: { $implicit: boxOf(el) }" />
        }
        @case ('break') {
          <section>
            <h3>Break</h3>
            <div class="ji-row">
              <label>type</label>
              <select
                [ngModel]="asBreak(el).type ?? 'Page'"
                (ngModelChange)="patchBreak({ type: $event })"
              >
                <option value="Page">Page</option>
                <option value="Column">Column</option>
              </select>
            </div>
          </section>
        }
        @case ('textField') {
          <section>
            <h3>Expression</h3>
            <div class="ji-row">
              <label>expression</label>
              <lib-expression-input
                [multiline]="true"
                [value]="asTextField(el).expression"
                (valueChange)="patchTextField({ expression: $event })"
              />
            </div>
            <div class="ji-row">
              <label>pattern</label>
              <input
                type="text"
                placeholder="e.g. #,##0.00"
                [ngModel]="asTextField(el).pattern ?? ''"
                (ngModelChange)="patchTextField({ pattern: $event || undefined })"
              />
            </div>
            <div class="ji-toggle-row">
              <label>flags</label>
              <div class="ji-toggles">
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asTextField(el).isStretchWithOverflow ?? false"
                    (ngModelChange)="patchTextField({ isStretchWithOverflow: $event })"
                  />
                  stretch
                </label>
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asTextField(el).isBlankWhenNull ?? false"
                    (ngModelChange)="patchTextField({ isBlankWhenNull: $event })"
                  />
                  blank if null
                </label>
              </div>
            </div>
            <div class="ji-row">
              <label>evaluate</label>
              <select
                [ngModel]="asTextField(el).evaluationTime ?? 'Now'"
                (ngModelChange)="patchTextField({ evaluationTime: $event })"
              >
                <option value="Now">Now</option>
                <option value="Report">Report</option>
                <option value="Page">Page</option>
                <option value="Column">Column</option>
                <option value="Group">Group</option>
                <option value="Band">Band</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
            @if (asTextField(el).evaluationTime === 'Group') {
              <div class="ji-row">
                <label>eval group</label>
                <select
                  [ngModel]="asTextField(el).evaluationGroup ?? ''"
                  (ngModelChange)="patchTextField({ evaluationGroup: $event || undefined })"
                >
                  <option value="">(none)</option>
                  @for (g of reportGroupNames(); track g) {
                    <option [value]="g">{{ g }}</option>
                  }
                </select>
              </div>
            }
          </section>
          @if (textStyleOf(el); as ts) {
            <ng-container *ngTemplateOutlet="fontTpl; context: { $implicit: ts }" />
          }
          <ng-container *ngTemplateOutlet="boxTpl; context: { $implicit: boxOf(el) }" />
          <ng-container *ngTemplateOutlet="hyperlinkTpl; context: { $implicit: asTextField(el) }" />
        }
        @case ('image') {
          <section>
            <h3>Image</h3>
            @if (imagePaths().length > 0) {
              <div class="ji-row">
                <label>workspace</label>
                <select
                  [ngModel]="''"
                  (ngModelChange)="onPickImage($event)"
                  title="Set the expression to one of the workspace image files"
                >
                  <option value="">(pick a file…)</option>
                  @for (p of imagePaths(); track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
            }
            <div class="ji-row">
              <label>expression</label>
              <lib-expression-input
                [multiline]="true"
                [value]="asImage(el).expression"
                (valueChange)="patchImage({ expression: $event })"
              />
            </div>
            <div class="ji-row">
              <label>scale</label>
              <select
                [ngModel]="asImage(el).scaleImage ?? ''"
                (ngModelChange)="patchImage({ scaleImage: $event || undefined })"
              >
                <option value="">(default)</option>
                <option value="Clip">Clip</option>
                <option value="FillFrame">FillFrame</option>
                <option value="RetainShape">RetainShape</option>
                <option value="RealHeight">RealHeight</option>
                <option value="RealSize">RealSize</option>
              </select>
            </div>
            <div class="ji-toggle-row">
              <label>flags</label>
              <div class="ji-toggles">
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asImage(el).isUsingCache ?? false"
                    (ngModelChange)="patchImage({ isUsingCache: $event || undefined })"
                  />
                  cache
                </label>
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asImage(el).isLazy ?? false"
                    (ngModelChange)="patchImage({ isLazy: $event || undefined })"
                  />
                  lazy
                </label>
              </div>
            </div>
            <div class="ji-row">
              <label>onError</label>
              <select
                [ngModel]="asImage(el).onErrorType ?? ''"
                (ngModelChange)="patchImage({ onErrorType: $event || undefined })"
              >
                <option value="">(default)</option>
                <option value="Error">Error</option>
                <option value="Blank">Blank</option>
                <option value="Icon">Icon</option>
              </select>
            </div>
          </section>
          <ng-container *ngTemplateOutlet="boxTpl; context: { $implicit: boxOf(el) }" />
          <ng-container *ngTemplateOutlet="hyperlinkTpl; context: { $implicit: asImage(el) }" />
        }
        @case ('frame') {
          <ng-container *ngTemplateOutlet="boxTpl; context: { $implicit: boxOf(el) }" />
        }
        @case ('line') {
          <section>
            <h3>Line</h3>
            <div class="ji-row">
              <label>direction</label>
              <select
                [ngModel]="asLine(el).direction ?? 'TopDown'"
                (ngModelChange)="patchLine({ direction: $event })"
              >
                <option value="TopDown">TopDown</option>
                <option value="BottomUp">BottomUp</option>
              </select>
            </div>
          </section>
        }
        @case ('rectangle') {
          <section>
            <h3>Rectangle</h3>
            <div class="ji-row">
              <label>radius</label>
              <input
                type="number"
                [ngModel]="asRectangle(el).radius ?? 0"
                (ngModelChange)="patchRectangle({ radius: toInt($event) || undefined })"
              />
            </div>
          </section>
        }
        @case ('subreport') {
          <section>
            <h3>Subreport</h3>
            @if (subreportPaths().length > 0) {
              <div class="ji-row">
                <label>workspace</label>
                <select
                  [ngModel]="''"
                  (ngModelChange)="onPickSubreport($event)"
                  title="Set the expression to one of the workspace jrxml files"
                >
                  <option value="">(pick a file…)</option>
                  @for (p of subreportPaths(); track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
            }
            <div class="ji-row">
              <label>expression</label>
              <lib-expression-input
                [multiline]="true"
                [value]="asSubreport(el).expression"
                (valueChange)="patchSubreport({ expression: $event })"
              />
            </div>
            <div class="ji-row">
              <label>params map</label>
              <lib-expression-input
                [multiline]="true"
                placeholder="Map<String,Object> expression"
                [value]="asSubreport(el).parametersMapExpression ?? ''"
                (valueChange)="patchSubreport({ parametersMapExpression: $event || undefined })"
              />
            </div>
            <div class="ji-row">
              <label>connection</label>
              <lib-expression-input
                [multiline]="true"
                placeholder="java.sql.Connection expression"
                [value]="asSubreport(el).connectionExpression ?? ''"
                (valueChange)="patchSubreport({ connectionExpression: $event || undefined })"
              />
            </div>
            <div class="ji-row">
              <label>data source</label>
              <lib-expression-input
                [multiline]="true"
                placeholder="JRDataSource expression"
                [value]="asSubreport(el).dataSourceExpression ?? ''"
                (valueChange)="patchSubreport({ dataSourceExpression: $event || undefined })"
              />
            </div>
            <div class="ji-toggle-row">
              <label>flags</label>
              <div class="ji-toggles">
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asSubreport(el).isUsingCache ?? false"
                    (ngModelChange)="patchSubreport({ isUsingCache: $event || undefined })"
                  />
                  cache
                </label>
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asSubreport(el).runToBottom ?? false"
                    (ngModelChange)="patchSubreport({ runToBottom: $event || undefined })"
                  />
                  run to bottom
                </label>
              </div>
            </div>
            <div class="ji-row">
              <label>overflow</label>
              <select
                [ngModel]="asSubreport(el).overflowType ?? ''"
                (ngModelChange)="patchSubreport({ overflowType: $event || undefined })"
              >
                <option value="">(default)</option>
                <option value="NoStretch">NoStretch</option>
                <option value="Stretch">Stretch</option>
              </select>
            </div>
          </section>
          <section>
            <h3>Parameters</h3>
            @for (sp of asSubreport(el).subreportParameters ?? []; track $index) {
              <div class="ji-pair">
                <label>name</label>
                <input
                  type="text"
                  [ngModel]="sp.name"
                  (ngModelChange)="updateSubParam($index, { name: $event })"
                />
                <button type="button" class="ji-flag-btn" title="Remove" (click)="removeSubParam($index)">
                  <lib-icon name="x" [size]="12" />
                </button>
                <lib-expression-input
                  placeholder="$P{...} or expression"
                  [value]="sp.expression"
                  (valueChange)="updateSubParam($index, { expression: $event })"
                />
              </div>
            }
            <button type="button" class="ji-flag-btn" title="Add parameter" (click)="addSubParam()" style="width: auto; padding: 0 10px; gap: 4px;">
              <lib-icon name="plus" [size]="12" /> Add parameter
            </button>
          </section>
        }
        @case ('crosstab') {
          <section>
            <h3>Crosstab</h3>
            <div class="ji-toggle-row">
              <label>flags</label>
              <div class="ji-toggles">
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asCrosstab(el).isRepeatColumnHeaders ?? false"
                    (ngModelChange)="patchCrosstab({ isRepeatColumnHeaders: $event || undefined })"
                  />
                  repeat col headers
                </label>
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asCrosstab(el).isRepeatRowHeaders ?? false"
                    (ngModelChange)="patchCrosstab({ isRepeatRowHeaders: $event || undefined })"
                  />
                  repeat row headers
                </label>
              </div>
            </div>
            <div class="ji-pair">
              <label>cell</label>
              <input
                type="number"
                placeholder="100"
                [ngModel]="asCrosstab(el).cellWidth ?? null"
                (ngModelChange)="patchCrosstab({ cellWidth: toIntOrUndefined($event) })"
              />
              <span>×</span>
              <input
                type="number"
                placeholder="24"
                [ngModel]="asCrosstab(el).cellHeight ?? null"
                (ngModelChange)="patchCrosstab({ cellHeight: toIntOrUndefined($event) })"
              />
            </div>
          </section>
          <section>
            <h3>Row groups</h3>
            @for (g of asCrosstab(el).rowGroups; track $index; let gi = $index) {
              <div style="border: 1px solid #d8dbe3; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #fff;">
                <div class="ji-pair">
                  <label>name</label>
                  <input
                    type="text"
                    [ngModel]="g.name"
                    (ngModelChange)="patchCrosstabRowGroup(gi, { name: $event })"
                  />
                  <button type="button" class="ji-flag-btn" title="Remove" (click)="removeCrosstabRowGroup(gi)">
                    <lib-icon name="x" [size]="12" />
                  </button>
                  <input
                    type="number"
                    [ngModel]="g.width"
                    (ngModelChange)="patchCrosstabRowGroup(gi, { width: toInt($event) })"
                  />
                </div>
                <div class="ji-row">
                  <label>bucket</label>
                  <lib-expression-input
                    placeholder="$F{...}"
                    [value]="g.bucket.expression"
                    (valueChange)="patchCrosstabRowGroupBucket(gi, { expression: $event })"
                  />
                </div>
                <div class="ji-row">
                  <label>class</label>
                  <input
                    type="text"
                    placeholder="java.lang.String"
                    [ngModel]="g.bucket.class ?? ''"
                    (ngModelChange)="patchCrosstabRowGroupBucket(gi, { class: $event || undefined })"
                  />
                </div>
                <div class="ji-row">
                  <label>total</label>
                  <select
                    [ngModel]="g.totalPosition ?? 'None'"
                    (ngModelChange)="patchCrosstabRowGroup(gi, { totalPosition: $event === 'None' ? undefined : $event })"
                  >
                    <option value="None">None</option>
                    <option value="Start">Start</option>
                    <option value="End">End</option>
                  </select>
                </div>
              </div>
            }
            <button type="button" class="ji-flag-btn" (click)="addCrosstabRowGroup()" style="width: auto; padding: 0 10px; gap: 4px;">
              <lib-icon name="plus" [size]="12" /> Add row group
            </button>
          </section>
          <section>
            <h3>Column groups</h3>
            @for (g of asCrosstab(el).columnGroups; track $index; let gi = $index) {
              <div style="border: 1px solid #d8dbe3; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #fff;">
                <div class="ji-pair">
                  <label>name</label>
                  <input
                    type="text"
                    [ngModel]="g.name"
                    (ngModelChange)="patchCrosstabColumnGroup(gi, { name: $event })"
                  />
                  <button type="button" class="ji-flag-btn" title="Remove" (click)="removeCrosstabColumnGroup(gi)">
                    <lib-icon name="x" [size]="12" />
                  </button>
                  <input
                    type="number"
                    [ngModel]="g.height"
                    (ngModelChange)="patchCrosstabColumnGroup(gi, { height: toInt($event) })"
                  />
                </div>
                <div class="ji-row">
                  <label>bucket</label>
                  <lib-expression-input
                    placeholder="$F{...}"
                    [value]="g.bucket.expression"
                    (valueChange)="patchCrosstabColumnGroupBucket(gi, { expression: $event })"
                  />
                </div>
                <div class="ji-row">
                  <label>class</label>
                  <input
                    type="text"
                    placeholder="java.lang.String"
                    [ngModel]="g.bucket.class ?? ''"
                    (ngModelChange)="patchCrosstabColumnGroupBucket(gi, { class: $event || undefined })"
                  />
                </div>
                <div class="ji-row">
                  <label>total</label>
                  <select
                    [ngModel]="g.totalPosition ?? 'None'"
                    (ngModelChange)="patchCrosstabColumnGroup(gi, { totalPosition: $event === 'None' ? undefined : $event })"
                  >
                    <option value="None">None</option>
                    <option value="Start">Start</option>
                    <option value="End">End</option>
                  </select>
                </div>
              </div>
            }
            <button type="button" class="ji-flag-btn" (click)="addCrosstabColumnGroup()" style="width: auto; padding: 0 10px; gap: 4px;">
              <lib-icon name="plus" [size]="12" /> Add column group
            </button>
          </section>
          <section>
            <h3>Measures</h3>
            @for (m of asCrosstab(el).measures; track $index; let mi = $index) {
              <div style="border: 1px solid #d8dbe3; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #fff;">
                <div class="ji-pair">
                  <label>name</label>
                  <input
                    type="text"
                    [ngModel]="m.name"
                    (ngModelChange)="patchCrosstabMeasure(mi, { name: $event })"
                  />
                  <button type="button" class="ji-flag-btn" title="Remove" (click)="removeCrosstabMeasure(mi)">
                    <lib-icon name="x" [size]="12" />
                  </button>
                  <input
                    type="text"
                    [ngModel]="m.class"
                    (ngModelChange)="patchCrosstabMeasure(mi, { class: $event })"
                  />
                </div>
                <div class="ji-row">
                  <label>calc</label>
                  <select
                    [ngModel]="m.calculation ?? 'Sum'"
                    (ngModelChange)="patchCrosstabMeasure(mi, { calculation: $event })"
                  >
                    <option value="Nothing">Nothing</option>
                    <option value="Count">Count</option>
                    <option value="DistinctCount">DistinctCount</option>
                    <option value="Sum">Sum</option>
                    <option value="Average">Average</option>
                    <option value="Lowest">Lowest</option>
                    <option value="Highest">Highest</option>
                    <option value="StandardDeviation">StandardDeviation</option>
                    <option value="Variance">Variance</option>
                    <option value="First">First</option>
                  </select>
                </div>
                <div class="ji-row">
                  <label>expression</label>
                  <lib-expression-input
                    placeholder="$F{...}"
                    [value]="m.expression"
                    (valueChange)="patchCrosstabMeasure(mi, { expression: $event })"
                  />
                </div>
              </div>
            }
            <button type="button" class="ji-flag-btn" (click)="addCrosstabMeasure()" style="width: auto; padding: 0 10px; gap: 4px;">
              <lib-icon name="plus" [size]="12" /> Add measure
            </button>
          </section>
          <section>
            <h3>Dataset run</h3>
            <div class="ji-row">
              <label>subDataset</label>
              <select
                [ngModel]="asCrosstab(el).datasetRun?.subDataset ?? ''"
                (ngModelChange)="setCrosstabSubDataset($event)"
              >
                <option value="">(report)</option>
                @for (sd of subDatasetNames(); track sd) {
                  <option [value]="sd">{{ sd }}</option>
                }
              </select>
            </div>
          </section>
        }
        @case ('chart') {
          <section>
            <h3>Chart</h3>
            <div class="ji-row">
              <label>type</label>
              <select
                [ngModel]="asChart(el).chartType"
                (ngModelChange)="setChartType($event)"
              >
                @for (t of chartTypes; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
            <div class="ji-row">
              <label>title</label>
              <lib-expression-input
                [multiline]="true"
                [value]="asChart(el).titleExpression ?? ''"
                (valueChange)="patchChart({ titleExpression: $event || undefined })"
              />
            </div>
            <div class="ji-row">
              <label>subtitle</label>
              <lib-expression-input
                [multiline]="true"
                [value]="asChart(el).subtitleExpression ?? ''"
                (valueChange)="patchChart({ subtitleExpression: $event || undefined })"
              />
            </div>
            <div class="ji-toggle-row">
              <label>flags</label>
              <div class="ji-toggles">
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="asChart(el).showLegend ?? true"
                    (ngModelChange)="patchChart({ showLegend: $event })"
                  />
                  legend
                </label>
              </div>
            </div>
          </section>
          @if (asChart(el).dataset.kind === 'pie') {
            <section>
              <h3>Pie Dataset</h3>
              <div class="ji-row">
                <label>key</label>
                <lib-expression-input
                  [multiline]="true"
                  [value]="asPieDataset(el).keyExpression"
                  (valueChange)="patchPieDataset({ keyExpression: $event })"
                />
              </div>
              <div class="ji-row">
                <label>value</label>
                <lib-expression-input
                  [multiline]="true"
                  [value]="asPieDataset(el).valueExpression"
                  (valueChange)="patchPieDataset({ valueExpression: $event })"
                />
              </div>
              <div class="ji-row">
                <label>label</label>
                <lib-expression-input
                  [multiline]="true"
                  [value]="asPieDataset(el).labelExpression ?? ''"
                  (valueChange)="patchPieDataset({ labelExpression: $event || undefined })"
                />
              </div>
            </section>
          } @else {
            <section>
              <h3>Category Dataset</h3>
              @for (s of asCategoryDataset(el).series; track $index; let si = $index) {
                <div class="ji-pair">
                  <label>series {{ si + 1 }}</label>
                  <lib-expression-input
                    placeholder="series name expr"
                    [value]="s.seriesExpression"
                    (valueChange)="updateChartSeries(si, { seriesExpression: $event })"
                  />
                  <button type="button" class="ji-flag-btn" title="Remove series" (click)="removeChartSeries(si)">
                    <lib-icon name="x" [size]="12" />
                  </button>
                  <lib-expression-input
                    placeholder="category expr"
                    [value]="s.categoryExpression"
                    (valueChange)="updateChartSeries(si, { categoryExpression: $event })"
                  />
                </div>
                <div class="ji-row">
                  <label>value {{ si + 1 }}</label>
                  <lib-expression-input
                    placeholder="value expr"
                    [value]="s.valueExpression"
                    (valueChange)="updateChartSeries(si, { valueExpression: $event })"
                  />
                </div>
              }
              <button type="button" class="ji-flag-btn" (click)="addChartSeries()" style="width: auto; padding: 0 10px; gap: 4px;">
                <lib-icon name="plus" [size]="12" /> Add series
              </button>
              <div class="ji-row" style="margin-top: 8px;">
                <label>cat axis</label>
                <input
                  type="text"
                  placeholder="X-axis label expression"
                  [ngModel]="asChart(el).categoryAxisLabelExpression ?? ''"
                  (ngModelChange)="patchChart({ categoryAxisLabelExpression: $event || undefined })"
                />
              </div>
              <div class="ji-row">
                <label>val axis</label>
                <input
                  type="text"
                  placeholder="Y-axis label expression"
                  [ngModel]="asChart(el).valueAxisLabelExpression ?? ''"
                  (ngModelChange)="patchChart({ valueAxisLabelExpression: $event || undefined })"
                />
              </div>
            </section>
          }
        }
        @case ('componentElement') {
          @if (asBarcode(el); as bc) {
            <section>
              <h3>Barcode</h3>
              <div class="ji-row">
                <label>type</label>
                <select
                  [ngModel]="bc.barcode.type"
                  (ngModelChange)="patchBarcode({ type: $event })"
                >
                  @for (t of barcodeTypes; track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
              <div class="ji-row">
                <label>code expr</label>
                <lib-expression-input
                  [multiline]="true"
                  [value]="bc.barcode.codeExpression"
                  (valueChange)="patchBarcode({ codeExpression: $event })"
                />
              </div>
              <div class="ji-row">
                <label>text pos</label>
                <select
                  [ngModel]="bc.barcode.textPosition ?? 'bottom'"
                  (ngModelChange)="patchBarcode({ textPosition: $event })"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div class="ji-row">
                <label>checksum</label>
                <select
                  [ngModel]="bc.barcode.checksumMode ?? ''"
                  (ngModelChange)="patchBarcode({ checksumMode: $event || undefined })"
                >
                  <option value="">(default)</option>
                  <option value="auto">auto</option>
                  <option value="add">add</option>
                  <option value="check">check</option>
                  <option value="ignore">ignore</option>
                </select>
              </div>
              <div class="ji-row">
                <label>module w</label>
                <input
                  type="number"
                  step="0.5"
                  [ngModel]="bc.barcode.moduleWidth ?? null"
                  (ngModelChange)="setBarcodeModuleWidth($event)"
                />
              </div>
              <div class="ji-row">
                <label>orient</label>
                <select
                  [ngModel]="bc.barcode.orientation ?? 0"
                  (ngModelChange)="setBarcodeOrientation($event)"
                >
                  <option [ngValue]="0">0°</option>
                  <option [ngValue]="90">90°</option>
                  <option [ngValue]="180">180°</option>
                  <option [ngValue]="270">270°</option>
                </select>
              </div>
              @if (bc.barcode.type === 'QRCode') {
                <div class="ji-row">
                  <label>QR ECL</label>
                  <select
                    [ngModel]="bc.barcode.errorCorrectionLevel ?? ''"
                    (ngModelChange)="patchBarcode({ errorCorrectionLevel: $event || undefined })"
                  >
                    <option value="">(default M)</option>
                    <option value="L">L (low)</option>
                    <option value="M">M (medium)</option>
                    <option value="Q">Q (quartile)</option>
                    <option value="H">H (high)</option>
                  </select>
                </div>
              }
              <div class="ji-row">
                <label>pattern</label>
                <input
                  type="text"
                  placeholder="optional pattern expression"
                  [ngModel]="bc.barcode.patternExpression ?? ''"
                  (ngModelChange)="patchBarcode({ patternExpression: $event || undefined })"
                />
              </div>
            </section>
          }
        }
      }
    } @else if (hasMultiSelection()) {
      <div class="ji-empty">
        <strong>{{ selectionCount() }} elements selected</strong>
        <p>Use the alignment toolbar to align or distribute them.<br />Click a single element to edit its properties.</p>
      </div>
    } @else {
      <div class="ji-empty">Select an element to edit its properties.</div>
    }

    <ng-template #hyperlinkTpl let-h>
      <section>
        <h3>Hyperlink</h3>
        <div class="ji-row">
          <label>type</label>
          <select
            [ngModel]="h.linkType ?? 'None'"
            (ngModelChange)="patchHyperlink({ linkType: $event === 'None' ? undefined : $event })"
          >
            <option value="None">None</option>
            <option value="Reference">Reference</option>
            <option value="LocalAnchor">LocalAnchor</option>
            <option value="LocalPage">LocalPage</option>
            <option value="RemoteAnchor">RemoteAnchor</option>
            <option value="RemotePage">RemotePage</option>
          </select>
        </div>
        @if (h.linkType && h.linkType !== 'None') {
          <div class="ji-row">
            <label>target</label>
            <select
              [ngModel]="h.linkTarget ?? 'Self'"
              (ngModelChange)="patchHyperlink({ linkTarget: $event === 'Self' ? undefined : $event })"
            >
              <option value="Self">Self</option>
              <option value="Blank">Blank</option>
              <option value="Top">Top</option>
              <option value="Parent">Parent</option>
            </select>
          </div>
          <div class="ji-row">
            <label>reference</label>
            <lib-expression-input
              [multiline]="true"
              placeholder="URL expression (Reference, RemoteAnchor, RemotePage)"
              [value]="h.hyperlinkReferenceExpression ?? ''"
              (valueChange)="patchHyperlink({ hyperlinkReferenceExpression: $event || undefined })"
            />
          </div>
          <div class="ji-row">
            <label>anchor</label>
            <lib-expression-input
              [multiline]="true"
              placeholder="Anchor expression (LocalAnchor, RemoteAnchor)"
              [value]="h.hyperlinkAnchorExpression ?? ''"
              (valueChange)="patchHyperlink({ hyperlinkAnchorExpression: $event || undefined })"
            />
          </div>
          <div class="ji-row">
            <label>page</label>
            <lib-expression-input
              [multiline]="true"
              placeholder="Page number expression (LocalPage, RemotePage)"
              [value]="h.hyperlinkPageExpression ?? ''"
              (valueChange)="patchHyperlink({ hyperlinkPageExpression: $event || undefined })"
            />
          </div>
          <div class="ji-row">
            <label>tooltip</label>
            <lib-expression-input
              [multiline]="true"
              placeholder="Tooltip expression"
              [value]="h.hyperlinkTooltipExpression ?? ''"
              (valueChange)="patchHyperlink({ hyperlinkTooltipExpression: $event || undefined })"
            />
          </div>
          <div class="ji-row">
            <label>when</label>
            <lib-expression-input
              [multiline]="true"
              placeholder="Boolean expression — empty = always"
              [value]="h.hyperlinkWhenExpression ?? ''"
              (valueChange)="patchHyperlink({ hyperlinkWhenExpression: $event || undefined })"
            />
          </div>
        }
      </section>
    </ng-template>

    <ng-template #fontTpl let-ts>
      <section>
      <h3>Font</h3>
      <div class="ji-row">
        <label>family</label>
        <input
          type="text"
          [placeholder]="resolvedText()?.fontName ?? 'SansSerif'"
          [ngModel]="ts.fontName ?? ''"
          (ngModelChange)="patchTextStyle({ fontName: $event || undefined })"
        />
      </div>
      <div class="ji-row">
        <label>size</label>
        <input
          type="number"
          [placeholder]="resolvedText()?.size ?? ''"
          [ngModel]="ts.size ?? null"
          (ngModelChange)="patchTextStyle({ size: toInt($event) || undefined })"
        />
      </div>
      <div class="ji-toggle-row">
        <label>style</label>
        <div class="ji-toggles">
          <label>
            <input
              type="checkbox"
              [ngModel]="ts.isBold ?? false"
              (ngModelChange)="patchTextStyle({ isBold: $event })"
            />
            bold
          </label>
          <label>
            <input
              type="checkbox"
              [ngModel]="ts.isItalic ?? false"
              (ngModelChange)="patchTextStyle({ isItalic: $event })"
            />
            italic
          </label>
          <label>
            <input
              type="checkbox"
              [ngModel]="ts.isUnderline ?? false"
              (ngModelChange)="patchTextStyle({ isUnderline: $event })"
            />
            underline
          </label>
        </div>
      </div>
      <div class="ji-row">
        <label>align</label>
        <select
          [ngModel]="ts.hTextAlign ?? ''"
          (ngModelChange)="patchTextStyle({ hTextAlign: $event || undefined })"
        >
          <option value="">{{ resolvedAlignLabel() }}</option>
          <option value="Left">Left</option>
          <option value="Center">Center</option>
          <option value="Right">Right</option>
          <option value="Justified">Justified</option>
        </select>
      </div>
      </section>
    </ng-template>

    <ng-template #boxTpl let-box>
      <section>
      <h3>Box</h3>
      <div class="ji-row">
        <label>padding</label>
        <input
          type="number"
          placeholder="0"
          [ngModel]="box?.padding ?? null"
          (ngModelChange)="patchBox({ padding: toIntOrUndefined($event) })"
        />
      </div>
      <div class="ji-pair">
        <label>top/right</label>
        <input
          type="number"
          [placeholder]="box?.padding ?? '0'"
          [ngModel]="box?.topPadding ?? null"
          (ngModelChange)="patchBox({ topPadding: toIntOrUndefined($event) })"
        />
        <span></span>
        <input
          type="number"
          [placeholder]="box?.padding ?? '0'"
          [ngModel]="box?.rightPadding ?? null"
          (ngModelChange)="patchBox({ rightPadding: toIntOrUndefined($event) })"
        />
      </div>
      <div class="ji-pair">
        <label>bottom/left</label>
        <input
          type="number"
          [placeholder]="box?.padding ?? '0'"
          [ngModel]="box?.bottomPadding ?? null"
          (ngModelChange)="patchBox({ bottomPadding: toIntOrUndefined($event) })"
        />
        <span></span>
        <input
          type="number"
          [placeholder]="box?.padding ?? '0'"
          [ngModel]="box?.leftPadding ?? null"
          (ngModelChange)="patchBox({ leftPadding: toIntOrUndefined($event) })"
        />
      </div>
      <div class="ji-row">
        <label>border w</label>
        <input
          type="number"
          step="0.5"
          placeholder="0"
          [ngModel]="box?.pen?.lineWidth ?? null"
          (ngModelChange)="patchBoxPen({ lineWidth: toNumOrUndefined($event) })"
        />
      </div>
      <div class="ji-row">
        <label>border</label>
        <select
          [ngModel]="box?.pen?.lineStyle ?? ''"
          (ngModelChange)="patchBoxPen({ lineStyle: $event || undefined })"
        >
          <option value="">(default)</option>
          <option value="Solid">Solid</option>
          <option value="Dashed">Dashed</option>
          <option value="Dotted">Dotted</option>
          <option value="Double">Double</option>
        </select>
      </div>
      <div class="ji-row">
        <label>border c</label>
        <div class="ji-color">
          <input
            type="text"
            placeholder="#000000"
            [ngModel]="box?.pen?.lineColor ?? ''"
            (ngModelChange)="patchBoxPen({ lineColor: $event || undefined })"
          />
          <input
            type="color"
            [ngModel]="box?.pen?.lineColor || '#000000'"
            (ngModelChange)="patchBoxPen({ lineColor: $event })"
          />
        </div>
      </div>
      </section>
    </ng-template>
  `,
})
export class JasperInspectorComponent {
  protected readonly store = inject(EditorStore);
  private readonly filesProvider = inject(WORKSPACE_FILES_PROVIDER, { optional: true });

  /** Workspace jrxml paths surfaced to the subreport picker. Empty when the
   *  host hasn't provided WORKSPACE_FILES_PROVIDER. */
  protected readonly subreportPaths = computed<readonly string[]>(() => {
    const list = this.filesProvider?.list('jrxml');
    return list ? list().map((f) => f.path) : [];
  });

  /** Workspace image paths surfaced to the image picker. */
  protected readonly imagePaths = computed<readonly string[]>(() => {
    const list = this.filesProvider?.list('image');
    return list ? list().map((f) => f.path) : [];
  });

  /** Translate the picker's selected path into a JR string-literal expression. */
  protected onPickSubreport(path: string): void {
    if (!path) return;
    const expression = `"${path}"`;
    this.store.updateSelected((el) => {
      if (el.kind !== 'subreport') return el;
      return { ...el, expression };
    });
  }

  protected onPickImage(path: string): void {
    if (!path) return;
    const expression = `"${path}"`;
    this.store.updateSelected((el) => {
      if (el.kind !== 'image') return el;
      return { ...el, expression };
    });
  }

  /** elementGroup has no geometry of its own and isn't editable here. */
  protected readonly element = computed<Exclude<AnyElement, { kind: 'elementGroup' }> | null>(
    () => {
      // Multi-selection: hide the per-element editor in favor of the summary
      // panel; users edit individual properties by selecting a single element.
      if (this.store.hasMultiSelection()) return null;
      const e = this.store.selectedElement();
      if (!e || e.kind === 'elementGroup') return null;
      return e;
    },
  );

  protected readonly hasMultiSelection = computed(() => this.store.hasMultiSelection());
  protected readonly selectionCount = computed(() => this.store.selectionCount());

  protected readonly availableStyles = computed<Style[]>(() => this.store.report()?.styles ?? []);

  protected readonly reportGroupNames = computed<readonly string[]>(
    () => (this.store.report()?.groups ?? []).map((g) => g.name).filter((n) => !!n),
  );

  protected readonly subDatasetNames = computed<readonly string[]>(
    () => (this.store.report()?.subDatasets ?? []).map((d) => d.name).filter((n) => !!n),
  );

  /** Resolved style chain for the current element, or undefined when no element / no styles. */
  protected readonly resolved = computed<Style | undefined>(() => {
    const el = this.element();
    if (!el) return undefined;
    return resolveStyle(el.style, this.store.report()?.styles);
  });

  /** Resolved TextStyle (font + text), used to drive inspector placeholders. */
  protected readonly resolvedText = computed<TextStyle | undefined>(() => {
    const r = this.resolved();
    if (!r?.font && !r?.text) return undefined;
    return { ...r.font, ...r.text };
  });

  protected readonly resolvedAlignLabel = computed<string>(() => {
    const a = this.resolvedText()?.hTextAlign;
    return a ? `inherited (${a})` : '(default)';
  });

  protected toInt(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

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

  protected patchCommon(patch: Partial<ElementCommon>): void {
    this.store.updateSelected((el) => ({ ...el, ...patch }));
  }

  protected patchStaticText(patch: Partial<StaticTextElement>): void {
    this.store.updateSelected<StaticTextElement>((el) => ({ ...el, ...patch }));
  }

  protected patchTextField(patch: Partial<TextFieldElement>): void {
    this.store.updateSelected<TextFieldElement>((el) => ({ ...el, ...patch }));
  }

  protected patchImage(patch: Partial<ImageElement>): void {
    this.store.updateSelected<ImageElement>((el) => ({ ...el, ...patch }));
  }

  protected patchLine(patch: Partial<LineElement>): void {
    this.store.updateSelected<LineElement>((el) => ({ ...el, ...patch }));
  }

  protected patchRectangle(patch: Partial<RectangleElement>): void {
    this.store.updateSelected<RectangleElement>((el) => ({ ...el, ...patch }));
  }

  protected patchSubreport(patch: Partial<SubreportElement>): void {
    this.store.updateSelected<SubreportElement>((el) => ({ ...el, ...patch }));
  }

  protected patchBreak(patch: { type?: 'Page' | 'Column' }): void {
    this.store.updateSelected((el) => {
      if (el.kind !== 'break') return el;
      return { ...el, ...patch };
    });
  }

  /** Hyperlink fields are shared across textField and image — write whichever
   *  matches the currently-selected element. */
  protected patchHyperlink(patch: Partial<TextFieldElement>): void {
    this.store.updateSelected((el) => {
      if (el.kind !== 'textField' && el.kind !== 'image') return el;
      return { ...el, ...patch } as typeof el;
    });
  }

  protected addSubParam(): void {
    this.store.updateSelected<SubreportElement>((el) => {
      const list = [...(el.subreportParameters ?? []), { name: '', expression: '' }];
      return { ...el, subreportParameters: list };
    });
  }

  protected removeSubParam(index: number): void {
    this.store.updateSelected<SubreportElement>((el) => {
      const list = [...(el.subreportParameters ?? [])];
      list.splice(index, 1);
      return { ...el, subreportParameters: list.length > 0 ? list : undefined };
    });
  }

  protected updateSubParam(index: number, patch: { name?: string; expression?: string }): void {
    this.store.updateSelected<SubreportElement>((el) => {
      const list = [...(el.subreportParameters ?? [])];
      const cur = list[index];
      if (!cur) return el;
      list[index] = { ...cur, ...patch };
      return { ...el, subreportParameters: list };
    });
  }

  protected patchTextStyle(patch: Partial<TextStyle>): void {
    this.store.updateSelected((el) => {
      if (el.kind !== 'staticText' && el.kind !== 'textField') return el;
      return { ...el, textStyle: { ...el.textStyle, ...patch } };
    });
  }

  protected asStaticText(el: AnyElement): StaticTextElement {
    return el as StaticTextElement;
  }
  protected asTextField(el: AnyElement): TextFieldElement {
    return el as TextFieldElement;
  }
  protected asImage(el: AnyElement): ImageElement {
    return el as ImageElement;
  }
  protected asLine(el: AnyElement): LineElement {
    return el as LineElement;
  }
  protected asRectangle(el: AnyElement): RectangleElement {
    return el as RectangleElement;
  }
  protected asSubreport(el: AnyElement): SubreportElement {
    return el as SubreportElement;
  }
  protected asBreak(el: AnyElement): import('../model/element').BreakElement {
    return el as import('../model/element').BreakElement;
  }

  protected readonly barcodeTypes: Barcode4jType[] = [
    'Code128', 'Code39', 'EAN13', 'EAN8', 'UPCA', 'UPCE',
    'Codabar', 'Interleaved2Of5', 'POSTNET',
    'QRCode', 'DataMatrix', 'PDF417',
    'RoyalMailCustomer', 'USPSIntelligentMail',
  ];

  protected asBarcode(el: AnyElement): BarcodeElement | null {
    if (el.kind === 'componentElement' && el.componentKind === 'barcode4j') return el;
    return null;
  }

  protected readonly chartTypes: ChartType[] = [
    'pieChart', 'pie3DChart',
    'barChart', 'bar3DChart', 'stackedBarChart',
    'lineChart',
    'areaChart', 'stackedAreaChart',
  ];

  protected asChart(el: AnyElement): ChartElement {
    return el as ChartElement;
  }
  protected asPieDataset(el: AnyElement): PieDataset {
    return (el as ChartElement).dataset as PieDataset;
  }
  protected asCategoryDataset(el: AnyElement): CategoryDataset {
    return (el as ChartElement).dataset as CategoryDataset;
  }

  protected patchChart(patch: Partial<ChartElement>): void {
    this.store.updateSelected<ChartElement>((el) => ({ ...el, ...patch }));
  }

  /** Switching chart type may need to swap dataset shape (pie ↔ category). */
  protected setChartType(t: ChartType): void {
    this.store.updateSelected<ChartElement>((el) => {
      const isPie = t === 'pieChart' || t === 'pie3DChart';
      const wasPie = el.dataset.kind === 'pie';
      if (isPie === wasPie) return { ...el, chartType: t };
      const dataset: ChartElement['dataset'] = isPie
        ? { kind: 'pie', keyExpression: '$F{key}', valueExpression: '$F{value}' }
        : {
            kind: 'category',
            series: [{
              seriesExpression: '"Series 1"',
              categoryExpression: '$F{category}',
              valueExpression: '$F{value}',
            }],
          };
      return { ...el, chartType: t, dataset };
    });
  }

  protected patchPieDataset(patch: Partial<PieDataset>): void {
    this.store.updateSelected<ChartElement>((el) => {
      if (el.dataset.kind !== 'pie') return el;
      return { ...el, dataset: { ...el.dataset, ...patch } };
    });
  }

  protected addChartSeries(): void {
    this.store.updateSelected<ChartElement>((el) => {
      if (el.dataset.kind !== 'category') return el;
      const series = [...el.dataset.series, {
        seriesExpression: `"Series ${el.dataset.series.length + 1}"`,
        categoryExpression: '$F{category}',
        valueExpression: '$F{value}',
      }];
      return { ...el, dataset: { ...el.dataset, series } };
    });
  }

  protected removeChartSeries(index: number): void {
    this.store.updateSelected<ChartElement>((el) => {
      if (el.dataset.kind !== 'category') return el;
      const series = [...el.dataset.series];
      series.splice(index, 1);
      return { ...el, dataset: { ...el.dataset, series } };
    });
  }

  protected updateChartSeries(index: number, patch: Partial<CategorySeries>): void {
    this.store.updateSelected<ChartElement>((el) => {
      if (el.dataset.kind !== 'category') return el;
      const series = [...el.dataset.series];
      const cur = series[index];
      if (!cur) return el;
      series[index] = { ...cur, ...patch };
      return { ...el, dataset: { ...el.dataset, series } };
    });
  }

  // ---------- Crosstab editors --------------------------------------------

  protected asCrosstab(el: AnyElement): CrosstabElement {
    return el as CrosstabElement;
  }

  protected patchCrosstab(patch: Partial<CrosstabElement>): void {
    this.store.updateSelected<CrosstabElement>((el) => ({ ...el, ...patch }));
  }

  protected addCrosstabRowGroup(): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.rowGroups, {
        name: `Row${el.rowGroups.length + 1}`,
        width: 100,
        bucket: { class: 'java.lang.String', expression: '$F{}' },
      }];
      return { ...el, rowGroups: next };
    });
  }

  protected removeCrosstabRowGroup(index: number): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.rowGroups];
      next.splice(index, 1);
      return { ...el, rowGroups: next };
    });
  }

  protected patchCrosstabRowGroup(index: number, patch: Partial<CrosstabRowGroup>): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.rowGroups];
      const cur = next[index];
      if (!cur) return el;
      next[index] = { ...cur, ...patch };
      return { ...el, rowGroups: next };
    });
  }

  protected patchCrosstabRowGroupBucket(
    index: number,
    patch: Partial<CrosstabRowGroup['bucket']>,
  ): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.rowGroups];
      const cur = next[index];
      if (!cur) return el;
      next[index] = { ...cur, bucket: { ...cur.bucket, ...patch } };
      return { ...el, rowGroups: next };
    });
  }

  protected addCrosstabColumnGroup(): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.columnGroups, {
        name: `Col${el.columnGroups.length + 1}`,
        height: 24,
        bucket: { class: 'java.lang.String', expression: '$F{}' },
      }];
      return { ...el, columnGroups: next };
    });
  }

  protected removeCrosstabColumnGroup(index: number): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.columnGroups];
      next.splice(index, 1);
      return { ...el, columnGroups: next };
    });
  }

  protected patchCrosstabColumnGroup(index: number, patch: Partial<CrosstabColumnGroup>): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.columnGroups];
      const cur = next[index];
      if (!cur) return el;
      next[index] = { ...cur, ...patch };
      return { ...el, columnGroups: next };
    });
  }

  protected patchCrosstabColumnGroupBucket(
    index: number,
    patch: Partial<CrosstabColumnGroup['bucket']>,
  ): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.columnGroups];
      const cur = next[index];
      if (!cur) return el;
      next[index] = { ...cur, bucket: { ...cur.bucket, ...patch } };
      return { ...el, columnGroups: next };
    });
  }

  protected addCrosstabMeasure(): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.measures, {
        name: `Measure${el.measures.length + 1}`,
        class: 'java.lang.Double',
        calculation: 'Sum' as const,
        expression: '$F{}',
      }];
      return { ...el, measures: next };
    });
  }

  protected removeCrosstabMeasure(index: number): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.measures];
      next.splice(index, 1);
      return { ...el, measures: next };
    });
  }

  protected patchCrosstabMeasure(index: number, patch: Partial<CrosstabMeasure>): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      const next = [...el.measures];
      const cur = next[index];
      if (!cur) return el;
      next[index] = { ...cur, ...patch };
      return { ...el, measures: next };
    });
  }

  protected setCrosstabSubDataset(name: string): void {
    this.store.updateSelected<CrosstabElement>((el) => {
      if (!name) return { ...el, datasetRun: undefined };
      const datasetRun = { ...(el.datasetRun ?? { subDataset: '' }), subDataset: name };
      return { ...el, datasetRun };
    });
  }

  protected patchBarcode(patch: Partial<Barcode4jComponent>): void {
    this.store.updateSelected<BarcodeElement>((el) => ({
      ...el,
      barcode: { ...el.barcode, ...patch },
    }));
  }

  protected setBarcodeModuleWidth(v: unknown): void {
    const n = Number(v);
    this.patchBarcode({ moduleWidth: Number.isFinite(n) && n > 0 ? n : undefined });
  }

  protected setBarcodeOrientation(v: unknown): void {
    const n = Number(v);
    const allowed = [0, 90, 180, 270] as const;
    const o = (allowed.find((a) => a === n) ?? 0) as Barcode4jComponent['orientation'];
    this.patchBarcode({ orientation: o });
  }

  protected textStyleOf(el: AnyElement): TextStyle | null {
    if (el.kind === 'staticText' || el.kind === 'textField') return el.textStyle ?? {};
    return null;
  }

  protected boxOf(el: AnyElement): BoxBorders | undefined {
    switch (el.kind) {
      case 'staticText':
      case 'textField':
      case 'image':
      case 'frame':
        return (el as StaticTextElement | TextFieldElement | ImageElement | FrameElement).box;
      default:
        return undefined;
    }
  }

  protected patchBox(patch: Partial<BoxBorders>): void {
    this.store.updateSelected((el) => {
      if (!('box' in el)) return el;
      const next: BoxBorders = { ...(el.box ?? {}), ...patch };
      const cleaned = stripUndefined(next);
      return { ...el, box: cleaned };
    });
  }

  protected patchBoxPen(patch: Partial<Pen>): void {
    this.store.updateSelected((el) => {
      if (!('box' in el)) return el;
      const pen: Pen = { ...(el.box?.pen ?? {}), ...patch };
      const cleanedPen = stripUndefined(pen);
      const next: BoxBorders = { ...(el.box ?? {}), pen: cleanedPen };
      return { ...el, box: stripUndefined(next) };
    });
  }
}

function stripUndefined<T extends object>(obj: T): T | undefined {
  const out: Record<string, unknown> = {};
  let any = false;
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
    any = true;
  }
  return any ? (out as T) : undefined;
}
