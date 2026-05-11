import type { Box, HAlign, PositionType, StretchType, VAlign } from './units';
import type { Pen, TextStyle } from './style';

export type ElementKind =
  | 'staticText'
  | 'textField'
  | 'image'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'frame'
  | 'break'
  | 'subreport'
  | 'elementGroup'
  | 'componentElement'
  | 'chart'
  | 'crosstab';

/** Generic JR `<property name=".." value=".."/>` carried opaquely on report,
 *  field, parameter, and element nodes for round-trip preservation. */
export interface JrProperty {
  name: string;
  value: string;
}

export interface ElementCommon extends Box {
  /** "reportElement" attributes shared by every element. */
  uuid?: string;
  key?: string;
  style?: string;
  positionType?: PositionType;
  stretchType?: StretchType;
  isPrintRepeatedValues?: boolean;
  removeLineWhenBlank?: boolean;
  printWhenGroupChanges?: string;
  printWhenExpression?: string;
  forecolor?: string;
  backcolor?: string;
  mode?: 'Opaque' | 'Transparent';
  /** Per-element `<property>` children, preserved verbatim on round-trip. */
  properties?: JrProperty[];
}

/** JR 7 `textAdjust` attribute — replaces the legacy boolean
 *  `isStretchWithOverflow`. */
export type TextAdjust = 'CutText' | 'StretchHeight' | 'ScaleFont';

/** JR hyperlink-related fields, shared between TextField and Image. */
export interface HyperlinkFields {
  linkType?: string;
  linkTarget?: string;
  hyperlinkAnchorExpression?: string;
  hyperlinkPageExpression?: string;
  hyperlinkReferenceExpression?: string;
  hyperlinkTooltipExpression?: string;
  hyperlinkWhenExpression?: string;
  hyperlinkParameters?: { name: string; expression: string }[];
}

export interface BoxBorders {
  padding?: number;
  topPadding?: number;
  leftPadding?: number;
  bottomPadding?: number;
  rightPadding?: number;
  pen?: Pen;
  topPen?: Pen;
  leftPen?: Pen;
  bottomPen?: Pen;
  rightPen?: Pen;
}

export interface StaticTextElement extends ElementCommon {
  kind: 'staticText';
  text: string;
  textStyle?: TextStyle;
  textAdjust?: TextAdjust;
  box?: BoxBorders;
}

export interface TextFieldElement extends ElementCommon, HyperlinkFields {
  kind: 'textField';
  /** Groovy/Java expression string, e.g. `$F{name}` */
  expression: string;
  pattern?: string;
  isStretchWithOverflow?: boolean;
  textAdjust?: TextAdjust;
  isBlankWhenNull?: boolean;
  evaluationTime?:
    | 'Now'
    | 'Report'
    | 'Page'
    | 'Column'
    | 'Group'
    | 'Band'
    | 'Auto';
  evaluationGroup?: string;
  textStyle?: TextStyle;
  box?: BoxBorders;
}

export interface ImageElement extends ElementCommon, HyperlinkFields {
  kind: 'image';
  expression: string;
  scaleImage?: 'Clip' | 'FillFrame' | 'RetainShape' | 'RealHeight' | 'RealSize';
  hAlign?: HAlign;
  vAlign?: VAlign;
  isUsingCache?: boolean;
  isLazy?: boolean;
  onErrorType?: 'Error' | 'Blank' | 'Icon';
  box?: BoxBorders;
}

export interface LineElement extends ElementCommon {
  kind: 'line';
  direction?: 'TopDown' | 'BottomUp';
  pen?: Pen;
}

export interface RectangleElement extends ElementCommon {
  kind: 'rectangle';
  radius?: number;
  pen?: Pen;
}

export interface EllipseElement extends ElementCommon {
  kind: 'ellipse';
  pen?: Pen;
}

export interface FrameElement extends ElementCommon {
  kind: 'frame';
  /** Frames contain other elements. */
  children: AnyElement[];
  box?: BoxBorders;
}

export interface BreakElement extends ElementCommon {
  kind: 'break';
  type?: 'Page' | 'Column';
}

export interface SubreportElement extends ElementCommon {
  kind: 'subreport';
  expression: string;
  parametersMapExpression?: string;
  connectionExpression?: string;
  dataSourceExpression?: string;
  isUsingCache?: boolean;
  runToBottom?: boolean;
  overflowType?: 'NoStretch' | 'Stretch';
  /** `<subreportParameter>` children. */
  subreportParameters?: { name: string; expression: string }[];
}

/** A JR `<elementGroup>` — a transparent grouping of elements. The group
 *  itself has no geometry; children carry their own absolute coordinates. */
export interface ElementGroup {
  kind: 'elementGroup';
  children: AnyElement[];
}

/** v1: Tables only. Other componentElements (charts, crosstabs) are out of scope. */
export interface TableElement extends ElementCommon {
  kind: 'componentElement';
  componentKind: 'table';
  table: TableComponent;
}

/** Barcode4j component — covers all 1D and 2D barcodes JR supports
 *  (Code128, Code39, EAN-13/8, UPC-A/E, QRCode, DataMatrix, PDF417, ...). */
export interface BarcodeElement extends ElementCommon {
  kind: 'componentElement';
  componentKind: 'barcode4j';
  barcode: Barcode4jComponent;
}

export type Barcode4jType =
  | 'Code128'
  | 'Code39'
  | 'EAN13'
  | 'EAN8'
  | 'UPCA'
  | 'UPCE'
  | 'Codabar'
  | 'Interleaved2Of5'
  | 'POSTNET'
  | 'QRCode'
  | 'DataMatrix'
  | 'PDF417'
  | 'RoyalMailCustomer'
  | 'USPSIntelligentMail';

export interface Barcode4jComponent {
  /** One of the supported barcode4j types. */
  type: Barcode4jType;
  /** Expression producing the data encoded in the barcode. */
  codeExpression: string;
  /** Where to render the human-readable text below/above/none. */
  textPosition?: 'top' | 'bottom' | 'none';
  /** Checksum mode for 1D barcodes. */
  checksumMode?: 'auto' | 'add' | 'check' | 'ignore';
  /** Module width for 1D barcodes (pixels per narrow bar). */
  moduleWidth?: number;
  /** Pattern for human-readable text. */
  patternExpression?: string;
  /** QR-code error correction level: L | M | Q | H. */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Orientation in degrees (0, 90, 180, 270). */
  orientation?: 0 | 90 | 180 | 270;
}

export type AnyElement =
  | StaticTextElement
  | TextFieldElement
  | ImageElement
  | LineElement
  | RectangleElement
  | EllipseElement
  | FrameElement
  | BreakElement
  | SubreportElement
  | ElementGroup
  | TableElement
  | BarcodeElement
  | ChartElement
  | CrosstabElement;

// ----- Crosstabs ----------------------------------------------------------

/** A `<rowGroup>` or `<columnGroup>` bucket — both share the same shape;
 *  callers distinguish row vs column by which array the group sits in. */
export interface CrosstabBucket {
  /** Java class of the bucketed value, e.g. `java.lang.String`. */
  class?: string;
  /** Bucket expression (resolves a row/column key per dataset row). */
  expression: string;
  /** Optional secondary sort/order expression. */
  orderByExpression?: string;
  /** Optional secondary expression used to compare bucket values. */
  comparatorExpression?: string;
}

export interface CrosstabRowGroup {
  name: string;
  /** Width of the row-header column, in px. */
  width: number;
  bucket: CrosstabBucket;
  /** Where the running total for this group renders. */
  totalPosition?: 'None' | 'Start' | 'End';
  /** Header height — separately controlled from row height in some templates. */
  headerPosition?: 'Top' | 'Middle' | 'Bottom' | 'Stretch';
}

export interface CrosstabColumnGroup {
  name: string;
  /** Height of the column-header row, in px. */
  height: number;
  bucket: CrosstabBucket;
  totalPosition?: 'None' | 'Start' | 'End';
  headerPosition?: 'Left' | 'Center' | 'Right' | 'Stretch';
}

export interface CrosstabMeasure {
  name: string;
  /** Java class of the aggregated value. */
  class: string;
  calculation?:
    | 'Nothing'
    | 'Count'
    | 'DistinctCount'
    | 'Sum'
    | 'Average'
    | 'Lowest'
    | 'Highest'
    | 'StandardDeviation'
    | 'Variance'
    | 'System'
    | 'First';
  expression: string;
}

export interface CrosstabElement extends ElementCommon {
  kind: 'crosstab';
  /** Reference to a sub-dataset that feeds the crosstab. */
  datasetRun?: {
    subDataset: string;
    parametersMapExpression?: string;
    connectionExpression?: string;
    dataSourceExpression?: string;
    parameters?: { name: string; expression: string }[];
  };
  rowGroups: CrosstabRowGroup[];
  columnGroups: CrosstabColumnGroup[];
  measures: CrosstabMeasure[];
  /** When true, the crosstab repeats the column-headers on every page. */
  isRepeatColumnHeaders?: boolean;
  /** When true, the crosstab repeats the row-headers on every page break. */
  isRepeatRowHeaders?: boolean;
  /** Default cell width / height used for measure cells. */
  cellWidth?: number;
  cellHeight?: number;
}

// ----- Charts -------------------------------------------------------------

/** JR `<pieChart>`, `<barChart>`, etc. We model the most common subset; others
 *  are supported on a passthrough basis for round-trip. */
export type ChartType =
  | 'pieChart'
  | 'pie3DChart'
  | 'barChart'
  | 'bar3DChart'
  | 'stackedBarChart'
  | 'lineChart'
  | 'areaChart'
  | 'stackedAreaChart';

export interface PieDataset {
  kind: 'pie';
  keyExpression: string;
  valueExpression: string;
  labelExpression?: string;
}

export interface CategorySeries {
  seriesExpression: string;
  categoryExpression: string;
  valueExpression: string;
  labelExpression?: string;
}

export interface CategoryDataset {
  kind: 'category';
  series: CategorySeries[];
}

export type ChartDataset = PieDataset | CategoryDataset;

export interface ChartElement extends ElementCommon, HyperlinkFields {
  kind: 'chart';
  chartType: ChartType;
  dataset: ChartDataset;
  /** Optional axis/title labels mapped to common JR plot fields. */
  titleExpression?: string;
  subtitleExpression?: string;
  showLegend?: boolean;
  categoryAxisLabelExpression?: string;
  valueAxisLabelExpression?: string;
}

// ----- Table component (jr:table) -----

export interface TableCell {
  height?: number;
  width?: number;
  rowSpan?: number;
  style?: string;
  box?: BoxBorders;
  /** Cell contents are arbitrary report elements. */
  children: AnyElement[];
}

export interface TableColumn {
  width: number;
  uuid?: string;
  printWhenExpression?: string;
  tableHeader?: TableCell;
  tableFooter?: TableCell;
  columnHeader?: TableCell;
  columnFooter?: TableCell;
  detailCell?: TableCell;
  /** Group header/footer cells, keyed by group name. */
  groupHeaders?: Record<string, TableCell>;
  groupFooters?: Record<string, TableCell>;
}

export interface TableComponent {
  uuid?: string;
  whenNoDataType?: 'Blank' | 'NoDataCell' | 'AllSectionsNoDetail';
  /** Reference to a sub-dataset. */
  datasetRun?: {
    subDataset: string;
    parametersMapExpression?: string;
    connectionExpression?: string;
    dataSourceExpression?: string;
    parameters?: { name: string; expression: string }[];
  };
  columns: TableColumn[];
}
