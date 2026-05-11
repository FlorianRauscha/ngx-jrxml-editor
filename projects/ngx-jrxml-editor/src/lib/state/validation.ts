import type { Band } from '../model/band';
import type {
  AnyElement,
  ChartElement,
  CrosstabElement,
  ImageElement,
  StaticTextElement,
  SubreportElement,
  TextFieldElement,
} from '../model/element';
import type { JasperReport } from '../model/report';
import type { ElementPath } from './path';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  /** Stable id used for trackBy in the panel template. */
  id: string;
  severity: IssueSeverity;
  /** Short, user-facing description. */
  message: string;
  /** Optional path used to select / scroll to the offending element. */
  path?: ElementPath;
  /** Free-form detail string surfaced in a tooltip / second line. */
  detail?: string;
}

const FIELD_REF = /\$F\{([^}]+)\}/g;
const PARAM_REF = /\$P\{([^}]+)\}/g;
const VAR_REF = /\$V\{([^}]+)\}/g;

/**
 * Compute every issue we know how to detect. Pure function so the consumer can
 * memoize it via a `computed` signal off the report model.
 */
export function validateReport(report: JasperReport): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fieldNames = new Set((report.fields ?? []).map((f) => f.name));
  const paramNames = new Set((report.parameters ?? []).map((p) => p.name));
  const variableNames = new Set((report.variables ?? []).map((v) => v.name));
  // JR-builtin parameters that are always available (no need to declare).
  const BUILTIN_PARAMS = new Set([
    'REPORT_PARAMETERS_MAP',
    'REPORT_CONNECTION',
    'REPORT_DATA_SOURCE',
    'REPORT_LOCALE',
    'REPORT_TIME_ZONE',
    'REPORT_FORMAT_FACTORY',
    'REPORT_RESOURCE_BUNDLE',
    'REPORT_MAX_COUNT',
    'REPORT_VIRTUALIZER',
    'REPORT_CLASS_LOADER',
    'REPORT_URL_HANDLER_FACTORY',
    'REPORT_FILE_RESOLVER',
    'REPORT_TEMPLATES',
    'REPORT_CONTEXT',
    'REPORT_SCRIPTLET',
    'IS_IGNORE_PAGINATION',
    'JASPER_REPORT',
  ]);
  // JR-builtin variables.
  const BUILTIN_VARS = new Set([
    'PAGE_NUMBER',
    'COLUMN_NUMBER',
    'REPORT_COUNT',
    'PAGE_COUNT',
    'COLUMN_COUNT',
  ]);

  // Duplicate field / parameter / variable names — JRXML compilation fails
  // otherwise.
  const checkDup = (
    names: { name: string }[] | undefined,
    label: string,
  ): void => {
    if (!names) return;
    const seen = new Map<string, number>();
    for (const n of names) {
      seen.set(n.name, (seen.get(n.name) ?? 0) + 1);
    }
    for (const [name, count] of seen) {
      if (count > 1) {
        issues.push({
          id: `dup-${label}-${name}`,
          severity: 'error',
          message: `Duplicate ${label}: "${name}"`,
          detail: `${count} entries share the same name. JR will fail to compile.`,
        });
      }
    }
  };
  checkDup(report.fields, 'field');
  checkDup(report.parameters, 'parameter');
  checkDup(report.variables, 'variable');
  checkDup(report.groups, 'group');

  // Style names are scoped to <style> only; duplicates here also fail.
  if (report.styles) {
    const seen = new Map<string, number>();
    for (const s of report.styles) seen.set(s.name, (seen.get(s.name) ?? 0) + 1);
    for (const [name, count] of seen) {
      if (count > 1) {
        issues.push({
          id: `dup-style-${name}`,
          severity: 'error',
          message: `Duplicate style: "${name}"`,
        });
      }
    }
    // At most one default style.
    const defaults = report.styles.filter((s) => s.isDefault);
    if (defaults.length > 1) {
      issues.push({
        id: `multi-default-style`,
        severity: 'warning',
        message: `${defaults.length} styles flagged as default`,
        detail: 'JR uses the first one; mark exactly one default to avoid surprises.',
      });
    }
  }

  // Walk every band + every nested element.
  walkSections(report, (path, el) => {
    visitElement(el, path, fieldNames, paramNames, variableNames, BUILTIN_PARAMS, BUILTIN_VARS, issues);
  });

  return issues;
}

function walkSections(
  report: JasperReport,
  visit: (path: ElementPath, el: AnyElement) => void,
): void {
  const visitBand = (band: Band, base: Omit<ElementPath, 'indices'>): void => {
    walkElements(band.elements, [], (indices, el) => {
      visit({ ...base, indices }, el);
    });
  };
  const sections = report.sections;
  const single: Array<[ElementPath['section'], Band | undefined]> = [
    ['background', sections.background],
    ['title', sections.title],
    ['pageHeader', sections.pageHeader],
    ['columnHeader', sections.columnHeader],
    ['columnFooter', sections.columnFooter],
    ['pageFooter', sections.pageFooter],
    ['lastPageFooter', sections.lastPageFooter],
    ['summary', sections.summary],
    ['noData', sections.noData],
  ];
  for (const [section, band] of single) {
    if (band) visitBand(band, { section, bandIndex: 0 });
  }
  if (sections.detail) {
    sections.detail.forEach((band, i) => visitBand(band, { section: 'detail', bandIndex: i }));
  }
  for (const g of report.groups ?? []) {
    (g.groupHeader ?? []).forEach((band, i) =>
      visitBand(band, { section: 'groupHeader', bandIndex: i, groupName: g.name }),
    );
    (g.groupFooter ?? []).forEach((band, i) =>
      visitBand(band, { section: 'groupFooter', bandIndex: i, groupName: g.name }),
    );
  }
}

function walkElements(
  elements: AnyElement[],
  base: number[],
  visit: (indices: number[], el: AnyElement) => void,
): void {
  elements.forEach((el, i) => {
    const indices = [...base, i];
    visit(indices, el);
    if (el.kind === 'frame' || el.kind === 'elementGroup') {
      walkElements(el.children, indices, visit);
    }
  });
}

function visitElement(
  el: AnyElement,
  path: ElementPath,
  fields: Set<string>,
  params: Set<string>,
  variables: Set<string>,
  builtinParams: Set<string>,
  builtinVars: Set<string>,
  issues: ValidationIssue[],
): void {
  const id = (suffix: string) => `${pathKey(path)}-${suffix}`;

  const checkExpr = (expr: string | undefined, label: string): void => {
    if (!expr) return;
    for (const m of expr.matchAll(FIELD_REF)) {
      const name = m[1]!.trim();
      if (!fields.has(name)) {
        issues.push({
          id: id(`${label}-F-${name}`),
          severity: 'warning',
          message: `Unknown field $F{${name}} in ${label}`,
          detail: 'Declare it in the Data tab or fix the reference.',
          path,
        });
      }
    }
    for (const m of expr.matchAll(PARAM_REF)) {
      const name = m[1]!.trim();
      if (!params.has(name) && !builtinParams.has(name)) {
        issues.push({
          id: id(`${label}-P-${name}`),
          severity: 'warning',
          message: `Unknown parameter $P{${name}} in ${label}`,
          path,
        });
      }
    }
    for (const m of expr.matchAll(VAR_REF)) {
      const name = m[1]!.trim();
      if (!variables.has(name) && !builtinVars.has(name)) {
        issues.push({
          id: id(`${label}-V-${name}`),
          severity: 'warning',
          message: `Unknown variable $V{${name}} in ${label}`,
          path,
        });
      }
    }
  };

  // Required-expression checks per kind.
  switch (el.kind) {
    case 'textField': {
      const tf = el as TextFieldElement;
      if (!tf.expression || tf.expression.trim() === '') {
        issues.push({
          id: id('empty-textField'),
          severity: 'error',
          message: 'textField has no expression',
          path,
        });
      }
      checkExpr(tf.expression, 'textField');
      checkExpr(tf.printWhenExpression, 'printWhenExpression');
      checkExpr(tf.hyperlinkAnchorExpression, 'hyperlink anchor');
      checkExpr(tf.hyperlinkPageExpression, 'hyperlink page');
      checkExpr(tf.hyperlinkReferenceExpression, 'hyperlink reference');
      checkExpr(tf.hyperlinkTooltipExpression, 'hyperlink tooltip');
      checkExpr(tf.hyperlinkWhenExpression, 'hyperlink when');
      break;
    }
    case 'image': {
      const im = el as ImageElement;
      if (!im.expression || im.expression.trim() === '') {
        issues.push({
          id: id('empty-image'),
          severity: 'error',
          message: 'image has no expression',
          path,
        });
      }
      checkExpr(im.expression, 'image');
      checkExpr(im.printWhenExpression, 'printWhenExpression');
      break;
    }
    case 'subreport': {
      const sr = el as SubreportElement;
      if (!sr.expression || sr.expression.trim() === '') {
        issues.push({
          id: id('empty-subreport'),
          severity: 'error',
          message: 'subreport has no expression',
          path,
        });
      }
      checkExpr(sr.expression, 'subreport');
      checkExpr(sr.parametersMapExpression, 'parametersMap');
      checkExpr(sr.connectionExpression, 'connection');
      checkExpr(sr.dataSourceExpression, 'dataSource');
      for (const p of sr.subreportParameters ?? []) {
        checkExpr(p.expression, `subreport param "${p.name}"`);
      }
      checkExpr(sr.printWhenExpression, 'printWhenExpression');
      break;
    }
    case 'staticText': {
      const st = el as StaticTextElement;
      checkExpr(st.printWhenExpression, 'printWhenExpression');
      break;
    }
    case 'chart': {
      const ch = el as ChartElement;
      checkExpr(ch.titleExpression, 'chart title');
      checkExpr(ch.subtitleExpression, 'chart subtitle');
      checkExpr(ch.categoryAxisLabelExpression, 'categoryAxisLabel');
      checkExpr(ch.valueAxisLabelExpression, 'valueAxisLabel');
      if (ch.dataset.kind === 'pie') {
        checkExpr(ch.dataset.keyExpression, 'pie key');
        checkExpr(ch.dataset.valueExpression, 'pie value');
        checkExpr(ch.dataset.labelExpression, 'pie label');
        if (!ch.dataset.keyExpression || !ch.dataset.valueExpression) {
          issues.push({
            id: id('chart-incomplete'),
            severity: 'error',
            message: 'pie chart missing key or value expression',
            path,
          });
        }
      } else {
        if (ch.dataset.series.length === 0) {
          issues.push({
            id: id('chart-no-series'),
            severity: 'warning',
            message: 'chart has no series',
            path,
          });
        }
        ch.dataset.series.forEach((s, i) => {
          checkExpr(s.seriesExpression, `series ${i + 1} name`);
          checkExpr(s.categoryExpression, `series ${i + 1} category`);
          checkExpr(s.valueExpression, `series ${i + 1} value`);
        });
      }
      checkExpr(ch.printWhenExpression, 'printWhenExpression');
      break;
    }
    case 'componentElement': {
      checkExpr(el.printWhenExpression, 'printWhenExpression');
      if (el.componentKind === 'barcode4j') {
        checkExpr(el.barcode.codeExpression, 'barcode code');
        checkExpr(el.barcode.patternExpression, 'barcode pattern');
        if (!el.barcode.codeExpression || el.barcode.codeExpression.trim() === '') {
          issues.push({
            id: id('barcode-empty'),
            severity: 'error',
            message: 'barcode has no codeExpression',
            path,
          });
        }
      }
      break;
    }
    case 'crosstab': {
      const cx = el as CrosstabElement;
      checkExpr(cx.printWhenExpression, 'printWhenExpression');
      if (cx.rowGroups.length === 0) {
        issues.push({ id: id('cx-no-rows'), severity: 'error', message: 'crosstab has no row groups', path });
      }
      if (cx.columnGroups.length === 0) {
        issues.push({ id: id('cx-no-cols'), severity: 'error', message: 'crosstab has no column groups', path });
      }
      if (cx.measures.length === 0) {
        issues.push({ id: id('cx-no-measures'), severity: 'error', message: 'crosstab has no measures', path });
      }
      cx.rowGroups.forEach((g, i) => {
        if (!g.bucket.expression || g.bucket.expression.trim() === '') {
          issues.push({
            id: id(`cx-row-empty-${i}`),
            severity: 'error',
            message: `row group "${g.name || i}" has no bucket expression`,
            path,
          });
        }
        checkExpr(g.bucket.expression, `row group "${g.name}" bucket`);
      });
      cx.columnGroups.forEach((g, i) => {
        if (!g.bucket.expression || g.bucket.expression.trim() === '') {
          issues.push({
            id: id(`cx-col-empty-${i}`),
            severity: 'error',
            message: `column group "${g.name || i}" has no bucket expression`,
            path,
          });
        }
        checkExpr(g.bucket.expression, `column group "${g.name}" bucket`);
      });
      cx.measures.forEach((m, i) => {
        if (!m.expression || m.expression.trim() === '') {
          issues.push({
            id: id(`cx-meas-empty-${i}`),
            severity: 'error',
            message: `measure "${m.name || i}" has no expression`,
            path,
          });
        }
        checkExpr(m.expression, `measure "${m.name}"`);
      });
      break;
    }
    default:
      if (el.kind !== 'elementGroup') {
        checkExpr(el.printWhenExpression, 'printWhenExpression');
      }
  }
}

function pathKey(p: ElementPath): string {
  return [
    p.section,
    p.bandIndex,
    p.groupName ?? '',
    p.indices.join('.'),
    p.tableCell ? `tc:${p.tableCell.column}:${p.tableCell.role}:${p.tableCell.indices.join('.')}` : '',
  ].join('|');
}
