import type { AnyElement } from './element';

export type BandSection =
  | 'background'
  | 'title'
  | 'pageHeader'
  | 'columnHeader'
  | 'detail'
  | 'columnFooter'
  | 'pageFooter'
  | 'lastPageFooter'
  | 'summary'
  | 'noData'
  | 'groupHeader'
  | 'groupFooter';

export interface Band {
  height: number;
  splitType?: 'Stretch' | 'Prevent' | 'Immediate';
  printWhenExpression?: string;
  elements: AnyElement[];
}

/** Section→bands. Most sections have at most one band; `detail` and group bands can have multiple. */
export interface BandSections {
  background?: Band;
  title?: Band;
  pageHeader?: Band;
  columnHeader?: Band;
  detail?: Band[];
  columnFooter?: Band;
  pageFooter?: Band;
  lastPageFooter?: Band;
  summary?: Band;
  noData?: Band;
}
