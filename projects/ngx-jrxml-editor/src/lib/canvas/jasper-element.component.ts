import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type {
  AnyElement,
  BarcodeElement,
  ChartElement,
  CrosstabElement,
  ElementGroup,
  EllipseElement,
  FrameElement,
  ImageElement,
  LineElement,
  RectangleElement,
  StaticTextElement,
  SubreportElement,
  TableElement,
  TextFieldElement,
  BreakElement,
} from '../model/element';
import type { ElementPath } from '../state/path';
import { JasperBarcodeElementComponent } from './elements/barcode-element.component';
import { JasperChartElementComponent } from './elements/chart-element.component';
import { JasperCrosstabElementComponent } from './elements/crosstab-element.component';
import { JasperBreakElementComponent } from './elements/break-element.component';
import { JasperEllipseElementComponent } from './elements/ellipse-element.component';
import { JasperElementGroupElementComponent } from './elements/element-group-element.component';
import { JasperFrameElementComponent } from './elements/frame-element.component';
import { JasperImageElementComponent } from './elements/image-element.component';
import { JasperLineElementComponent } from './elements/line-element.component';
import { JasperRectElementComponent } from './elements/rect-element.component';
import { JasperStaticTextElementComponent } from './elements/static-text-element.component';
import { JasperSubreportElementComponent } from './elements/subreport-element.component';
import { JasperTableElementComponent } from './elements/table-element.component';
import { JasperTextFieldElementComponent } from './elements/text-field-element.component';

/**
 * Thin dispatcher that picks the right per-kind component for a given
 * `AnyElement`. Lives next to its peers in `canvas/elements/` and is what
 * everything (bands, frames, table cells, the dispatcher itself recursively)
 * imports — so callers never need to know which concrete component renders a
 * given element kind.
 */
@Component({
  selector: 'lib-jasper-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JasperStaticTextElementComponent,
    JasperTextFieldElementComponent,
    JasperImageElementComponent,
    JasperLineElementComponent,
    JasperRectElementComponent,
    JasperEllipseElementComponent,
    JasperFrameElementComponent,
    JasperBreakElementComponent,
    JasperSubreportElementComponent,
    JasperElementGroupElementComponent,
    JasperBarcodeElementComponent,
    JasperTableElementComponent,
    JasperChartElementComponent,
    JasperCrosstabElementComponent,
  ],
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  template: `
    @switch (element().kind) {
      @case ('staticText') {
        <jasper-static-text-element [element]="asStaticText(element())" [path]="path()" />
      }
      @case ('textField') {
        <jasper-text-field-element [element]="asTextField(element())" [path]="path()" />
      }
      @case ('image') {
        <jasper-image-element [element]="asImage(element())" [path]="path()" />
      }
      @case ('line') {
        <jasper-line-element [element]="asLine(element())" [path]="path()" />
      }
      @case ('rectangle') {
        <jasper-rect-element [element]="asRect(element())" [path]="path()" />
      }
      @case ('ellipse') {
        <jasper-ellipse-element [element]="asEllipse(element())" [path]="path()" />
      }
      @case ('frame') {
        <jasper-frame-element [element]="asFrame(element())" [path]="path()" />
      }
      @case ('break') {
        <jasper-break-element [element]="asBreak(element())" [path]="path()" />
      }
      @case ('subreport') {
        <jasper-subreport-element [element]="asSubreport(element())" [path]="path()" />
      }
      @case ('elementGroup') {
        <jasper-element-group-element [element]="asElementGroup(element())" [path]="path()" />
      }
      @case ('componentElement') {
        @if (asBarcode(element()); as bc) {
          <jasper-barcode-element [element]="bc" [path]="path()" />
        }
        @if (asTable(element()); as tb) {
          <jasper-table-element [element]="tb" [path]="path()" />
        }
      }
      @case ('chart') {
        <jasper-chart-element [element]="asChart(element())" [path]="path()" />
      }
      @case ('crosstab') {
        <jasper-crosstab-element [element]="asCrosstab(element())" [path]="path()" />
      }
    }
  `,
})
export class JasperElementComponent {
  readonly element = input.required<AnyElement>();
  readonly path = input<ElementPath | null>(null);

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
  protected asRect(el: AnyElement): RectangleElement {
    return el as RectangleElement;
  }
  protected asEllipse(el: AnyElement): EllipseElement {
    return el as EllipseElement;
  }
  protected asFrame(el: AnyElement): FrameElement {
    return el as FrameElement;
  }
  protected asBreak(el: AnyElement): BreakElement {
    return el as BreakElement;
  }
  protected asSubreport(el: AnyElement): SubreportElement {
    return el as SubreportElement;
  }
  protected asElementGroup(el: AnyElement): ElementGroup {
    return el as ElementGroup;
  }
  protected asBarcode(el: AnyElement): BarcodeElement | null {
    if (el.kind === 'componentElement' && el.componentKind === 'barcode4j') {
      return el as BarcodeElement;
    }
    return null;
  }
  protected asTable(el: AnyElement): TableElement | null {
    if (el.kind === 'componentElement' && el.componentKind === 'table') {
      return el as TableElement;
    }
    return null;
  }
  protected asChart(el: AnyElement): ChartElement {
    return el as ChartElement;
  }
  protected asCrosstab(el: AnyElement): CrosstabElement {
    return el as CrosstabElement;
  }
}
