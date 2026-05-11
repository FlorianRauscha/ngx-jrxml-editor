import type {
  AnyElement,
  Band,
  BandSections,
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
  ReportProperty,
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
  EllipseElement,
  BreakElement,
  BoxBorders,
  ElementGroup,
  HyperlinkFields,
  JrProperty,
  TextAdjust,
} from '../model/element';
import type { ConditionalStyle, TextStyle, Pen, ParagraphSpacing } from '../model/style';
import { ATTR, asArray, readText, xmlParser } from './xml';

type AnyAttrs = Record<string, unknown>;

function attr(node: AnyAttrs | undefined, name: string): string | undefined {
  if (!node) return undefined;
  const v = node[ATTR + name];
  return v === undefined ? undefined : String(v);
}

function attrNum(node: AnyAttrs | undefined, name: string): number | undefined {
  const v = attr(node, name);
  return v === undefined ? undefined : Number(v);
}

function attrBool(node: AnyAttrs | undefined, name: string): boolean | undefined {
  const v = attr(node, name);
  return v === undefined ? undefined : v === 'true';
}

export function parseJrxml(xml: string): JasperReport {
  const tree = xmlParser.parse(xml) as Record<string, unknown>;
  const root = tree['jasperReport'] as AnyAttrs;
  if (!root) throw new Error('parseJrxml: missing <jasperReport> root');
  return parseJasperReport(root);
}

function parseJasperReport(node: AnyAttrs): JasperReport {
  const report: JasperReport = {
    name: attr(node, 'name') ?? 'Untitled',
    uuid: attr(node, 'uuid'),
    language: attr(node, 'language'),
    pageWidth: attrNum(node, 'pageWidth'),
    pageHeight: attrNum(node, 'pageHeight'),
    columnWidth: attrNum(node, 'columnWidth'),
    columnCount: attrNum(node, 'columnCount'),
    columnSpacing: attrNum(node, 'columnSpacing'),
    leftMargin: attrNum(node, 'leftMargin'),
    rightMargin: attrNum(node, 'rightMargin'),
    topMargin: attrNum(node, 'topMargin'),
    bottomMargin: attrNum(node, 'bottomMargin'),
    orientation: attr(node, 'orientation') as JasperReport['orientation'],
    whenNoDataType: attr(node, 'whenNoDataType') as JasperReport['whenNoDataType'],
    isTitleNewPage: attrBool(node, 'isTitleNewPage'),
    isSummaryNewPage: attrBool(node, 'isSummaryNewPage'),
    isSummaryWithPageHeaderAndFooter: attrBool(node, 'isSummaryWithPageHeaderAndFooter'),
    isFloatColumnFooter: attrBool(node, 'isFloatColumnFooter'),
    isIgnorePagination: attrBool(node, 'isIgnorePagination'),
    scriptletClass: attr(node, 'scriptletClass'),
    resourceBundle: attr(node, 'resourceBundle'),
    whenResourceMissingType: attr(node, 'whenResourceMissingType') as JasperReport['whenResourceMissingType'],
    printOrder: attr(node, 'printOrder') as JasperReport['printOrder'],
    properties: parseProperties(node),
    imports: parseImports(node),
    styles: parseStyles(node),
    subDatasets: parseSubDatasets(node),
    parameters: parseParameters(node),
    query: parseQuery(node['queryString']),
    fields: parseFields(node),
    variables: parseVariables(node),
    groups: parseGroups(node),
    sections: parseSections(node),
  };
  return stripUndefined(report);
}

function parseProperties(node: AnyAttrs): ReportProperty[] | undefined {
  const props = asArray(node['property'] as AnyAttrs | AnyAttrs[] | undefined);
  if (props.length === 0) return undefined;
  return props.map((p) => ({
    name: attr(p, 'name') ?? '',
    value: attr(p, 'value') ?? '',
  }));
}

function parseImports(node: AnyAttrs): string[] | undefined {
  const imports = asArray(node['import'] as AnyAttrs | AnyAttrs[] | undefined);
  if (imports.length === 0) return undefined;
  return imports.map((imp) => attr(imp, 'value') ?? '');
}

function parseStyles(node: AnyAttrs): Style[] | undefined {
  const styles = asArray(node['style'] as AnyAttrs | AnyAttrs[] | undefined);
  if (styles.length === 0) return undefined;
  return styles.map((s): Style => ({
    name: attr(s, 'name') ?? '',
    isDefault: attrBool(s, 'isDefault'),
    parentStyle: attr(s, 'style'),
    forecolor: attr(s, 'forecolor'),
    backcolor: attr(s, 'backcolor'),
    mode: attr(s, 'mode') as Style['mode'],
    pen: parsePen(s['pen'] as AnyAttrs | undefined),
    text: parseTextStyleFromAttrs(s),
    conditionalStyles: parseConditionalStyles(s),
  }));
}

function parseConditionalStyles(node: AnyAttrs): ConditionalStyle[] | undefined {
  const list = asArray(node['conditionalStyle'] as AnyAttrs | AnyAttrs[] | undefined);
  if (list.length === 0) return undefined;
  return list.map((c): ConditionalStyle => ({
    conditionExpression: readText(c['conditionExpression']) ?? '',
    forecolor: attr(c, 'forecolor'),
    backcolor: attr(c, 'backcolor'),
    mode: attr(c, 'mode') as ConditionalStyle['mode'],
    pen: parsePen(c['pen'] as AnyAttrs | undefined),
    text: parseTextStyleFromAttrs(c),
  }));
}

function parseSubDatasets(node: AnyAttrs): SubDataset[] | undefined {
  const datasets = asArray(node['subDataset'] as AnyAttrs | AnyAttrs[] | undefined);
  if (datasets.length === 0) return undefined;
  return datasets.map((d) => ({
    name: attr(d, 'name') ?? '',
    uuid: attr(d, 'uuid'),
    parameters: parseParameters(d),
    fields: parseFields(d),
    variables: parseVariables(d),
    groups: parseGroups(d),
    query: parseQuery(d['queryString']),
  }));
}

function parseParameters(node: AnyAttrs): Parameter[] | undefined {
  const params = asArray(node['parameter'] as AnyAttrs | AnyAttrs[] | undefined);
  if (params.length === 0) return undefined;
  return params.map((p) => ({
    name: attr(p, 'name') ?? '',
    class: attr(p, 'class') ?? 'java.lang.String',
    isForPrompting: attrBool(p, 'isForPrompting'),
    description: readText(p['parameterDescription']) ?? readText(p['description']),
    defaultValueExpression: readText(p['defaultValueExpression']),
    properties: parseProperties(p),
  }));
}

function parseQuery(node: unknown): Query | undefined {
  if (!node) return undefined;
  const text = readText(node);
  if (text === undefined) return undefined;
  const lang = typeof node === 'object' ? attr(node as AnyAttrs, 'language') : undefined;
  return { language: lang, text };
}

function parseFields(node: AnyAttrs): Field[] | undefined {
  const fields = asArray(node['field'] as AnyAttrs | AnyAttrs[] | undefined);
  if (fields.length === 0) return undefined;
  return fields.map((f) => ({
    name: attr(f, 'name') ?? '',
    class: attr(f, 'class') ?? 'java.lang.String',
    description: readText(f['fieldDescription']) ?? readText(f['description']),
    properties: parseProperties(f),
  }));
}

function parseVariables(node: AnyAttrs): Variable[] | undefined {
  const vars = asArray(node['variable'] as AnyAttrs | AnyAttrs[] | undefined);
  if (vars.length === 0) return undefined;
  return vars.map((v) => ({
    name: attr(v, 'name') ?? '',
    class: attr(v, 'class') ?? 'java.lang.String',
    resetType: attr(v, 'resetType') as Variable['resetType'],
    resetGroup: attr(v, 'resetGroup'),
    incrementType: attr(v, 'incrementType') as Variable['incrementType'],
    incrementGroup: attr(v, 'incrementGroup'),
    calculation: attr(v, 'calculation') as Variable['calculation'],
    variableExpression: readText(v['variableExpression']),
    initialValueExpression: readText(v['initialValueExpression']),
  }));
}

function parseGroups(node: AnyAttrs): Group[] | undefined {
  const groups = asArray(node['group'] as AnyAttrs | AnyAttrs[] | undefined);
  if (groups.length === 0) return undefined;
  return groups.map((g) => ({
    name: attr(g, 'name') ?? '',
    expression: readText(g['groupExpression']),
    isStartNewColumn: attrBool(g, 'isStartNewColumn'),
    isStartNewPage: attrBool(g, 'isStartNewPage'),
    minHeightToStartNewPage: attrNum(g, 'minHeightToStartNewPage'),
    groupHeader: parseGroupBands(g['groupHeader']),
    groupFooter: parseGroupBands(g['groupFooter']),
  }));
}

function parseGroupBands(node: unknown): Band[] | undefined {
  if (!node) return undefined;
  const obj = node as AnyAttrs;
  const bands = asArray(obj['band'] as AnyAttrs | AnyAttrs[] | undefined);
  if (bands.length === 0) return undefined;
  return bands.map((b) => parseBand(b));
}

function parseSections(node: AnyAttrs): BandSections {
  const sections: BandSections = {};
  const sectionKeys = [
    'background',
    'title',
    'pageHeader',
    'columnHeader',
    'columnFooter',
    'pageFooter',
    'lastPageFooter',
    'summary',
    'noData',
  ] as const;
  for (const key of sectionKeys) {
    const sec = node[key] as AnyAttrs | undefined;
    if (!sec) continue;
    if (sec['band']) {
      // Legacy form: <title><band height="..">...</band></title>
      sections[key] = parseBand(sec['band'] as AnyAttrs);
    } else if (sectionLooksLikeBand(sec)) {
      // JR 7 compact form: <title height=".."> <element ... /> </title>
      sections[key] = parseBand(sec);
    }
  }
  const detail = node['detail'] as AnyAttrs | undefined;
  if (detail) {
    if (detail['band']) {
      sections.detail = asArray(detail['band'] as AnyAttrs | AnyAttrs[]).map(parseBand);
    } else if (sectionLooksLikeBand(detail)) {
      sections.detail = [parseBand(detail)];
    }
  }
  return sections;
}

function sectionLooksLikeBand(node: AnyAttrs): boolean {
  if (attr(node, 'height') !== undefined) return true;
  if (node['element']) return true;
  return ELEMENT_TAGS.some((t) => node[t] !== undefined);
}

function parseBand(node: AnyAttrs): Band {
  return {
    height: attrNum(node, 'height') ?? 0,
    splitType: attr(node, 'splitType') as Band['splitType'],
    printWhenExpression: readText(node['printWhenExpression']),
    elements: parseElementsContainer(node),
  };
}

const CHART_TAGS = [
  'pieChart',
  'pie3DChart',
  'barChart',
  'bar3DChart',
  'stackedBarChart',
  'lineChart',
  'areaChart',
  'stackedAreaChart',
] as const;

const ELEMENT_TAGS = [
  'staticText',
  'textField',
  'image',
  'line',
  'rectangle',
  'ellipse',
  'frame',
  'break',
  'subreport',
  'elementGroup',
  'componentElement',
  'crosstab',
  ...CHART_TAGS,
] as const;

function parseElementsContainer(node: AnyAttrs): AnyElement[] {
  const out: AnyElement[] = [];
  // Legacy form: per-kind tags (<staticText>, <textField>, <image>, ...).
  for (const tag of ELEMENT_TAGS) {
    const items = asArray(node[tag] as AnyAttrs | AnyAttrs[] | undefined);
    for (const item of items) {
      const el = parseElement(tag, item);
      if (el) out.push(el);
    }
  }
  // JR 7 compact form: <element kind="...">.
  const newItems = asArray(node['element'] as AnyAttrs | AnyAttrs[] | undefined);
  for (const item of newItems) {
    const kind = attr(item, 'kind');
    if (!kind) continue;
    const el = parseElement(kind, item);
    if (el) out.push(el);
  }
  return out;
}

function parseReportElement(node: AnyAttrs): ElementCommon {
  // Legacy form has a nested <reportElement>; JR 7 compact form puts geometry
  // directly on the <element> tag itself. Try the nested element first; fall
  // back to the element node.
  const re = (node['reportElement'] as AnyAttrs | undefined) ?? node;
  return {
    x: attrNum(re, 'x') ?? 0,
    y: attrNum(re, 'y') ?? 0,
    width: attrNum(re, 'width') ?? 0,
    height: attrNum(re, 'height') ?? 0,
    uuid: attr(re, 'uuid'),
    key: attr(re, 'key'),
    style: attr(re, 'style'),
    positionType: attr(re, 'positionType') as ElementCommon['positionType'],
    stretchType: attr(re, 'stretchType') as ElementCommon['stretchType'],
    isPrintRepeatedValues:
      attrBool(re, 'isPrintRepeatedValues') ?? attrBool(re, 'printRepeatedValues'),
    removeLineWhenBlank:
      attrBool(re, 'isRemoveLineWhenBlank') ?? attrBool(re, 'removeLineWhenBlank') ??
      attrBool(node, 'removeLineWhenBlank'),
    printWhenGroupChanges: attr(re, 'printWhenGroupChanges'),
    printWhenExpression: readText(re['printWhenExpression']) ?? readText(node['printWhenExpression']),
    forecolor: attr(re, 'forecolor'),
    backcolor: attr(re, 'backcolor'),
    mode: attr(re, 'mode') as ElementCommon['mode'],
    properties: parseProperties(node),
  };
}

function parseHyperlink(node: AnyAttrs): HyperlinkFields {
  const params = asArray(node['hyperlinkParameter'] as AnyAttrs | AnyAttrs[] | undefined);
  return {
    linkType: attr(node, 'hyperlinkType') ?? attr(node, 'linkType'),
    linkTarget: attr(node, 'hyperlinkTarget') ?? attr(node, 'linkTarget'),
    hyperlinkAnchorExpression: readText(node['hyperlinkAnchorExpression']),
    hyperlinkPageExpression: readText(node['hyperlinkPageExpression']),
    hyperlinkReferenceExpression: readText(node['hyperlinkReferenceExpression']),
    hyperlinkTooltipExpression: readText(node['hyperlinkTooltipExpression']),
    hyperlinkWhenExpression: readText(node['hyperlinkWhenExpression']),
    hyperlinkParameters:
      params.length === 0
        ? undefined
        : params.map((p) => ({
            name: attr(p, 'name') ?? '',
            expression: readText(p['hyperlinkParameterExpression']) ?? '',
          })),
  };
}

function parseElement(tag: string, node: AnyAttrs): AnyElement | undefined {
  const common = parseReportElement(node);
  switch (tag) {
    case 'staticText': {
      const el: StaticTextElement = {
        ...common,
        kind: 'staticText',
        text: readText(node['text']) ?? '',
        textStyle: parseTextStyleAny(node),
        textAdjust: attr(node, 'textAdjust') as TextAdjust | undefined,
        box: parseBox(node['box'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'textField': {
      const el: TextFieldElement = {
        ...common,
        ...parseHyperlink(node),
        kind: 'textField',
        expression: readText(node['textFieldExpression']) ?? readText(node['expression']) ?? '',
        pattern: attr(node, 'pattern'),
        isStretchWithOverflow:
          attrBool(node, 'isStretchWithOverflow') ?? attrBool(node, 'stretchWithOverflow'),
        textAdjust: attr(node, 'textAdjust') as TextAdjust | undefined,
        isBlankWhenNull: attrBool(node, 'isBlankWhenNull') ?? attrBool(node, 'blankWhenNull'),
        evaluationTime: attr(node, 'evaluationTime') as TextFieldElement['evaluationTime'],
        evaluationGroup: attr(node, 'evaluationGroup'),
        textStyle: parseTextStyleAny(node),
        box: parseBox(node['box'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'image': {
      const el: ImageElement = {
        ...common,
        ...parseHyperlink(node),
        kind: 'image',
        expression: readText(node['imageExpression']) ?? readText(node['expression']) ?? '',
        scaleImage: attr(node, 'scaleImage') as ImageElement['scaleImage'],
        // JR 7 uses hImageAlign/vImageAlign on <image>; legacy form is hAlign/vAlign.
        hAlign: (attr(node, 'hImageAlign') ?? attr(node, 'hAlign')) as ImageElement['hAlign'],
        vAlign: (attr(node, 'vImageAlign') ?? attr(node, 'vAlign')) as ImageElement['vAlign'],
        isUsingCache: attrBool(node, 'isUsingCache') ?? attrBool(node, 'usingCache'),
        isLazy: attrBool(node, 'isLazy') ?? attrBool(node, 'lazy'),
        onErrorType: attr(node, 'onErrorType') as ImageElement['onErrorType'],
        box: parseBox(node['box'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'line': {
      const el: LineElement = {
        ...common,
        kind: 'line',
        direction: attr(node, 'direction') as LineElement['direction'],
        // JR 7 compact form puts <pen> directly on the element; legacy nests it
        // inside <graphicElement>.
        pen:
          parsePen(node['graphicElement'] as AnyAttrs | undefined) ??
          parsePen(node['pen'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'rectangle': {
      const el: RectangleElement = {
        ...common,
        kind: 'rectangle',
        radius: attrNum(node, 'radius'),
        pen:
          parsePen(node['graphicElement'] as AnyAttrs | undefined) ??
          parsePen(node['pen'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'ellipse': {
      const el: EllipseElement = {
        ...common,
        kind: 'ellipse',
        pen:
          parsePen(node['graphicElement'] as AnyAttrs | undefined) ??
          parsePen(node['pen'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'frame': {
      const el: FrameElement = {
        ...common,
        kind: 'frame',
        children: parseElementsContainer(node),
        box: parseBox(node['box'] as AnyAttrs | undefined),
      };
      return el;
    }
    case 'break': {
      const el: BreakElement = {
        ...common,
        kind: 'break',
        type: attr(node, 'type') as BreakElement['type'],
      };
      return el;
    }
    case 'subreport': {
      const subParams = asArray(node['subreportParameter'] as AnyAttrs | AnyAttrs[] | undefined)
        // Tolerate JR 7 short alias <parameter> on <element kind="subreport">.
        .concat(asArray(node['parameter'] as AnyAttrs | AnyAttrs[] | undefined));
      const el: SubreportElement = {
        ...common,
        kind: 'subreport',
        expression: readText(node['subreportExpression']) ?? readText(node['expression']) ?? '',
        parametersMapExpression: readText(node['parametersMapExpression']),
        connectionExpression: readText(node['connectionExpression']),
        dataSourceExpression: readText(node['dataSourceExpression']),
        isUsingCache: attrBool(node, 'isUsingCache') ?? attrBool(node, 'usingCache'),
        runToBottom: attrBool(node, 'runToBottom'),
        overflowType: attr(node, 'overflowType') as SubreportElement['overflowType'],
        subreportParameters:
          subParams.length === 0
            ? undefined
            : subParams.map((p) => ({
                name: attr(p, 'name') ?? '',
                expression:
                  readText(p['subreportParameterExpression']) ??
                  readText(p['expression']) ??
                  '',
              })),
      };
      return el;
    }
    case 'elementGroup': {
      const el: ElementGroup = {
        kind: 'elementGroup',
        children: parseElementsContainer(node),
      };
      return el;
    }
    case 'componentElement':
    case 'component':
      return parseComponentElement(common, node);
    case 'pieChart':
    case 'pie3DChart':
    case 'barChart':
    case 'bar3DChart':
    case 'stackedBarChart':
    case 'lineChart':
    case 'areaChart':
    case 'stackedAreaChart':
      return parseChart(tag as import('../model/element').ChartType, node);
    case 'crosstab':
      return parseCrosstab(node);
    default:
      return undefined;
  }
}

function parseCrosstab(node: AnyAttrs): import('../model/element').CrosstabElement {
  // `parseReportElement` already handles "nested <reportElement> OR inline
  // attributes on the outer node" — pass the crosstab node directly.
  const common = parseReportElement(node);
  // JR conventions vary: datasetRun can be a child of <crosstabDataset> directly
  // OR nested inside <crosstabDataset><dataset>. Check both.
  const crosstabDataset = node['crosstabDataset'] as AnyAttrs | undefined;
  const datasetWrapper = crosstabDataset?.['dataset'] as AnyAttrs | undefined;
  const dsRun = ((datasetWrapper?.['datasetRun'] ?? crosstabDataset?.['datasetRun']) as
    | AnyAttrs
    | undefined);
  const datasetRun = dsRun
    ? {
        subDataset: attr(dsRun, 'subDataset') ?? '',
        parametersMapExpression: readText(dsRun['parametersMapExpression']),
        connectionExpression: readText(dsRun['connectionExpression']),
        dataSourceExpression: readText(dsRun['dataSourceExpression']),
        parameters: asArray(dsRun['datasetParameter'] as AnyAttrs | AnyAttrs[] | undefined).map((p) => ({
          name: attr(p, 'name') ?? '',
          expression: readText(p['datasetParameterExpression']) ?? '',
        })),
      }
    : undefined;

  const rowGroups = asArray(node['rowGroup'] as AnyAttrs | AnyAttrs[] | undefined).map(
    (rg): import('../model/element').CrosstabRowGroup => ({
      name: attr(rg, 'name') ?? '',
      width: attrNum(rg, 'width') ?? 80,
      totalPosition: attr(rg, 'totalPosition') as import('../model/element').CrosstabRowGroup['totalPosition'],
      headerPosition: attr(rg, 'headerPosition') as import('../model/element').CrosstabRowGroup['headerPosition'],
      bucket: parseCrosstabBucket(rg['bucket'] as AnyAttrs | undefined),
    }),
  );
  const columnGroups = asArray(node['columnGroup'] as AnyAttrs | AnyAttrs[] | undefined).map(
    (cg): import('../model/element').CrosstabColumnGroup => ({
      name: attr(cg, 'name') ?? '',
      height: attrNum(cg, 'height') ?? 20,
      totalPosition: attr(cg, 'totalPosition') as import('../model/element').CrosstabColumnGroup['totalPosition'],
      headerPosition: attr(cg, 'headerPosition') as import('../model/element').CrosstabColumnGroup['headerPosition'],
      bucket: parseCrosstabBucket(cg['bucket'] as AnyAttrs | undefined),
    }),
  );
  const measures = asArray(node['measure'] as AnyAttrs | AnyAttrs[] | undefined).map(
    (m): import('../model/element').CrosstabMeasure => ({
      name: attr(m, 'name') ?? '',
      class: attr(m, 'class') ?? 'java.lang.Double',
      calculation: attr(m, 'calculation') as import('../model/element').CrosstabMeasure['calculation'],
      expression: readText(m['measureExpression']) ?? '',
    }),
  );

  // crosstabHeaderCell / crosstabCell / cellContents are not modelled deeply —
  // they're regenerated on serialize. Default cell width/height come from the
  // first crosstabCell if present.
  const firstCell = asArray(node['crosstabCell'] as AnyAttrs | AnyAttrs[] | undefined)[0];
  const cellWidth = firstCell ? attrNum(firstCell, 'width') : undefined;
  const cellHeight = firstCell ? attrNum(firstCell, 'height') : undefined;

  return stripUndefined({
    ...common,
    kind: 'crosstab',
    datasetRun,
    rowGroups,
    columnGroups,
    measures,
    isRepeatColumnHeaders: attrBool(node, 'isRepeatColumnHeaders'),
    isRepeatRowHeaders: attrBool(node, 'isRepeatRowHeaders'),
    cellWidth,
    cellHeight,
  } as import('../model/element').CrosstabElement);
}

function parseCrosstabBucket(node: AnyAttrs | undefined): import('../model/element').CrosstabBucket {
  return {
    class: attr(node, 'class'),
    expression: readText(node?.['bucketExpression']) ?? '',
    orderByExpression: readText(node?.['orderByExpression']),
    comparatorExpression: readText(node?.['comparatorExpression']),
  };
}

/** Parse a chart element. The `<chart>/<reportElement/>` child carries geometry
 *  in the legacy form; in the JR 7 compact form geometry is on the outer tag. */
function parseChart(
  chartType: import('../model/element').ChartType,
  node: AnyAttrs,
): import('../model/element').ChartElement {
  const chartNode = (node['chart'] as AnyAttrs | undefined) ?? node;
  const common = parseReportElement(chartNode);
  // Hyperlink can sit on <chart> in legacy form.
  const hyperlink = parseHyperlink(chartNode);
  const showLegend = attrBool(chartNode, 'isShowLegend');
  const titleExpression = readText(chartNode['titleExpression']);
  const subtitleExpression = readText(chartNode['subtitleExpression']);

  let dataset: import('../model/element').ChartDataset;
  if (chartType === 'pieChart' || chartType === 'pie3DChart') {
    const ds = node['pieDataset'] as AnyAttrs | undefined;
    dataset = {
      kind: 'pie',
      keyExpression: readText(ds?.['keyExpression']) ?? '',
      valueExpression: readText(ds?.['valueExpression']) ?? '',
      labelExpression: readText(ds?.['labelExpression']),
    };
  } else {
    const ds = node['categoryDataset'] as AnyAttrs | undefined;
    const seriesNodes = asArray(ds?.['categorySeries'] as AnyAttrs | AnyAttrs[] | undefined);
    dataset = {
      kind: 'category',
      series: seriesNodes.map((s) => ({
        seriesExpression: readText(s['seriesExpression']) ?? '',
        categoryExpression: readText(s['categoryExpression']) ?? '',
        valueExpression: readText(s['valueExpression']) ?? '',
        labelExpression: readText(s['labelExpression']),
      })),
    };
  }

  // Axis labels live under the *Plot child.
  let categoryAxisLabelExpression: string | undefined;
  let valueAxisLabelExpression: string | undefined;
  for (const plotKey of ['barPlot', 'bar3DPlot', 'linePlot', 'areaPlot']) {
    const plot = node[plotKey] as AnyAttrs | undefined;
    if (!plot) continue;
    categoryAxisLabelExpression = readText(plot['categoryAxisLabelExpression']);
    valueAxisLabelExpression = readText(plot['valueAxisLabelExpression']);
    break;
  }

  return stripUndefined({
    ...common,
    ...hyperlink,
    kind: 'chart',
    chartType,
    dataset,
    titleExpression,
    subtitleExpression,
    showLegend,
    categoryAxisLabelExpression,
    valueAxisLabelExpression,
  } as import('../model/element').ChartElement);
}

function parseComponentElement(common: ElementCommon, node: AnyAttrs): import('../model/element').TableElement | import('../model/element').BarcodeElement | undefined {
  // Tables — both legacy <jr:table> and JR 7 namespaceless <table>.
  const tableNode = (node['jr:table'] ?? node['table']) as AnyAttrs | undefined;
  if (tableNode) {
    return {
      ...common,
      kind: 'componentElement',
      componentKind: 'table',
      table: parseTable(tableNode),
    };
  }
  // Barcode4j (1D + 2D barcodes).
  const barcodeNode = (node['jr:barcode4j'] ?? node['barcode4j']) as AnyAttrs | undefined;
  if (barcodeNode) {
    return {
      ...common,
      kind: 'componentElement',
      componentKind: 'barcode4j',
      barcode: parseBarcode4j(barcodeNode),
    };
  }
  return undefined;
}

function parseBarcode4j(node: AnyAttrs): import('../model/element').Barcode4jComponent {
  return {
    type:
      (attr(node, 'type') as import('../model/element').Barcode4jType | undefined) ?? 'Code128',
    codeExpression:
      readText(node['jr:codeExpression']) ?? readText(node['codeExpression']) ?? '',
    textPosition: attr(node, 'textPosition') as import('../model/element').Barcode4jComponent['textPosition'],
    checksumMode: attr(node, 'checksumMode') as import('../model/element').Barcode4jComponent['checksumMode'],
    moduleWidth: attrNum(node, 'moduleWidth'),
    patternExpression:
      readText(node['jr:patternExpression']) ?? readText(node['patternExpression']),
    errorCorrectionLevel: attr(node, 'errorCorrectionLevel') as import('../model/element').Barcode4jComponent['errorCorrectionLevel'],
    orientation: attrNum(node, 'orientation') as import('../model/element').Barcode4jComponent['orientation'],
  };
}

function parseTable(node: AnyAttrs): TableComponent {
  const datasetRunNode = node['datasetRun'] as AnyAttrs | undefined;
  const columns = asArray(node['jr:column'] as AnyAttrs | AnyAttrs[] | undefined).map(parseTableColumn);
  return {
    uuid: attr(node, 'uuid'),
    whenNoDataType: attr(node, 'whenNoDataType') as TableComponent['whenNoDataType'],
    datasetRun: datasetRunNode
      ? {
          subDataset: attr(datasetRunNode, 'subDataset') ?? '',
          parametersMapExpression: readText(datasetRunNode['parametersMapExpression']),
          connectionExpression: readText(datasetRunNode['connectionExpression']),
          dataSourceExpression: readText(datasetRunNode['dataSourceExpression']),
          parameters: asArray(datasetRunNode['datasetParameter'] as AnyAttrs | AnyAttrs[] | undefined).map((p) => ({
            name: attr(p, 'name') ?? '',
            expression: readText(p['datasetParameterExpression']) ?? '',
          })),
        }
      : undefined,
    columns,
  };
}

function parseTableColumn(node: AnyAttrs): TableColumn {
  return {
    width: attrNum(node, 'width') ?? 0,
    uuid: attr(node, 'uuid'),
    printWhenExpression: readText(node['printWhenExpression']),
    tableHeader: parseTableCell(node['jr:tableHeader'] as AnyAttrs | undefined),
    tableFooter: parseTableCell(node['jr:tableFooter'] as AnyAttrs | undefined),
    columnHeader: parseTableCell(node['jr:columnHeader'] as AnyAttrs | undefined),
    columnFooter: parseTableCell(node['jr:columnFooter'] as AnyAttrs | undefined),
    detailCell: parseTableCell(node['jr:detailCell'] as AnyAttrs | undefined),
  };
}

function parseTableCell(node: AnyAttrs | undefined): TableCell | undefined {
  if (!node) return undefined;
  return {
    height: attrNum(node, 'height'),
    width: attrNum(node, 'width'),
    rowSpan: attrNum(node, 'rowSpan'),
    style: attr(node, 'style'),
    box: parseBox(node['box'] as AnyAttrs | undefined),
    children: parseElementsContainer(node),
  };
}

/** Read text style from EITHER nested <textElement>/<font> (legacy) OR
 *  inline element attributes (JR 7 compact form). */
function parseTextStyleAny(elementNode: AnyAttrs): TextStyle | undefined {
  const textElement = elementNode['textElement'] as AnyAttrs | undefined;
  const fontNode = textElement?.['font'] as AnyAttrs | undefined;
  const ts: TextStyle = {
    hTextAlign:
      ((textElement && attr(textElement, 'textAlignment')) ?? attr(elementNode, 'hTextAlign')) as TextStyle['hTextAlign'],
    vTextAlign:
      ((textElement && attr(textElement, 'verticalAlignment')) ?? attr(elementNode, 'vTextAlign')) as TextStyle['vTextAlign'],
    rotation: ((textElement && attr(textElement, 'rotation')) ?? attr(elementNode, 'rotation')) as TextStyle['rotation'],
    markup: ((textElement && attr(textElement, 'markup')) ?? attr(elementNode, 'markup')) as TextStyle['markup'],
    fontName: attr(fontNode, 'fontName') ?? attr(elementNode, 'fontName'),
    size: attrNum(fontNode, 'size') ?? attrNum(elementNode, 'fontSize'),
    isBold: attrBool(fontNode, 'isBold') ?? attrBool(elementNode, 'bold'),
    isItalic: attrBool(fontNode, 'isItalic') ?? attrBool(elementNode, 'italic'),
    isUnderline: attrBool(fontNode, 'isUnderline') ?? attrBool(elementNode, 'underline'),
    isStrikeThrough: attrBool(fontNode, 'isStrikeThrough') ?? attrBool(elementNode, 'strikeThrough'),
    pdfFontName: attr(fontNode, 'pdfFontName') ?? attr(elementNode, 'pdfFontName'),
    pdfEncoding: attr(fontNode, 'pdfEncoding') ?? attr(elementNode, 'pdfEncoding'),
    isPdfEmbedded: attrBool(fontNode, 'isPdfEmbedded') ?? attrBool(elementNode, 'pdfEmbedded'),
    paragraph: textElement?.['paragraph'] ? parseParagraph(textElement['paragraph'] as AnyAttrs) : undefined,
  };
  const stripped = stripUndefined(ts);
  return Object.keys(stripped).length === 0 ? undefined : stripped;
}

function parseTextStyleFromAttrs(node: AnyAttrs): TextStyle | undefined {
  // <style> and <conditionalStyle> carry text/font attributes flattened on the
  // element. JR 7 uses unprefixed `bold`/`italic`/...; legacy `isBold`/...
  const style: TextStyle = {
    hTextAlign: attr(node, 'hTextAlign') as TextStyle['hTextAlign'],
    vTextAlign: attr(node, 'vTextAlign') as TextStyle['vTextAlign'],
    rotation: attr(node, 'rotation') as TextStyle['rotation'],
    markup: attr(node, 'markup') as TextStyle['markup'],
    fontName: attr(node, 'fontName'),
    size: attrNum(node, 'fontSize'),
    isBold: attrBool(node, 'isBold') ?? attrBool(node, 'bold'),
    isItalic: attrBool(node, 'isItalic') ?? attrBool(node, 'italic'),
    isUnderline: attrBool(node, 'isUnderline') ?? attrBool(node, 'underline'),
    isStrikeThrough: attrBool(node, 'isStrikeThrough') ?? attrBool(node, 'strikeThrough'),
    pdfFontName: attr(node, 'pdfFontName'),
    pdfEncoding: attr(node, 'pdfEncoding'),
    isPdfEmbedded: attrBool(node, 'isPdfEmbedded') ?? attrBool(node, 'pdfEmbedded'),
  };
  const stripped = stripUndefined(style);
  return Object.keys(stripped).length === 0 ? undefined : stripped;
}

function parseParagraph(node: AnyAttrs): ParagraphSpacing {
  return stripUndefined({
    lineSpacing: attr(node, 'lineSpacing') as ParagraphSpacing['lineSpacing'],
    lineSpacingSize: attrNum(node, 'lineSpacingSize'),
    firstLineIndent: attrNum(node, 'firstLineIndent'),
    leftIndent: attrNum(node, 'leftIndent'),
    rightIndent: attrNum(node, 'rightIndent'),
    spacingBefore: attrNum(node, 'spacingBefore'),
    spacingAfter: attrNum(node, 'spacingAfter'),
  });
}

function parsePen(node: AnyAttrs | undefined): Pen | undefined {
  if (!node) return undefined;
  const penNode = (node['pen'] as AnyAttrs | undefined) ?? node;
  const pen: Pen = {
    lineWidth: attrNum(penNode, 'lineWidth'),
    lineStyle: attr(penNode, 'lineStyle') as Pen['lineStyle'],
    lineColor: attr(penNode, 'lineColor'),
  };
  const stripped = stripUndefined(pen);
  return Object.keys(stripped).length === 0 ? undefined : stripped;
}

function parseBox(node: AnyAttrs | undefined): BoxBorders | undefined {
  if (!node) return undefined;
  const box: BoxBorders = {
    padding: attrNum(node, 'padding'),
    topPadding: attrNum(node, 'topPadding'),
    leftPadding: attrNum(node, 'leftPadding'),
    bottomPadding: attrNum(node, 'bottomPadding'),
    rightPadding: attrNum(node, 'rightPadding'),
    pen: parsePen(node['pen'] as AnyAttrs | undefined),
    topPen: parsePen(node['topPen'] as AnyAttrs | undefined),
    leftPen: parsePen(node['leftPen'] as AnyAttrs | undefined),
    bottomPen: parsePen(node['bottomPen'] as AnyAttrs | undefined),
    rightPen: parsePen(node['rightPen'] as AnyAttrs | undefined),
  };
  const stripped = stripUndefined(box);
  return Object.keys(stripped).length === 0 ? undefined : stripped;
}

function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

