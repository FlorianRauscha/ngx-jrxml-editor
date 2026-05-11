import type {
  AnyElement,
  Band,
  BoxBorders,
  ElementCommon,
  Field,
  FrameElement,
  Group,
  ImageElement,
  JasperReport,
  LineElement,
  Parameter,
  Query,
  RectangleElement,
  StaticTextElement,
  Style,
  SubDataset,
  SubreportElement,
  TableCell,
  TableColumn,
  TableComponent,
  TableElement,
  TextFieldElement,
  Variable,
} from '../model';
import type {
  Barcode4jComponent,
  BarcodeElement,
  BreakElement,
  CategoryDataset,
  ChartElement,
  ChartType,
  CrosstabBucket,
  CrosstabColumnGroup,
  CrosstabElement,
  CrosstabMeasure,
  CrosstabRowGroup,
  ElementGroup,
  EllipseElement,
  HyperlinkFields,
  JrProperty,
  PieDataset,
} from '../model/element';
import type { ConditionalStyle, Pen, ParagraphSpacing, TextStyle } from '../model/style';
import { ATTR, cdata, xmlBuilder } from './xml';

type Node = Record<string, unknown>;

const REPORT_ATTR_ORDER: (keyof JasperReport)[] = [
  'name',
  'language',
  'pageWidth',
  'pageHeight',
  'orientation',
  'whenNoDataType',
  'columnWidth',
  'columnSpacing',
  'columnCount',
  'leftMargin',
  'rightMargin',
  'topMargin',
  'bottomMargin',
  'isTitleNewPage',
  'isSummaryNewPage',
  'isSummaryWithPageHeaderAndFooter',
  'isFloatColumnFooter',
  'isIgnorePagination',
  'scriptletClass',
  'resourceBundle',
  'whenResourceMissingType',
  'printOrder',
  'uuid',
];

const REPORT_ELEMENT_ATTR_ORDER = [
  'key',
  'style',
  'positionType',
  'stretchType',
  'isPrintRepeatedValues',
  'mode',
  'x',
  'y',
  'width',
  'height',
  'forecolor',
  'backcolor',
  'printWhenGroupChanges',
  'uuid',
];

export interface SerializeOptions {
  includeXmlDeclaration?: boolean;
}

export function serializeJrxml(report: JasperReport, opts: SerializeOptions = {}): string {
  const root: Node = {};
  const jrAttrs: Node = {
    [ATTR + 'xmlns']: 'http://jasperreports.sourceforge.net/jasperreports',
    [ATTR + 'xmlns:xsi']: 'http://www.w3.org/2001/XMLSchema-instance',
    [ATTR + 'xsi:schemaLocation']:
      'http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd',
  };
  for (const key of REPORT_ATTR_ORDER) {
    const v = report[key];
    if (v !== undefined && typeof v !== 'object') {
      jrAttrs[ATTR + key] = String(v);
    }
  }

  const body: Node = {};
  if (report.properties) {
    body['property'] = report.properties.map((p) => ({
      [ATTR + 'name']: p.name,
      [ATTR + 'value']: p.value,
    }));
  }
  if (report.imports) {
    body['import'] = report.imports.map((value) => ({ [ATTR + 'value']: value }));
  }
  if (report.styles) {
    body['style'] = report.styles.map(serializeStyle);
  }
  if (report.subDatasets) {
    body['subDataset'] = report.subDatasets.map(serializeSubDataset);
  }
  if (report.parameters) {
    body['parameter'] = report.parameters.map(serializeParameter);
  }
  if (report.query) {
    body['queryString'] = serializeQuery(report.query);
  }
  if (report.fields) {
    body['field'] = report.fields.map(serializeField);
  }
  if (report.variables) {
    body['variable'] = report.variables.map(serializeVariable);
  }
  if (report.groups) {
    body['group'] = report.groups.map(serializeGroup);
  }
  Object.assign(body, serializeSections(report));

  root['jasperReport'] = { ...jrAttrs, ...body };

  const xml = xmlBuilder.build(root) as string;
  if (opts.includeXmlDeclaration === false) return xml;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
}

function serializeStyle(s: Style): Node {
  const out: Node = {};
  if (s.name) out[ATTR + 'name'] = s.name;
  if (s.isDefault !== undefined) out[ATTR + 'isDefault'] = String(s.isDefault);
  if (s.parentStyle) out[ATTR + 'style'] = s.parentStyle;
  if (s.forecolor) out[ATTR + 'forecolor'] = s.forecolor;
  if (s.backcolor) out[ATTR + 'backcolor'] = s.backcolor;
  if (s.mode) out[ATTR + 'mode'] = s.mode;
  applyStyleTextAttrs(out, s.text);
  if (s.pen) out['pen'] = serializePen(s.pen);
  if (s.conditionalStyles && s.conditionalStyles.length > 0) {
    out['conditionalStyle'] = s.conditionalStyles.map(serializeConditionalStyle);
  }
  return out;
}

function serializeConditionalStyle(c: ConditionalStyle): Node {
  const out: Node = {};
  if (c.forecolor) out[ATTR + 'forecolor'] = c.forecolor;
  if (c.backcolor) out[ATTR + 'backcolor'] = c.backcolor;
  if (c.mode) out[ATTR + 'mode'] = c.mode;
  applyStyleTextAttrs(out, c.text);
  if (c.pen) out['pen'] = serializePen(c.pen);
  out['conditionExpression'] = cdata(c.conditionExpression);
  return out;
}

/** Emit text/font attributes flattened on a <style> or <conditionalStyle>.
 *  JR 7 uses `bold`/`italic`/...; we keep those forms for compatibility with
 *  Jaspersoft Studio's compact output. */
function applyStyleTextAttrs(out: Node, text: TextStyle | undefined): void {
  if (!text) return;
  if (text.hTextAlign) out[ATTR + 'hTextAlign'] = text.hTextAlign;
  if (text.vTextAlign) out[ATTR + 'vTextAlign'] = text.vTextAlign;
  if (text.rotation) out[ATTR + 'rotation'] = text.rotation;
  if (text.markup) out[ATTR + 'markup'] = text.markup;
  if (text.fontName) out[ATTR + 'fontName'] = text.fontName;
  if (text.size !== undefined) out[ATTR + 'fontSize'] = String(text.size);
  if (text.isBold !== undefined) out[ATTR + 'bold'] = String(text.isBold);
  if (text.isItalic !== undefined) out[ATTR + 'italic'] = String(text.isItalic);
  if (text.isUnderline !== undefined) out[ATTR + 'underline'] = String(text.isUnderline);
  if (text.isStrikeThrough !== undefined)
    out[ATTR + 'strikeThrough'] = String(text.isStrikeThrough);
  if (text.pdfFontName) out[ATTR + 'pdfFontName'] = text.pdfFontName;
  if (text.pdfEncoding) out[ATTR + 'pdfEncoding'] = text.pdfEncoding;
  if (text.isPdfEmbedded !== undefined) out[ATTR + 'pdfEmbedded'] = String(text.isPdfEmbedded);
}

function serializeSubDataset(d: SubDataset): Node {
  const out: Node = { [ATTR + 'name']: d.name };
  if (d.uuid) out[ATTR + 'uuid'] = d.uuid;
  if (d.parameters) out['parameter'] = d.parameters.map(serializeParameter);
  if (d.query) out['queryString'] = serializeQuery(d.query);
  if (d.fields) out['field'] = d.fields.map(serializeField);
  if (d.variables) out['variable'] = d.variables.map(serializeVariable);
  if (d.groups) out['group'] = d.groups.map(serializeGroup);
  return out;
}

function serializeParameter(p: Parameter): Node {
  const out: Node = { [ATTR + 'name']: p.name, [ATTR + 'class']: p.class };
  if (p.isForPrompting !== undefined) out[ATTR + 'isForPrompting'] = String(p.isForPrompting);
  if (p.description) out['parameterDescription'] = cdata(p.description);
  if (p.defaultValueExpression) out['defaultValueExpression'] = cdata(p.defaultValueExpression);
  appendProperties(out, p.properties);
  return out;
}

function serializeQuery(q: Query): Node {
  const out: Node = {};
  if (q.language) out[ATTR + 'language'] = q.language;
  out['__cdata'] = q.text;
  return out;
}

function serializeField(f: Field): Node {
  const out: Node = { [ATTR + 'name']: f.name, [ATTR + 'class']: f.class };
  if (f.description) out['description'] = cdata(f.description);
  appendProperties(out, f.properties);
  return out;
}

function serializeVariable(v: Variable): Node {
  const out: Node = { [ATTR + 'name']: v.name, [ATTR + 'class']: v.class };
  if (v.resetType) out[ATTR + 'resetType'] = v.resetType;
  if (v.resetGroup) out[ATTR + 'resetGroup'] = v.resetGroup;
  if (v.incrementType) out[ATTR + 'incrementType'] = v.incrementType;
  if (v.incrementGroup) out[ATTR + 'incrementGroup'] = v.incrementGroup;
  if (v.calculation) out[ATTR + 'calculation'] = v.calculation;
  if (v.variableExpression) out['variableExpression'] = cdata(v.variableExpression);
  if (v.initialValueExpression) out['initialValueExpression'] = cdata(v.initialValueExpression);
  return out;
}

function serializeGroup(g: Group): Node {
  const out: Node = { [ATTR + 'name']: g.name };
  if (g.isStartNewColumn !== undefined) out[ATTR + 'isStartNewColumn'] = String(g.isStartNewColumn);
  if (g.isStartNewPage !== undefined) out[ATTR + 'isStartNewPage'] = String(g.isStartNewPage);
  if (g.minHeightToStartNewPage !== undefined)
    out[ATTR + 'minHeightToStartNewPage'] = String(g.minHeightToStartNewPage);
  if (g.expression) out['groupExpression'] = cdata(g.expression);
  if (g.groupHeader) out['groupHeader'] = { band: g.groupHeader.map(serializeBand) };
  if (g.groupFooter) out['groupFooter'] = { band: g.groupFooter.map(serializeBand) };
  return out;
}

function serializeSections(report: JasperReport): Node {
  const out: Node = {};
  const s = report.sections;
  // JR 7 compact form: single-band sections are themselves the band (no
  // <band> wrapper). Detail (and group bands) still wrap in <band>.
  const single = ['background', 'title', 'pageHeader', 'columnHeader'] as const;
  for (const key of single) {
    const band = s[key];
    if (band) out[key] = serializeBand(band);
  }
  if (s.detail) out['detail'] = { band: s.detail.map(serializeBand) };
  const tail = ['columnFooter', 'pageFooter', 'lastPageFooter', 'summary', 'noData'] as const;
  for (const key of tail) {
    const band = s[key];
    if (band) out[key] = serializeBand(band);
  }
  return out;
}

function serializeBand(b: Band): Node {
  const out: Node = { [ATTR + 'height']: String(b.height) };
  if (b.splitType) out[ATTR + 'splitType'] = b.splitType;
  if (b.printWhenExpression) out['printWhenExpression'] = cdata(b.printWhenExpression);
  // Charts and crosstabs emit as their own dedicated tag (`<pieChart>`,
  // `<crosstab>`, ...); every other element kind goes through the JR 7
  // compact `<element>` form.
  const elements: Node[] = [];
  const chartBuckets: Record<string, Node[]> = {};
  const crosstabs: Node[] = [];
  for (const el of b.elements) {
    if (el.kind === 'chart') {
      const list = chartBuckets[el.chartType] ?? (chartBuckets[el.chartType] = []);
      list.push(serializeChart(el));
    } else if (el.kind === 'crosstab') {
      crosstabs.push(serializeCrosstab(el));
    } else {
      elements.push(serializeElement(el));
    }
  }
  if (elements.length > 0) out['element'] = elements;
  for (const [tag, nodes] of Object.entries(chartBuckets)) out[tag] = nodes;
  if (crosstabs.length > 0) out['crosstab'] = crosstabs;
  return out;
}

/** Common attributes that always go on the JR 7 <element> tag (geometry, etc.). */
function applyCommonElementAttrs(out: Node, el: ElementCommon): void {
  // Order chosen to mirror Jaspersoft Studio output: kind first, then optional
  // styling, then geometry, then forecolor/backcolor, then uuid.
  if (el.key) out[ATTR + 'key'] = el.key;
  if (el.style) out[ATTR + 'style'] = el.style;
  if (el.positionType) out[ATTR + 'positionType'] = el.positionType;
  if (el.stretchType) out[ATTR + 'stretchType'] = el.stretchType;
  if (el.isPrintRepeatedValues !== undefined)
    out[ATTR + 'printRepeatedValues'] = String(el.isPrintRepeatedValues);
  if (el.removeLineWhenBlank !== undefined)
    out[ATTR + 'removeLineWhenBlank'] = String(el.removeLineWhenBlank);
  if (el.mode) out[ATTR + 'mode'] = el.mode;
  out[ATTR + 'x'] = String(el.x);
  out[ATTR + 'y'] = String(el.y);
  out[ATTR + 'width'] = String(el.width);
  out[ATTR + 'height'] = String(el.height);
  if (el.forecolor) out[ATTR + 'forecolor'] = el.forecolor;
  if (el.backcolor) out[ATTR + 'backcolor'] = el.backcolor;
  if (el.printWhenGroupChanges) out[ATTR + 'printWhenGroupChanges'] = el.printWhenGroupChanges;
  if (el.uuid) out[ATTR + 'uuid'] = el.uuid;
}

/** Append per-element <property> children. */
function appendProperties(out: Node, props: JrProperty[] | undefined): void {
  if (!props || props.length === 0) return;
  out['property'] = props.map((p) => ({
    [ATTR + 'name']: p.name,
    [ATTR + 'value']: p.value,
  }));
}

/** Apply hyperlink-related attributes and child expressions on text fields and
 *  images. Caller should invoke after `applyCommonElementAttrs`. */
function applyHyperlinkAttrs(out: Node, h: HyperlinkFields): void {
  if (h.linkType) out[ATTR + 'hyperlinkType'] = h.linkType;
  if (h.linkTarget) out[ATTR + 'hyperlinkTarget'] = h.linkTarget;
}

function appendHyperlinkChildren(out: Node, h: HyperlinkFields): void {
  if (h.hyperlinkReferenceExpression)
    out['hyperlinkReferenceExpression'] = cdata(h.hyperlinkReferenceExpression);
  if (h.hyperlinkAnchorExpression)
    out['hyperlinkAnchorExpression'] = cdata(h.hyperlinkAnchorExpression);
  if (h.hyperlinkPageExpression)
    out['hyperlinkPageExpression'] = cdata(h.hyperlinkPageExpression);
  if (h.hyperlinkTooltipExpression)
    out['hyperlinkTooltipExpression'] = cdata(h.hyperlinkTooltipExpression);
  if (h.hyperlinkWhenExpression)
    out['hyperlinkWhenExpression'] = cdata(h.hyperlinkWhenExpression);
  if (h.hyperlinkParameters && h.hyperlinkParameters.length > 0) {
    out['hyperlinkParameter'] = h.hyperlinkParameters.map((p) => ({
      [ATTR + 'name']: p.name,
      hyperlinkParameterExpression: cdata(p.expression),
    }));
  }
}

function applyTextStyleAttrs(out: Node, ts: TextStyle | undefined): void {
  if (!ts) return;
  if (ts.fontName) out[ATTR + 'fontName'] = ts.fontName;
  if (ts.size !== undefined) out[ATTR + 'fontSize'] = String(ts.size);
  if (ts.isBold !== undefined) out[ATTR + 'bold'] = String(ts.isBold);
  if (ts.isItalic !== undefined) out[ATTR + 'italic'] = String(ts.isItalic);
  if (ts.isUnderline !== undefined) out[ATTR + 'underline'] = String(ts.isUnderline);
  if (ts.isStrikeThrough !== undefined) out[ATTR + 'strikeThrough'] = String(ts.isStrikeThrough);
  if (ts.pdfFontName) out[ATTR + 'pdfFontName'] = ts.pdfFontName;
  if (ts.pdfEncoding) out[ATTR + 'pdfEncoding'] = ts.pdfEncoding;
  if (ts.isPdfEmbedded !== undefined) out[ATTR + 'pdfEmbedded'] = String(ts.isPdfEmbedded);
  if (ts.hTextAlign) out[ATTR + 'hTextAlign'] = ts.hTextAlign;
  if (ts.vTextAlign) out[ATTR + 'vTextAlign'] = ts.vTextAlign;
  if (ts.rotation) out[ATTR + 'rotation'] = ts.rotation;
  if (ts.markup) out[ATTR + 'markup'] = ts.markup;
}

function serializeElement(el: AnyElement): Node {
  switch (el.kind) {
    case 'staticText':
      return serializeStaticText(el);
    case 'textField':
      return serializeTextField(el);
    case 'image':
      return serializeImage(el);
    case 'line':
      return serializeLine(el);
    case 'rectangle':
      return serializeRectangle(el);
    case 'ellipse':
      return serializeEllipse(el);
    case 'frame':
      return serializeFrame(el);
    case 'break':
      return serializeBreak(el);
    case 'subreport':
      return serializeSubreport(el);
    case 'elementGroup':
      return serializeElementGroup(el);
    case 'componentElement':
      return serializeTableElement(el);
    case 'chart':
      return serializeChart(el);
    case 'crosstab':
      return serializeCrosstab(el);
  }
}

function serializeElementGroup(el: ElementGroup): Node {
  const out: Node = { [ATTR + 'kind']: 'elementGroup' };
  if (el.children.length > 0) out['element'] = el.children.map(serializeElement);
  return out;
}

function serializeStaticText(el: StaticTextElement): Node {
  const out: Node = { [ATTR + 'kind']: 'staticText' };
  applyCommonElementAttrs(out, el);
  if (el.textAdjust) out[ATTR + 'textAdjust'] = el.textAdjust;
  applyTextStyleAttrs(out, el.textStyle);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.textStyle?.paragraph) {
    const p = serializeParagraph(el.textStyle.paragraph);
    if (Object.keys(p).length > 0) out['paragraph'] = p;
  }
  if (el.box) out['box'] = serializeBox(el.box);
  out['text'] = cdata(el.text);
  appendProperties(out, el.properties);
  return out;
}

function serializeTextField(el: TextFieldElement): Node {
  const out: Node = { [ATTR + 'kind']: 'textField' };
  if (el.pattern) out[ATTR + 'pattern'] = el.pattern;
  if (el.isStretchWithOverflow !== undefined)
    out[ATTR + 'stretchWithOverflow'] = String(el.isStretchWithOverflow);
  if (el.textAdjust) out[ATTR + 'textAdjust'] = el.textAdjust;
  if (el.isBlankWhenNull !== undefined) out[ATTR + 'blankWhenNull'] = String(el.isBlankWhenNull);
  if (el.evaluationTime) out[ATTR + 'evaluationTime'] = el.evaluationTime;
  if (el.evaluationGroup) out[ATTR + 'evaluationGroup'] = el.evaluationGroup;
  applyCommonElementAttrs(out, el);
  applyHyperlinkAttrs(out, el);
  applyTextStyleAttrs(out, el.textStyle);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.textStyle?.paragraph) {
    const p = serializeParagraph(el.textStyle.paragraph);
    if (Object.keys(p).length > 0) out['paragraph'] = p;
  }
  if (el.box) out['box'] = serializeBox(el.box);
  out['expression'] = cdata(el.expression);
  appendHyperlinkChildren(out, el);
  appendProperties(out, el.properties);
  return out;
}

function serializeImage(el: ImageElement): Node {
  const out: Node = { [ATTR + 'kind']: 'image' };
  if (el.scaleImage) out[ATTR + 'scaleImage'] = el.scaleImage;
  // JR 7 emits hImageAlign/vImageAlign on <image>.
  if (el.hAlign) out[ATTR + 'hImageAlign'] = el.hAlign;
  if (el.vAlign) out[ATTR + 'vImageAlign'] = el.vAlign;
  if (el.isUsingCache !== undefined) out[ATTR + 'usingCache'] = String(el.isUsingCache);
  if (el.isLazy !== undefined) out[ATTR + 'lazy'] = String(el.isLazy);
  if (el.onErrorType) out[ATTR + 'onErrorType'] = el.onErrorType;
  applyCommonElementAttrs(out, el);
  applyHyperlinkAttrs(out, el);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.box) out['box'] = serializeBox(el.box);
  out['expression'] = cdata(el.expression);
  appendHyperlinkChildren(out, el);
  appendProperties(out, el.properties);
  return out;
}

function serializeLine(el: LineElement): Node {
  const out: Node = { [ATTR + 'kind']: 'line' };
  if (el.direction) out[ATTR + 'direction'] = el.direction;
  applyCommonElementAttrs(out, el);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.pen) out['pen'] = serializePen(el.pen);
  appendProperties(out, el.properties);
  return out;
}

function serializeRectangle(el: RectangleElement): Node {
  const out: Node = { [ATTR + 'kind']: 'rectangle' };
  if (el.radius !== undefined) out[ATTR + 'radius'] = String(el.radius);
  applyCommonElementAttrs(out, el);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.pen) out['pen'] = serializePen(el.pen);
  appendProperties(out, el.properties);
  return out;
}

function serializeEllipse(el: EllipseElement): Node {
  const out: Node = { [ATTR + 'kind']: 'ellipse' };
  applyCommonElementAttrs(out, el);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.pen) out['pen'] = serializePen(el.pen);
  appendProperties(out, el.properties);
  return out;
}

function serializeFrame(el: FrameElement): Node {
  const out: Node = { [ATTR + 'kind']: 'frame' };
  applyCommonElementAttrs(out, el);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.box) out['box'] = serializeBox(el.box);
  if (el.children.length > 0) out['element'] = el.children.map(serializeElement);
  appendProperties(out, el.properties);
  return out;
}

function serializeBreak(el: BreakElement): Node {
  const out: Node = { [ATTR + 'kind']: 'break' };
  if (el.type) out[ATTR + 'type'] = el.type;
  applyCommonElementAttrs(out, el);
  return out;
}

function serializeSubreport(el: SubreportElement): Node {
  const out: Node = { [ATTR + 'kind']: 'subreport' };
  if (el.isUsingCache !== undefined) out[ATTR + 'usingCache'] = String(el.isUsingCache);
  if (el.runToBottom !== undefined) out[ATTR + 'runToBottom'] = String(el.runToBottom);
  if (el.overflowType) out[ATTR + 'overflowType'] = el.overflowType;
  applyCommonElementAttrs(out, el);
  if (el.printWhenExpression) out['printWhenExpression'] = cdata(el.printWhenExpression);
  if (el.parametersMapExpression)
    out['parametersMapExpression'] = cdata(el.parametersMapExpression);
  if (el.subreportParameters && el.subreportParameters.length > 0) {
    // JR 7 short form: <parameter name=".."><expression>...</expression></parameter>
    out['parameter'] = el.subreportParameters.map((p) => ({
      [ATTR + 'name']: p.name,
      expression: cdata(p.expression),
    }));
  }
  if (el.connectionExpression) out['connectionExpression'] = cdata(el.connectionExpression);
  if (el.dataSourceExpression) out['dataSourceExpression'] = cdata(el.dataSourceExpression);
  out['expression'] = cdata(el.expression);
  appendProperties(out, el.properties);
  return out;
}

/** Charts use the legacy form `<pieChart>...<chart><reportElement.../></chart>...`.
 *  JR 7 still accepts this exactly; the compact `<element kind="pieChart">` form
 *  is not a documented schema for charts, so we keep the legacy structure. */
function serializeChart(el: ChartElement): Node {
  const reportElement: Node = {};
  if (el.key) reportElement[ATTR + 'key'] = el.key;
  if (el.style) reportElement[ATTR + 'style'] = el.style;
  if (el.positionType) reportElement[ATTR + 'positionType'] = el.positionType;
  if (el.stretchType) reportElement[ATTR + 'stretchType'] = el.stretchType;
  if (el.mode) reportElement[ATTR + 'mode'] = el.mode;
  reportElement[ATTR + 'x'] = String(el.x);
  reportElement[ATTR + 'y'] = String(el.y);
  reportElement[ATTR + 'width'] = String(el.width);
  reportElement[ATTR + 'height'] = String(el.height);
  if (el.forecolor) reportElement[ATTR + 'forecolor'] = el.forecolor;
  if (el.backcolor) reportElement[ATTR + 'backcolor'] = el.backcolor;
  if (el.uuid) reportElement[ATTR + 'uuid'] = el.uuid;

  const chartNode: Node = { reportElement };
  if (el.showLegend !== undefined) chartNode[ATTR + 'isShowLegend'] = String(el.showLegend);
  if (el.titleExpression) chartNode['titleExpression'] = cdata(el.titleExpression);
  if (el.subtitleExpression) chartNode['subtitleExpression'] = cdata(el.subtitleExpression);

  const out: Node = { chart: chartNode };

  if (el.dataset.kind === 'pie') {
    out['pieDataset'] = serializePieDataset(el.dataset);
    out['piePlot'] = { plot: {} };
  } else {
    out['categoryDataset'] = serializeCategoryDataset(el.dataset);
    const plotKey = chartTypeToPlotKey(el.chartType);
    const plot: Node = { plot: {} };
    if (el.categoryAxisLabelExpression)
      plot['categoryAxisLabelExpression'] = cdata(el.categoryAxisLabelExpression);
    if (el.valueAxisLabelExpression)
      plot['valueAxisLabelExpression'] = cdata(el.valueAxisLabelExpression);
    out[plotKey] = plot;
  }

  if (el.printWhenExpression) {
    chartNode['reportElement'] = {
      ...reportElement,
      printWhenExpression: cdata(el.printWhenExpression),
    };
  }
  return out;
}

function chartTypeToPlotKey(t: ChartType): string {
  switch (t) {
    case 'barChart':
    case 'stackedBarChart':
      return 'barPlot';
    case 'bar3DChart':
      return 'bar3DPlot';
    case 'lineChart':
      return 'linePlot';
    case 'areaChart':
    case 'stackedAreaChart':
      return 'areaPlot';
    default:
      return 'barPlot';
  }
}

function serializePieDataset(d: PieDataset): Node {
  const out: Node = { dataset: {} };
  if (d.keyExpression) out['keyExpression'] = cdata(d.keyExpression);
  if (d.valueExpression) out['valueExpression'] = cdata(d.valueExpression);
  if (d.labelExpression) out['labelExpression'] = cdata(d.labelExpression);
  return out;
}

/** Emit a `<crosstab>` element. We only model groups + measures + datasetRun;
 *  cell / header contents are regenerated with sensible defaults so the
 *  resulting JRXML compiles. */
function serializeCrosstab(el: CrosstabElement): Node {
  const reportElement: Node = {};
  if (el.key) reportElement[ATTR + 'key'] = el.key;
  if (el.style) reportElement[ATTR + 'style'] = el.style;
  if (el.positionType) reportElement[ATTR + 'positionType'] = el.positionType;
  if (el.stretchType) reportElement[ATTR + 'stretchType'] = el.stretchType;
  if (el.mode) reportElement[ATTR + 'mode'] = el.mode;
  reportElement[ATTR + 'x'] = String(el.x);
  reportElement[ATTR + 'y'] = String(el.y);
  reportElement[ATTR + 'width'] = String(el.width);
  reportElement[ATTR + 'height'] = String(el.height);
  if (el.forecolor) reportElement[ATTR + 'forecolor'] = el.forecolor;
  if (el.backcolor) reportElement[ATTR + 'backcolor'] = el.backcolor;
  if (el.uuid) reportElement[ATTR + 'uuid'] = el.uuid;

  const out: Node = {};
  if (el.isRepeatColumnHeaders !== undefined)
    out[ATTR + 'isRepeatColumnHeaders'] = String(el.isRepeatColumnHeaders);
  if (el.isRepeatRowHeaders !== undefined)
    out[ATTR + 'isRepeatRowHeaders'] = String(el.isRepeatRowHeaders);
  out['reportElement'] = reportElement;

  if (el.datasetRun) {
    const dr: Node = { [ATTR + 'subDataset']: el.datasetRun.subDataset };
    if (el.datasetRun.parametersMapExpression)
      dr['parametersMapExpression'] = cdata(el.datasetRun.parametersMapExpression);
    if (el.datasetRun.parameters && el.datasetRun.parameters.length > 0) {
      dr['datasetParameter'] = el.datasetRun.parameters.map((p) => ({
        [ATTR + 'name']: p.name,
        datasetParameterExpression: cdata(p.expression),
      }));
    }
    if (el.datasetRun.connectionExpression)
      dr['connectionExpression'] = cdata(el.datasetRun.connectionExpression);
    if (el.datasetRun.dataSourceExpression)
      dr['dataSourceExpression'] = cdata(el.datasetRun.dataSourceExpression);
    out['crosstabDataset'] = { dataset: { datasetRun: dr } };
  }

  if (el.rowGroups.length > 0) {
    out['rowGroup'] = el.rowGroups.map((g) => serializeCrosstabRowGroup(g));
  }
  if (el.columnGroups.length > 0) {
    out['columnGroup'] = el.columnGroups.map((g) => serializeCrosstabColumnGroup(g));
  }
  if (el.measures.length > 0) {
    out['measure'] = el.measures.map((m) => serializeCrosstabMeasure(m));
  }

  // Default cell shells — JR requires at least one <crosstabCell> for each
  // (rowGroup-totals × columnGroup-totals) intersection. The default cell
  // contains no children; users can still customize externally.
  const cellW = el.cellWidth ?? 100;
  const cellH = el.cellHeight ?? 20;
  out['crosstabCell'] = [{
    [ATTR + 'width']: String(cellW),
    [ATTR + 'height']: String(cellH),
    cellContents: { box: {} },
  }];

  return out;
}

function serializeCrosstabRowGroup(g: CrosstabRowGroup): Node {
  const out: Node = { [ATTR + 'name']: g.name, [ATTR + 'width']: String(g.width) };
  if (g.totalPosition) out[ATTR + 'totalPosition'] = g.totalPosition;
  if (g.headerPosition) out[ATTR + 'headerPosition'] = g.headerPosition;
  out['bucket'] = serializeCrosstabBucket(g.bucket);
  // JR requires <crosstabRowHeader> with a <cellContents> shell. We emit an
  // empty one — users can swap it out if they need custom rendering.
  out['crosstabRowHeader'] = { cellContents: { box: {} } };
  return out;
}

function serializeCrosstabColumnGroup(g: CrosstabColumnGroup): Node {
  const out: Node = { [ATTR + 'name']: g.name, [ATTR + 'height']: String(g.height) };
  if (g.totalPosition) out[ATTR + 'totalPosition'] = g.totalPosition;
  if (g.headerPosition) out[ATTR + 'headerPosition'] = g.headerPosition;
  out['bucket'] = serializeCrosstabBucket(g.bucket);
  out['crosstabColumnHeader'] = { cellContents: { box: {} } };
  return out;
}

function serializeCrosstabMeasure(m: CrosstabMeasure): Node {
  const out: Node = { [ATTR + 'name']: m.name, [ATTR + 'class']: m.class };
  if (m.calculation) out[ATTR + 'calculation'] = m.calculation;
  if (m.expression) out['measureExpression'] = cdata(m.expression);
  return out;
}

function serializeCrosstabBucket(b: CrosstabBucket): Node {
  const out: Node = {};
  if (b.class) out[ATTR + 'class'] = b.class;
  if (b.expression) out['bucketExpression'] = cdata(b.expression);
  if (b.orderByExpression) out['orderByExpression'] = cdata(b.orderByExpression);
  if (b.comparatorExpression) out['comparatorExpression'] = cdata(b.comparatorExpression);
  return out;
}

function serializeCategoryDataset(d: CategoryDataset): Node {
  const out: Node = { dataset: {} };
  out['categorySeries'] = d.series.map((s) => {
    const cs: Node = {};
    if (s.seriesExpression) cs['seriesExpression'] = cdata(s.seriesExpression);
    if (s.categoryExpression) cs['categoryExpression'] = cdata(s.categoryExpression);
    if (s.valueExpression) cs['valueExpression'] = cdata(s.valueExpression);
    if (s.labelExpression) cs['labelExpression'] = cdata(s.labelExpression);
    return cs;
  });
  return out;
}

/** Tables stay in the legacy <componentElement>/<jr:table> form — JR 7 still
 *  accepts it, and it's safer than guessing the new component schema. */
function serializeTableElement(el: TableElement | BarcodeElement): Node {
  const out: Node = { [ATTR + 'kind']: 'component' };
  applyCommonElementAttrs(out, el);
  if (el.componentKind === 'table') {
    out['jr:table'] = serializeTable(el.table);
  } else {
    out['jr:barcode4j'] = serializeBarcode4j(el.barcode);
  }
  return out;
}

function serializeBarcode4j(b: Barcode4jComponent): Node {
  const out: Node = {
    [ATTR + 'xmlns:jr']: 'http://jasperreports.sourceforge.net/jasperreports/components',
    [ATTR + 'xmlns:xsi']: 'http://www.w3.org/2001/XMLSchema-instance',
    [ATTR + 'xsi:schemaLocation']:
      'http://jasperreports.sourceforge.net/jasperreports/components http://jasperreports.sourceforge.net/xsd/components.xsd',
    [ATTR + 'type']: b.type,
  };
  if (b.textPosition) out[ATTR + 'textPosition'] = b.textPosition;
  if (b.checksumMode) out[ATTR + 'checksumMode'] = b.checksumMode;
  if (b.moduleWidth !== undefined) out[ATTR + 'moduleWidth'] = String(b.moduleWidth);
  if (b.errorCorrectionLevel) out[ATTR + 'errorCorrectionLevel'] = b.errorCorrectionLevel;
  if (b.orientation !== undefined) out[ATTR + 'orientation'] = String(b.orientation);
  if (b.codeExpression) out['jr:codeExpression'] = cdata(b.codeExpression);
  if (b.patternExpression) out['jr:patternExpression'] = cdata(b.patternExpression);
  return out;
}

function serializeTable(t: TableComponent): Node {
  const out: Node = {
    [ATTR + 'xmlns:jr']: 'http://jasperreports.sourceforge.net/jasperreports/components',
    [ATTR + 'xmlns:xsi']: 'http://www.w3.org/2001/XMLSchema-instance',
    [ATTR + 'xsi:schemaLocation']:
      'http://jasperreports.sourceforge.net/jasperreports/components http://jasperreports.sourceforge.net/xsd/components.xsd',
  };
  if (t.whenNoDataType) out[ATTR + 'whenNoDataType'] = t.whenNoDataType;
  if (t.uuid) out[ATTR + 'uuid'] = t.uuid;
  if (t.datasetRun) {
    const dr: Node = { [ATTR + 'subDataset']: t.datasetRun.subDataset };
    if (t.datasetRun.parametersMapExpression)
      dr['parametersMapExpression'] = cdata(t.datasetRun.parametersMapExpression);
    if (t.datasetRun.parameters && t.datasetRun.parameters.length > 0) {
      dr['datasetParameter'] = t.datasetRun.parameters.map((p) => ({
        [ATTR + 'name']: p.name,
        datasetParameterExpression: cdata(p.expression),
      }));
    }
    if (t.datasetRun.connectionExpression)
      dr['connectionExpression'] = cdata(t.datasetRun.connectionExpression);
    if (t.datasetRun.dataSourceExpression)
      dr['dataSourceExpression'] = cdata(t.datasetRun.dataSourceExpression);
    out['datasetRun'] = dr;
  }
  out['jr:column'] = t.columns.map(serializeTableColumn);
  return out;
}

function serializeTableColumn(c: TableColumn): Node {
  const out: Node = { [ATTR + 'width']: String(c.width) };
  if (c.uuid) out[ATTR + 'uuid'] = c.uuid;
  if (c.printWhenExpression) out['printWhenExpression'] = cdata(c.printWhenExpression);
  if (c.tableHeader) out['jr:tableHeader'] = serializeTableCell(c.tableHeader);
  if (c.tableFooter) out['jr:tableFooter'] = serializeTableCell(c.tableFooter);
  if (c.columnHeader) out['jr:columnHeader'] = serializeTableCell(c.columnHeader);
  if (c.columnFooter) out['jr:columnFooter'] = serializeTableCell(c.columnFooter);
  if (c.detailCell) out['jr:detailCell'] = serializeTableCell(c.detailCell);
  return out;
}

function serializeTableCell(cell: TableCell): Node {
  const out: Node = {};
  if (cell.height !== undefined) out[ATTR + 'height'] = String(cell.height);
  if (cell.width !== undefined) out[ATTR + 'width'] = String(cell.width);
  if (cell.rowSpan !== undefined) out[ATTR + 'rowSpan'] = String(cell.rowSpan);
  if (cell.style) out[ATTR + 'style'] = cell.style;
  if (cell.box) out['box'] = serializeBox(cell.box);
  if (cell.children.length > 0) out['element'] = cell.children.map(serializeElement);
  return out;
}

function serializeTextElement(t: TextStyle | undefined): Node | undefined {
  if (!t) return undefined;
  const out: Node = {};
  if (t.hTextAlign) out[ATTR + 'textAlignment'] = t.hTextAlign;
  if (t.vTextAlign) out[ATTR + 'verticalAlignment'] = t.vTextAlign;
  if (t.rotation) out[ATTR + 'rotation'] = t.rotation;
  if (t.markup) out[ATTR + 'markup'] = t.markup;
  const fontNode: Node = {};
  if (t.fontName) fontNode[ATTR + 'fontName'] = t.fontName;
  if (t.size !== undefined) fontNode[ATTR + 'size'] = String(t.size);
  if (t.isBold !== undefined) fontNode[ATTR + 'isBold'] = String(t.isBold);
  if (t.isItalic !== undefined) fontNode[ATTR + 'isItalic'] = String(t.isItalic);
  if (t.isUnderline !== undefined) fontNode[ATTR + 'isUnderline'] = String(t.isUnderline);
  if (t.isStrikeThrough !== undefined) fontNode[ATTR + 'isStrikeThrough'] = String(t.isStrikeThrough);
  if (t.pdfFontName) fontNode[ATTR + 'pdfFontName'] = t.pdfFontName;
  if (t.pdfEncoding) fontNode[ATTR + 'pdfEncoding'] = t.pdfEncoding;
  if (t.isPdfEmbedded !== undefined) fontNode[ATTR + 'isPdfEmbedded'] = String(t.isPdfEmbedded);
  if (Object.keys(fontNode).length > 0) out['font'] = fontNode;
  if (t.paragraph) {
    const p = serializeParagraph(t.paragraph);
    if (Object.keys(p).length > 0) out['paragraph'] = p;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

function serializeParagraph(p: ParagraphSpacing): Node {
  const out: Node = {};
  if (p.lineSpacing) out[ATTR + 'lineSpacing'] = p.lineSpacing;
  if (p.lineSpacingSize !== undefined) out[ATTR + 'lineSpacingSize'] = String(p.lineSpacingSize);
  if (p.firstLineIndent !== undefined) out[ATTR + 'firstLineIndent'] = String(p.firstLineIndent);
  if (p.leftIndent !== undefined) out[ATTR + 'leftIndent'] = String(p.leftIndent);
  if (p.rightIndent !== undefined) out[ATTR + 'rightIndent'] = String(p.rightIndent);
  if (p.spacingBefore !== undefined) out[ATTR + 'spacingBefore'] = String(p.spacingBefore);
  if (p.spacingAfter !== undefined) out[ATTR + 'spacingAfter'] = String(p.spacingAfter);
  return out;
}

function serializePen(pen: Pen): Node {
  const out: Node = {};
  if (pen.lineWidth !== undefined) out[ATTR + 'lineWidth'] = String(pen.lineWidth);
  if (pen.lineStyle) out[ATTR + 'lineStyle'] = pen.lineStyle;
  if (pen.lineColor) out[ATTR + 'lineColor'] = pen.lineColor;
  return out;
}

function serializeBox(box: BoxBorders): Node {
  const out: Node = {};
  if (box.padding !== undefined) out[ATTR + 'padding'] = String(box.padding);
  if (box.topPadding !== undefined) out[ATTR + 'topPadding'] = String(box.topPadding);
  if (box.leftPadding !== undefined) out[ATTR + 'leftPadding'] = String(box.leftPadding);
  if (box.bottomPadding !== undefined) out[ATTR + 'bottomPadding'] = String(box.bottomPadding);
  if (box.rightPadding !== undefined) out[ATTR + 'rightPadding'] = String(box.rightPadding);
  if (box.pen) out['pen'] = serializePen(box.pen);
  if (box.topPen) out['topPen'] = serializePen(box.topPen);
  if (box.leftPen) out['leftPen'] = serializePen(box.leftPen);
  if (box.bottomPen) out['bottomPen'] = serializePen(box.bottomPen);
  if (box.rightPen) out['rightPen'] = serializePen(box.rightPen);
  return out;
}
