import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JasperIconComponent } from '../icon/jasper-icon.component';
import type { Band, BandSection } from '../model/band';
import type { Group } from '../model/dataset';
import type { JasperReport } from '../model/report';
import { EditorStore } from '../state/editor-store';

interface BandRow {
  section: BandSection;
  label: string;
  band?: Band;
  bandIndex?: number;
}

const SECTION_LABELS: { section: BandSection; label: string }[] = [
  { section: 'background', label: 'Background' },
  { section: 'title', label: 'Title' },
  { section: 'pageHeader', label: 'Page Header' },
  { section: 'columnHeader', label: 'Column Header' },
  { section: 'detail', label: 'Detail' },
  { section: 'columnFooter', label: 'Column Footer' },
  { section: 'pageFooter', label: 'Page Footer' },
  { section: 'lastPageFooter', label: 'Last Page Footer' },
  { section: 'summary', label: 'Summary' },
  { section: 'noData', label: 'No Data' },
];

interface PagePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/** Standard paper sizes at 72 DPI (the JR convention). */
const PRESETS: PagePreset[] = [
  { id: 'A3', label: 'A3', width: 842, height: 1191 },
  { id: 'A4', label: 'A4', width: 595, height: 842 },
  { id: 'A5', label: 'A5', width: 420, height: 595 },
  { id: 'Letter', label: 'Letter (US)', width: 612, height: 792 },
  { id: 'Legal', label: 'Legal (US)', width: 612, height: 1008 },
  { id: 'Tabloid', label: 'Tabloid', width: 792, height: 1224 },
];

@Component({
  selector: 'lib-jasper-page-settings',
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
      }
      .row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .row label {
        color: #555;
      }
      .grid2 {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
      }
      .grid2 .row {
        grid-template-columns: 44px minmax(0, 1fr);
        gap: 6px;
        margin-bottom: 0;
      }
      input,
      select {
        width: 100%;
        min-width: 0;
        padding: 4px 6px;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        font-family: inherit;
        font-size: 12px;
        background: #fff;
        box-sizing: border-box;
      }
      .orient {
        display: flex;
        gap: 4px;
      }
      .orient button {
        flex: 1;
        background: #fff;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        font-family: inherit;
      }
      .orient button.active {
        background: #4a6cf7;
        color: #fff;
        border-color: #4a6cf7;
      }
      .band-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 60px 26px 26px;
        gap: 6px;
        align-items: center;
        margin-bottom: 4px;
      }
      .band-row .name {
        font-size: 12px;
        color: #1a1d27;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .band-row .name.disabled {
        color: #aaa;
      }
      .band-row .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border: 1px solid #cfd3dc;
        border-radius: 3px;
        cursor: pointer;
        font-size: 13px;
        font-family: inherit;
        line-height: 1;
        padding: 0;
        height: 26px;
        width: 26px;
      }
      .band-row .icon-btn.add {
        color: #4a6cf7;
      }
      .band-row .icon-btn.remove {
        color: #b00020;
      }
      .band-row .icon-btn:hover {
        background: #f3f5f9;
      }
      .band-row .icon-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    `,
  ],
  template: `
    @if (report(); as r) {
      <section>
        <h3>Paper</h3>
        <div class="row">
          <label>preset</label>
          <select
            [ngModel]="currentPreset()"
            (ngModelChange)="applyPreset($event)"
          >
            <option value="custom">Custom</option>
            @for (p of presets; track p.id) {
              <option [value]="p.id">{{ p.label }} ({{ p.width }}×{{ p.height }})</option>
            }
          </select>
        </div>
        <div class="row">
          <label>orientation</label>
          <div class="orient">
            <button
              type="button"
              [class.active]="orientation() === 'Portrait'"
              (click)="setOrientation('Portrait')"
            >Portrait</button>
            <button
              type="button"
              [class.active]="orientation() === 'Landscape'"
              (click)="setOrientation('Landscape')"
            >Landscape</button>
          </div>
        </div>
        <div class="grid2">
          <div class="row">
            <label>width</label>
            <input
              type="number"
              [ngModel]="r.pageWidth ?? 0"
              (ngModelChange)="patch({ pageWidth: toInt($event) })"
            />
          </div>
          <div class="row">
            <label>height</label>
            <input
              type="number"
              [ngModel]="r.pageHeight ?? 0"
              (ngModelChange)="patch({ pageHeight: toInt($event) })"
            />
          </div>
        </div>
      </section>
      <section>
        <h3>Margins</h3>
        <div class="grid2">
          <div class="row">
            <label>top</label>
            <input
              type="number"
              [ngModel]="r.topMargin ?? 0"
              (ngModelChange)="patch({ topMargin: toInt($event) })"
            />
          </div>
          <div class="row">
            <label>right</label>
            <input
              type="number"
              [ngModel]="r.rightMargin ?? 0"
              (ngModelChange)="patch({ rightMargin: toInt($event) })"
            />
          </div>
          <div class="row">
            <label>bottom</label>
            <input
              type="number"
              [ngModel]="r.bottomMargin ?? 0"
              (ngModelChange)="patch({ bottomMargin: toInt($event) })"
            />
          </div>
          <div class="row">
            <label>left</label>
            <input
              type="number"
              [ngModel]="r.leftMargin ?? 0"
              (ngModelChange)="patch({ leftMargin: toInt($event) })"
            />
          </div>
        </div>
      </section>
      <section>
        <h3>Bands</h3>
        @for (row of bandRows(); track $index) {
          <div class="band-row">
            <span class="name" [class.disabled]="!row.band">
              {{ row.label }}{{ row.bandIndex !== undefined ? ' #' + (row.bandIndex + 1) : '' }}
            </span>
            <input
              type="number"
              [disabled]="!row.band"
              [ngModel]="row.band?.height ?? 0"
              (ngModelChange)="setBandHeight(row, $event)"
              title="Height (px)"
            />
            <button
              type="button"
              class="icon-btn add"
              [disabled]="!canAdd(row)"
              (click)="addBand(row.section)"
              [title]="row.section === 'detail' ? 'Add detail band' : 'Add ' + row.label"
            ><lib-icon name="plus" [size]="12" /></button>
            <button
              type="button"
              class="icon-btn remove"
              [disabled]="!row.band"
              (click)="removeBand(row.section, row.bandIndex ?? 0)"
              [title]="'Remove ' + row.label"
            ><lib-icon name="x" [size]="12" /></button>
          </div>
        }
      </section>

      <section>
        <h3>Groups</h3>
        @if ((r.groups ?? []).length === 0) {
          <div style="color: #aaa; font-style: italic; padding: 4px 0 8px 0;">
            No groups defined.
          </div>
        }
        @for (g of (r.groups ?? []); track $index; let gi = $index) {
          <div style="border: 1px solid #d8dbe3; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #fff;">
            <div class="row" style="grid-template-columns: 60px minmax(0, 1fr) 26px;">
              <label>name</label>
              <input
                type="text"
                [ngModel]="g.name"
                (ngModelChange)="updateGroup(gi, { name: $event })"
              />
              <button
                type="button"
                class="icon-btn remove"
                (click)="removeGroup(gi)"
                title="Remove group"
              ><lib-icon name="x" [size]="12" /></button>
            </div>
            <div class="row">
              <label>expr</label>
              <input
                type="text"
                placeholder="$F{department}"
                [ngModel]="g.expression ?? ''"
                (ngModelChange)="updateGroup(gi, { expression: $event || undefined })"
              />
            </div>
            <div class="row" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);">
              <label style="grid-column: span 2;">
                <input
                  type="checkbox"
                  [ngModel]="g.isStartNewPage ?? false"
                  (ngModelChange)="updateGroup(gi, { isStartNewPage: $event || undefined })"
                /> start new page
              </label>
            </div>
            <div class="row" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);">
              <label style="grid-column: span 2;">
                <input
                  type="checkbox"
                  [ngModel]="g.isStartNewColumn ?? false"
                  (ngModelChange)="updateGroup(gi, { isStartNewColumn: $event || undefined })"
                /> start new column
              </label>
            </div>
            <div style="margin-top: 6px; font-size: 11px; color: #555;">
              Header bands: {{ g.groupHeader?.length ?? 0 }}
              <button
                type="button"
                class="icon-btn add"
                style="vertical-align: middle;"
                (click)="addGroupBand(g.name, 'groupHeader')"
                title="Add header band"
              ><lib-icon name="plus" [size]="12" /></button>
              @if ((g.groupHeader?.length ?? 0) > 0) {
                <button
                  type="button"
                  class="icon-btn remove"
                  style="vertical-align: middle;"
                  (click)="removeGroupBand(g.name, 'groupHeader', (g.groupHeader?.length ?? 1) - 1)"
                  title="Remove last header band"
                ><lib-icon name="x" [size]="12" /></button>
              }
            </div>
            <div style="margin-top: 4px; font-size: 11px; color: #555;">
              Footer bands: {{ g.groupFooter?.length ?? 0 }}
              <button
                type="button"
                class="icon-btn add"
                style="vertical-align: middle;"
                (click)="addGroupBand(g.name, 'groupFooter')"
                title="Add footer band"
              ><lib-icon name="plus" [size]="12" /></button>
              @if ((g.groupFooter?.length ?? 0) > 0) {
                <button
                  type="button"
                  class="icon-btn remove"
                  style="vertical-align: middle;"
                  (click)="removeGroupBand(g.name, 'groupFooter', (g.groupFooter?.length ?? 1) - 1)"
                  title="Remove last footer band"
                ><lib-icon name="x" [size]="12" /></button>
              }
            </div>
          </div>
        }
        <button
          type="button"
          class="icon-btn add"
          style="width: auto; padding: 0 10px; height: 26px;"
          (click)="addGroup()"
          title="Add a new group"
        ><lib-icon name="plus" [size]="12" /> Add group</button>
      </section>

      <section>
        <h3>Columns</h3>
        <div class="grid2">
          <div class="row">
            <label>count</label>
            <input
              type="number"
              [ngModel]="r.columnCount ?? 1"
              (ngModelChange)="patch({ columnCount: Math.max(1, toInt($event)) })"
            />
          </div>
          <div class="row">
            <label>width</label>
            <input
              type="number"
              [ngModel]="r.columnWidth ?? defaultColumnWidth()"
              (ngModelChange)="patch({ columnWidth: toInt($event) })"
            />
          </div>
          <div class="row">
            <label>spacing</label>
            <input
              type="number"
              [ngModel]="r.columnSpacing ?? 0"
              (ngModelChange)="patch({ columnSpacing: toInt($event) })"
            />
          </div>
        </div>
      </section>
    }
  `,
})
export class JasperPageSettingsComponent {
  private readonly store = inject(EditorStore);
  protected readonly presets = PRESETS;
  protected readonly Math = Math;

  protected readonly report = computed<JasperReport | null>(() => this.store.report());

  protected readonly orientation = computed(() => this.report()?.orientation ?? 'Portrait');

  protected readonly currentPreset = computed<string>(() => {
    const r = this.report();
    if (!r) return 'custom';
    const w = r.pageWidth;
    const h = r.pageHeight;
    if (w === undefined || h === undefined) return 'custom';
    for (const p of PRESETS) {
      if ((w === p.width && h === p.height) || (w === p.height && h === p.width)) return p.id;
    }
    return 'custom';
  });

  protected toInt(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  protected defaultColumnWidth(): number {
    const r = this.report();
    if (!r) return 555;
    return (r.pageWidth ?? 595) - (r.leftMargin ?? 0) - (r.rightMargin ?? 0);
  }

  protected patch(p: Partial<JasperReport>): void {
    this.store.updateReport((r) => ({ ...r, ...p }));
  }

  protected applyPreset(presetId: string): void {
    if (presetId === 'custom') return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const isLandscape = this.orientation() === 'Landscape';
    const width = isLandscape ? preset.height : preset.width;
    const height = isLandscape ? preset.width : preset.height;
    this.store.updateReport((r) => ({
      ...r,
      pageWidth: width,
      pageHeight: height,
      columnWidth: width - (r.leftMargin ?? 0) - (r.rightMargin ?? 0),
    }));
  }

  protected readonly bandRows = computed<BandRow[]>(() => {
    const r = this.report();
    if (!r) return [];
    const rows: BandRow[] = [];
    for (const { section, label } of SECTION_LABELS) {
      if (section === 'detail') {
        const detail = r.sections.detail ?? [];
        if (detail.length === 0) {
          rows.push({ section, label, band: undefined });
        } else {
          detail.forEach((band, bandIndex) => {
            rows.push({ section, label, band, bandIndex });
          });
        }
      } else {
        const band = (r.sections as Record<string, Band | undefined>)[section];
        rows.push({ section, label, band });
      }
    }
    return rows;
  });

  protected canAdd(row: BandRow): boolean {
    // Detail can always have another band; single-band sections only when missing.
    if (row.section === 'detail') return true;
    return !row.band;
  }

  protected addBand(section: BandSection): void {
    this.store.addBand(section);
  }

  protected removeBand(section: BandSection, bandIndex: number): void {
    this.store.removeBand(section, bandIndex);
  }

  protected setBandHeight(row: BandRow, height: number): void {
    if (!row.band) return;
    const h = Math.max(0, Math.round(Number(height) || 0));
    this.store.updateBand(row.section, row.bandIndex ?? 0, (b) => ({ ...b, height: h }));
  }

  protected addGroup(): void {
    this.store.updateReport((r) => {
      const taken = new Set((r.groups ?? []).map((g) => g.name));
      let n = 1;
      while (taken.has(`Group${n}`)) n += 1;
      const newGroup: Group = {
        name: `Group${n}`,
        groupHeader: [{ height: 30, elements: [] }],
        groupFooter: [{ height: 30, elements: [] }],
      };
      return { ...r, groups: [...(r.groups ?? []), newGroup] };
    });
  }

  protected removeGroup(index: number): void {
    this.store.updateReport((r) => {
      const groups = [...(r.groups ?? [])];
      if (!groups[index]) return r;
      groups.splice(index, 1);
      return { ...r, groups: groups.length > 0 ? groups : undefined };
    });
  }

  protected updateGroup(index: number, patch: Partial<Group>): void {
    this.store.updateReport((r) => {
      const groups = [...(r.groups ?? [])];
      if (!groups[index]) return r;
      groups[index] = { ...groups[index], ...patch };
      return { ...r, groups };
    });
  }

  protected addGroupBand(groupName: string, section: 'groupHeader' | 'groupFooter'): void {
    this.store.addBand(section, 30, groupName);
  }

  protected removeGroupBand(
    groupName: string,
    section: 'groupHeader' | 'groupFooter',
    bandIndex: number,
  ): void {
    this.store.removeBand(section, bandIndex, groupName);
  }

  protected setOrientation(o: 'Portrait' | 'Landscape'): void {
    const r = this.report();
    if (!r || this.orientation() === o) return;
    this.store.updateReport((cur) => {
      const w = cur.pageWidth ?? 595;
      const h = cur.pageHeight ?? 842;
      return {
        ...cur,
        orientation: o,
        pageWidth: h,
        pageHeight: w,
        columnWidth: h - (cur.leftMargin ?? 0) - (cur.rightMargin ?? 0),
      };
    });
  }
}
