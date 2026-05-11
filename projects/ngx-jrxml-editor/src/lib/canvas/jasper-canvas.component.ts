import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
} from '@angular/core';

import type { Band, BandSection } from '../model/band';
import type { JasperReport } from '../model/report';
import { EditorStore } from '../state/editor-store';
import { JasperBandComponent } from './jasper-band.component';

interface BandRow {
  section: BandSection;
  band: Band;
  index: number | null;
  groupName?: string;
}

interface Tick {
  /** Screen-pixel position along the ruler. */
  pos: number;
  /** Whether to draw the longer "major" tick. */
  major: boolean;
  /** Label text — only set on labelled ticks. */
  label?: string;
}

const RULER_THICKNESS = 20;
const MINOR_STEP = 10;
const MAJOR_STEP = 50;
const LABEL_STEP = 100;

@Component({
  selector: 'lib-jasper-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperBandComponent],
  styles: [
    `
      :host {
        display: block;
        background: #eef0f4;
        padding: 24px 24px 48px 24px;
        font-family: -apple-system, system-ui, sans-serif;
        overflow: auto;
      }
      .jc-stage {
        display: grid;
        grid-template-columns: 20px auto;
        grid-template-rows: 20px auto;
        margin: 0 auto;
        width: max-content;
      }
      .jc-corner {
        grid-column: 1;
        grid-row: 1;
        background: #f4f5f8;
        border-right: 1px solid #d8dbe3;
        border-bottom: 1px solid #d8dbe3;
      }
      .jc-ruler-h,
      .jc-ruler-v {
        background: #f4f5f8;
        position: relative;
        font-size: 9px;
        color: #6b7280;
        font-family: ui-monospace, Menlo, monospace;
      }
      .jc-ruler-h {
        grid-column: 2;
        grid-row: 1;
        height: 20px;
        border-bottom: 1px solid #d8dbe3;
      }
      .jc-ruler-v {
        grid-column: 1;
        grid-row: 2;
        width: 20px;
        border-right: 1px solid #d8dbe3;
      }
      .jc-ruler-h .tick,
      .jc-ruler-v .tick {
        position: absolute;
        background: #b3b8c2;
      }
      .jc-ruler-h .tick {
        bottom: 0;
        width: 1px;
        height: 4px;
      }
      .jc-ruler-h .tick.major {
        height: 8px;
        background: #6b7280;
      }
      .jc-ruler-v .tick {
        right: 0;
        height: 1px;
        width: 4px;
      }
      .jc-ruler-v .tick.major {
        width: 8px;
        background: #6b7280;
      }
      .jc-ruler-h .label {
        position: absolute;
        bottom: 9px;
        left: 2px;
        white-space: nowrap;
      }
      .jc-ruler-v .label {
        position: absolute;
        right: 9px;
        top: 1px;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        white-space: nowrap;
      }
      .jc-page {
        grid-column: 2;
        grid-row: 2;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        padding: 0;
        position: relative;
      }
      .jc-margins {
        padding: var(--jc-top) var(--jc-right) var(--jc-bottom) var(--jc-left);
      }
    `,
  ],
  template: `
    <div class="jc-stage">
      <div class="jc-corner"></div>
      <div class="jc-ruler-h" [style.width.px]="rulerHWidth()">
        @for (t of ticksH(); track t.pos) {
          <span class="tick" [class.major]="t.major" [style.left.px]="t.pos"></span>
          @if (t.label) {
            <span class="label" [style.left.px]="t.pos">{{ t.label }}</span>
          }
        }
      </div>
      <div class="jc-ruler-v" [style.height.px]="rulerVHeight()">
        @for (t of ticksV(); track t.pos) {
          <span class="tick" [class.major]="t.major" [style.top.px]="t.pos"></span>
          @if (t.label) {
            <span class="label" [style.top.px]="t.pos">{{ t.label }}</span>
          }
        }
      </div>
      <div
        class="jc-page"
        [style.width.px]="pageWidth()"
        [style.zoom]="zoom()"
        [style.--jc-top.px]="topMargin()"
        [style.--jc-right.px]="rightMargin()"
        [style.--jc-bottom.px]="bottomMargin()"
        [style.--jc-left.px]="leftMargin()"
      >
        <div class="jc-margins">
          @for (row of rows(); track $index) {
            <lib-jasper-band
              [band]="row.band"
              [width]="columnWidth()"
              [section]="row.section"
              [index]="row.index"
              [groupName]="row.groupName"
              [selectable]="selectable()"
            />
          }
        </div>
      </div>
    </div>
  `,
})
export class JasperCanvasComponent {
  readonly report = input.required<JasperReport>();
  readonly selectable = input<boolean>(false);

  private readonly store = inject(EditorStore, { optional: true });

  protected pageWidth = computed(() => this.report().pageWidth ?? 595);
  protected pageHeight = computed(() => this.report().pageHeight ?? 842);
  protected leftMargin = computed(() => this.report().leftMargin ?? 0);
  protected rightMargin = computed(() => this.report().rightMargin ?? 0);
  protected topMargin = computed(() => this.report().topMargin ?? 0);
  protected bottomMargin = computed(() => this.report().bottomMargin ?? 0);
  protected columnWidth = computed(
    () => this.report().columnWidth ?? this.pageWidth() - this.leftMargin() - this.rightMargin(),
  );
  protected zoom = computed(() => this.store?.zoom() ?? 1);

  protected rulerHWidth = computed(() => Math.round(this.pageWidth() * this.zoom()));
  protected rulerVHeight = computed(() => Math.round(this.pageHeight() * this.zoom()));

  protected ticksH = computed<Tick[]>(() => buildTicks(this.pageWidth(), this.zoom()));
  protected ticksV = computed<Tick[]>(() => buildTicks(this.pageHeight(), this.zoom()));

  @HostListener('wheel', ['$event'])
  protected onWheel(event: WheelEvent): void {
    if (!this.store) return;
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    if (event.deltaY < 0) this.store.zoomIn(0.05);
    else if (event.deltaY > 0) this.store.zoomOut(0.05);
  }

  protected readonly rows = computed<BandRow[]>(() => {
    const r = this.report();
    const rows: BandRow[] = [];
    const single: { key: BandSection; band: Band | undefined }[] = [
      { key: 'background', band: r.sections.background },
      { key: 'title', band: r.sections.title },
      { key: 'pageHeader', band: r.sections.pageHeader },
      { key: 'columnHeader', band: r.sections.columnHeader },
    ];
    for (const s of single) if (s.band) rows.push({ section: s.key, band: s.band, index: null });
    // Group headers print outermost-first before the detail (group order in JR
    // is significant; we render in the same order).
    for (const g of r.groups ?? []) {
      (g.groupHeader ?? []).forEach((band, i) => {
        rows.push({
          section: 'groupHeader',
          band,
          index: (g.groupHeader?.length ?? 0) > 1 ? i : null,
          groupName: g.name,
        });
      });
    }
    if (r.sections.detail) {
      r.sections.detail.forEach((band, i) => {
        rows.push({
          section: 'detail',
          band,
          index: r.sections.detail!.length > 1 ? i : null,
        });
      });
    }
    // Group footers print in REVERSE group order (innermost first).
    for (const g of [...(r.groups ?? [])].reverse()) {
      (g.groupFooter ?? []).forEach((band, i) => {
        rows.push({
          section: 'groupFooter',
          band,
          index: (g.groupFooter?.length ?? 0) > 1 ? i : null,
          groupName: g.name,
        });
      });
    }
    const tail: { key: BandSection; band: Band | undefined }[] = [
      { key: 'columnFooter', band: r.sections.columnFooter },
      { key: 'pageFooter', band: r.sections.pageFooter },
      { key: 'lastPageFooter', band: r.sections.lastPageFooter },
      { key: 'summary', band: r.sections.summary },
      { key: 'noData', band: r.sections.noData },
    ];
    for (const s of tail) if (s.band) rows.push({ section: s.key, band: s.band, index: null });
    return rows;
  });
}

function buildTicks(pageDim: number, zoom: number): Tick[] {
  const ticks: Tick[] = [];
  // Skip dense minor ticks at low zoom.
  const showMinor = zoom >= 0.7;
  for (let p = 0; p <= pageDim; p += MINOR_STEP) {
    const isMajor = p % MAJOR_STEP === 0;
    const isLabel = p % LABEL_STEP === 0;
    if (!showMinor && !isMajor) continue;
    ticks.push({
      pos: Math.round(p * zoom),
      major: isMajor,
      label: isLabel ? String(p) : undefined,
    });
  }
  return ticks;
}
