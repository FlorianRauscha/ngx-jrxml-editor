import type { BandSections } from './band';
import type { Field, Group, Parameter, Query, Variable } from './dataset';
import type { Style } from './style';

export interface ReportProperty {
  name: string;
  value: string;
}

export interface SubDataset {
  name: string;
  uuid?: string;
  parameters?: Parameter[];
  fields?: Field[];
  variables?: Variable[];
  groups?: Group[];
  query?: Query;
}

export interface JasperReport {
  /** <jasperReport> root attributes. */
  name: string;
  uuid?: string;
  language?: string;
  pageWidth?: number;
  pageHeight?: number;
  columnWidth?: number;
  columnCount?: number;
  columnSpacing?: number;
  leftMargin?: number;
  rightMargin?: number;
  topMargin?: number;
  bottomMargin?: number;
  orientation?: 'Portrait' | 'Landscape';
  whenNoDataType?: 'NoPages' | 'BlankPage' | 'AllSectionsNoDetail' | 'NoDataSection';
  isTitleNewPage?: boolean;
  isSummaryNewPage?: boolean;
  isSummaryWithPageHeaderAndFooter?: boolean;
  isFloatColumnFooter?: boolean;
  isIgnorePagination?: boolean;
  scriptletClass?: string;
  resourceBundle?: string;
  whenResourceMissingType?: 'Null' | 'Empty' | 'Key' | 'Error';
  printOrder?: 'Vertical' | 'Horizontal';

  properties?: ReportProperty[];
  imports?: string[];
  styles?: Style[];
  subDatasets?: SubDataset[];
  parameters?: Parameter[];
  query?: Query;
  fields?: Field[];
  variables?: Variable[];
  groups?: Group[];
  sections: BandSections;
}
