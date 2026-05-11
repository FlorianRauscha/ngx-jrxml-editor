import type {
  AnyElement,
  BarcodeElement,
  BreakElement,
  ChartElement,
  CrosstabElement,
  EllipseElement,
  FrameElement,
  ImageElement,
  LineElement,
  RectangleElement,
  StaticTextElement,
  SubreportElement,
  TableElement,
  TextFieldElement,
} from '../model/element';
import { uuid } from './uuid';

/** Palette-facing kind names. Includes synthetic kinds like 'table' and
 *  'barcode' that resolve to specific component flavors. */
export type CreatableKind =
  | 'staticText'
  | 'textField'
  | 'image'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'frame'
  | 'break'
  | 'subreport'
  | 'table'
  | 'barcode'
  | 'pieChart'
  | 'barChart'
  | 'lineChart'
  | 'crosstab';

/** Create a new element of the given kind anchored at (x, y) with sensible default size. */
export function createDefaultElement(kind: CreatableKind, x: number, y: number): AnyElement {
  const id = uuid();
  const common = { x, y, uuid: id };
  switch (kind) {
    case 'staticText':
      return { ...common, width: 100, height: 20, kind: 'staticText', text: 'Text' } satisfies StaticTextElement;
    case 'textField':
      return {
        ...common,
        width: 100,
        height: 20,
        kind: 'textField',
        expression: '$F{}',
      } satisfies TextFieldElement;
    case 'image':
      return {
        ...common,
        width: 100,
        height: 100,
        kind: 'image',
        expression: '""',
      } satisfies ImageElement;
    case 'line':
      return { ...common, width: 100, height: 1, kind: 'line' } satisfies LineElement;
    case 'rectangle':
      return { ...common, width: 100, height: 60, kind: 'rectangle' } satisfies RectangleElement;
    case 'ellipse':
      return { ...common, width: 80, height: 80, kind: 'ellipse' } satisfies EllipseElement;
    case 'frame':
      return {
        ...common,
        width: 200,
        height: 100,
        kind: 'frame',
        children: [],
      } satisfies FrameElement;
    case 'break':
      return { ...common, width: 100, height: 0, kind: 'break' } satisfies BreakElement;
    case 'subreport':
      return {
        ...common,
        width: 200,
        height: 40,
        kind: 'subreport',
        expression: '""',
      } satisfies SubreportElement;
    case 'table':
      return {
        ...common,
        width: 300,
        height: 80,
        kind: 'componentElement',
        componentKind: 'table',
        table: { columns: [{ width: 100 }, { width: 100 }, { width: 100 }] },
      } satisfies TableElement;
    case 'barcode':
      return {
        ...common,
        width: 200,
        height: 80,
        kind: 'componentElement',
        componentKind: 'barcode4j',
        barcode: {
          type: 'Code128',
          codeExpression: '""',
          textPosition: 'bottom',
        },
      } satisfies BarcodeElement;
    case 'pieChart':
      return {
        ...common,
        width: 240,
        height: 180,
        kind: 'chart',
        chartType: 'pieChart',
        dataset: { kind: 'pie', keyExpression: '$F{key}', valueExpression: '$F{value}' },
        showLegend: true,
      } satisfies ChartElement;
    case 'barChart':
      return {
        ...common,
        width: 240,
        height: 180,
        kind: 'chart',
        chartType: 'barChart',
        dataset: {
          kind: 'category',
          series: [{
            seriesExpression: '"Series 1"',
            categoryExpression: '$F{category}',
            valueExpression: '$F{value}',
          }],
        },
        showLegend: true,
      } satisfies ChartElement;
    case 'lineChart':
      return {
        ...common,
        width: 240,
        height: 180,
        kind: 'chart',
        chartType: 'lineChart',
        dataset: {
          kind: 'category',
          series: [{
            seriesExpression: '"Series 1"',
            categoryExpression: '$F{category}',
            valueExpression: '$F{value}',
          }],
        },
        showLegend: true,
      } satisfies ChartElement;
    case 'crosstab':
      return {
        ...common,
        width: 400,
        height: 200,
        kind: 'crosstab',
        rowGroups: [{
          name: 'Row',
          width: 100,
          bucket: { class: 'java.lang.String', expression: '$F{row}' },
        }],
        columnGroups: [{
          name: 'Column',
          height: 24,
          bucket: { class: 'java.lang.String', expression: '$F{column}' },
        }],
        measures: [{
          name: 'Total',
          class: 'java.lang.Double',
          calculation: 'Sum',
          expression: '$F{value}',
        }],
        cellWidth: 100,
        cellHeight: 24,
      } satisfies CrosstabElement;
  }
}

export const PALETTE_ITEMS: { kind: CreatableKind; label: string; icon: string }[] = [
  { kind: 'staticText', label: 'Static Text', icon: 'type' },
  { kind: 'textField', label: 'Text Field', icon: 'variable' },
  { kind: 'image', label: 'Image', icon: 'image' },
  { kind: 'line', label: 'Line', icon: 'minus' },
  { kind: 'rectangle', label: 'Rectangle', icon: 'square' },
  { kind: 'ellipse', label: 'Ellipse', icon: 'circle' },
  { kind: 'frame', label: 'Frame', icon: 'frame' },
  { kind: 'break', label: 'Break', icon: 'corner-down-right' },
  { kind: 'subreport', label: 'Subreport', icon: 'file' },
  { kind: 'table', label: 'Table', icon: 'table' },
  { kind: 'barcode', label: 'Barcode', icon: 'qr-code' },
  { kind: 'pieChart', label: 'Pie Chart', icon: 'pie-chart' },
  { kind: 'barChart', label: 'Bar Chart', icon: 'bar-chart' },
  { kind: 'lineChart', label: 'Line Chart', icon: 'line-chart' },
  { kind: 'crosstab', label: 'Crosstab', icon: 'crosstab' },
];
