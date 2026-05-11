import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JasperIconComponent } from '../icon/jasper-icon.component';
import type { Field, Parameter, Variable } from '../model/dataset';
import { EditorStore } from '../state/editor-store';

/** MIME for dragging a data binding (field/parameter/variable) onto the canvas.
 *  Payload is JSON: `{ kind: 'F' | 'P' | 'V'; name: string }`. The canvas band
 *  drop handler turns it into a textField with `$F{name}` / `$P{name}` / `$V{name}`. */
export const DATA_BINDING_DRAG_MIME = 'application/x-jasper-data-binding';

export interface DataBindingDragPayload {
  kind: 'F' | 'P' | 'V';
  name: string;
}

const COMMON_CLASSES = [
  'java.lang.String',
  'java.lang.Integer',
  'java.lang.Long',
  'java.lang.Double',
  'java.math.BigDecimal',
  'java.lang.Boolean',
  'java.util.Date',
  'java.sql.Date',
  'java.sql.Timestamp',
];

@Component({
  selector: 'lib-jasper-datasource',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, JasperIconComponent],
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
      section {
        padding: 12px 16px;
        border-bottom: 1px solid #e1e4eb;
      }
      h3 {
        margin: 0 0 8px 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #888;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      h3 button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #4a6cf7;
        color: #fff;
        border: none;
        border-radius: 3px;
        padding: 3px 8px;
        font-size: 11px;
        font-family: inherit;
        cursor: pointer;
        line-height: 1;
      }
      .ds-row {
        display: grid;
        grid-template-columns: 22px minmax(0, 1fr) minmax(0, 1fr) 22px;
        gap: 4px;
        margin-bottom: 4px;
      }
      .ds-grip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 22px;
        background: #eef0f4;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        cursor: grab;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 9px;
        font-weight: 700;
        color: #4a6cf7;
        user-select: none;
      }
      .ds-grip:active { cursor: grabbing; }
      .ds-grip:hover {
        background: #4a6cf7;
        color: #fff;
        border-color: #4a6cf7;
      }
      input,
      select {
        width: 100%;
        padding: 3px 6px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font-family: inherit;
        font-size: 11px;
        background: #fff;
        min-width: 0;
        box-sizing: border-box;
      }
      .ds-del {
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
      .ds-del:hover {
        color: #b00020;
        border-color: #b00020;
      }
      .ds-empty {
        color: #aaa;
        font-style: italic;
        padding: 4px 0;
      }
    `,
  ],
  template: `
    <section>
      <h3>
        Fields
        <button type="button" (click)="addField()"><lib-icon name="plus" [size]="12" /> Add</button>
      </h3>
      @if (fields().length === 0) {
        <div class="ds-empty">No fields defined</div>
      }
      @for (f of fields(); track $index; let i = $index) {
        <div class="ds-row">
          <span
            class="ds-grip"
            draggable="true"
            (dragstart)="onBindingDragStart($event, 'F', f.name)"
            title="Drag onto the canvas to create a textField bound to $F{ {{ f.name }} }"
          >$F</span>
          <input
            type="text"
            placeholder="name"
            [ngModel]="f.name"
            (ngModelChange)="updateField(i, { name: $event })"
          />
          <select
            [ngModel]="f.class"
            (ngModelChange)="updateField(i, { class: $event })"
          >
            @for (c of classes; track c) {
              <option [value]="c">{{ shortClass(c) }}</option>
            }
          </select>
          <button type="button" class="ds-del" (click)="removeField(i)"><lib-icon name="x" [size]="12" /></button>
        </div>
      }
    </section>

    <section>
      <h3>
        Parameters
        <button type="button" (click)="addParameter()"><lib-icon name="plus" [size]="12" /> Add</button>
      </h3>
      @if (parameters().length === 0) {
        <div class="ds-empty">No parameters defined</div>
      }
      @for (p of parameters(); track $index; let i = $index) {
        <div class="ds-row">
          <span
            class="ds-grip"
            draggable="true"
            (dragstart)="onBindingDragStart($event, 'P', p.name)"
            title="Drag onto the canvas to create a textField bound to $P{ {{ p.name }} }"
          >$P</span>
          <input
            type="text"
            placeholder="name"
            [ngModel]="p.name"
            (ngModelChange)="updateParameter(i, { name: $event })"
          />
          <select
            [ngModel]="p.class"
            (ngModelChange)="updateParameter(i, { class: $event })"
          >
            @for (c of classes; track c) {
              <option [value]="c">{{ shortClass(c) }}</option>
            }
          </select>
          <button type="button" class="ds-del" (click)="removeParameter(i)"><lib-icon name="x" [size]="12" /></button>
        </div>
      }
    </section>

    <section>
      <h3>
        Variables
        <button type="button" (click)="addVariable()"><lib-icon name="plus" [size]="12" /> Add</button>
      </h3>
      @if (variables().length === 0) {
        <div class="ds-empty">No variables defined</div>
      }
      @for (v of variables(); track $index; let i = $index) {
        <div class="ds-row">
          <span
            class="ds-grip"
            draggable="true"
            (dragstart)="onBindingDragStart($event, 'V', v.name)"
            title="Drag onto the canvas to create a textField bound to $V{ {{ v.name }} }"
          >$V</span>
          <input
            type="text"
            placeholder="name"
            [ngModel]="v.name"
            (ngModelChange)="updateVariable(i, { name: $event })"
          />
          <select
            [ngModel]="v.class"
            (ngModelChange)="updateVariable(i, { class: $event })"
          >
            @for (c of classes; track c) {
              <option [value]="c">{{ shortClass(c) }}</option>
            }
          </select>
          <button type="button" class="ds-del" (click)="removeVariable(i)"><lib-icon name="x" [size]="12" /></button>
        </div>
      }
    </section>
  `,
})
export class JasperDataSourceComponent {
  private readonly store = inject(EditorStore);
  protected readonly classes = COMMON_CLASSES;

  protected readonly fields = computed<Field[]>(() => this.store.report()?.fields ?? []);
  protected readonly parameters = computed<Parameter[]>(() => this.store.report()?.parameters ?? []);
  protected readonly variables = computed<Variable[]>(() => this.store.report()?.variables ?? []);

  protected shortClass(c: string): string {
    return c.replace(/^java\.(lang|util|sql|math)\./, '');
  }

  protected onBindingDragStart(event: DragEvent, kind: 'F' | 'P' | 'V', name: string): void {
    if (!event.dataTransfer) return;
    if (!name) {
      event.preventDefault();
      return;
    }
    const payload: DataBindingDragPayload = { kind, name };
    event.dataTransfer.setData(DATA_BINDING_DRAG_MIME, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', `\$${kind}{${name}}`);
    event.dataTransfer.effectAllowed = 'copy';
  }

  protected addField(): void {
    this.store.updateReport((r) => ({
      ...r,
      fields: [...(r.fields ?? []), { name: 'new_field', class: 'java.lang.String' }],
    }));
  }
  protected updateField(i: number, patch: Partial<Field>): void {
    this.store.updateReport((r) => {
      const fields = [...(r.fields ?? [])];
      if (!fields[i]) return r;
      fields[i] = { ...fields[i], ...patch };
      return { ...r, fields };
    });
  }
  protected removeField(i: number): void {
    this.store.updateReport((r) => {
      const fields = [...(r.fields ?? [])];
      fields.splice(i, 1);
      return { ...r, fields: fields.length > 0 ? fields : undefined };
    });
  }

  protected addParameter(): void {
    this.store.updateReport((r) => ({
      ...r,
      parameters: [...(r.parameters ?? []), { name: 'new_param', class: 'java.lang.String' }],
    }));
  }
  protected updateParameter(i: number, patch: Partial<Parameter>): void {
    this.store.updateReport((r) => {
      const parameters = [...(r.parameters ?? [])];
      if (!parameters[i]) return r;
      parameters[i] = { ...parameters[i], ...patch };
      return { ...r, parameters };
    });
  }
  protected removeParameter(i: number): void {
    this.store.updateReport((r) => {
      const parameters = [...(r.parameters ?? [])];
      parameters.splice(i, 1);
      return { ...r, parameters: parameters.length > 0 ? parameters : undefined };
    });
  }

  protected addVariable(): void {
    this.store.updateReport((r) => ({
      ...r,
      variables: [...(r.variables ?? []), { name: 'new_var', class: 'java.lang.String' }],
    }));
  }
  protected updateVariable(i: number, patch: Partial<Variable>): void {
    this.store.updateReport((r) => {
      const variables = [...(r.variables ?? [])];
      if (!variables[i]) return r;
      variables[i] = { ...variables[i], ...patch };
      return { ...r, variables };
    });
  }
  protected removeVariable(i: number): void {
    this.store.updateReport((r) => {
      const variables = [...(r.variables ?? [])];
      variables.splice(i, 1);
      return { ...r, variables: variables.length > 0 ? variables : undefined };
    });
  }
}
