import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseJrxml, serializeJrxml } from '../projects/ngx-jrxml-editor/src/lib/jrxml';

const path =
  '/Users/Nipper/Projects/Timesheet/Development/backend/reports/src/main/resources/reports/source/documents/template-invoice-default.jrxml';

describe('invoice fixture round-trip', () => {
  it('preserves report-level metadata (resourceBundle, language, properties)', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    expect(model.language).toBe('java');
    expect(model.resourceBundle).toBe('i18n');
    expect(model.whenResourceMissingType).toBe('Error');
    expect(model.properties?.length).toBeGreaterThan(0);
    expect(model.properties?.some((p) => p.name === 'net.sf.jasperreports.json.source')).toBe(true);
  });

  it('preserves field <description> and field <property>', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    const f = model.fields?.find((x) => x.name === 'documentTitle');
    expect(f).toBeDefined();
    expect(f?.description).toBe('documentTitle');
    expect(f?.properties?.length).toBeGreaterThan(0);
    expect(f?.properties?.[0]?.name).toBe('net.sf.jasperreports.json.field.expression');
  });

  it('preserves <style bold="true"> and conditionalStyles', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    const s = model.styles?.find((x) => x.name === 'SummaryTextStyle');
    expect(s).toBeDefined();
    expect(s?.text?.isBold).toBe(true);
    expect(s?.text?.size).toBe(12);
    expect(s?.conditionalStyles?.length).toBe(2);
    expect(s?.conditionalStyles?.[0]?.text?.size).toBe(8);
    expect(s?.conditionalStyles?.[0]?.conditionExpression).toContain('totalAmount');
  });

  it('preserves removeLineWhenBlank, textAdjust, and element <property>', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    const detailBand = model.sections.detail![0];
    const tf = detailBand.elements[0];
    expect(tf.kind).toBe('textField');
    if (tf.kind !== 'textField') throw new Error('unreachable');
    expect(tf.removeLineWhenBlank).toBe(true);
    expect(tf.textAdjust).toBe('StretchHeight');
    expect(tf.properties?.[0]?.name).toBe('com.jaspersoft.studio.unit.width');
  });

  it('parses elementGroup as a transparent grouping with children', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    const summary = model.sections.summary;
    expect(summary).toBeDefined();
    const frame = summary!.elements.find((e) => e.kind === 'frame');
    expect(frame?.kind).toBe('frame');
    if (!frame || frame.kind !== 'frame') throw new Error('unreachable');
    const group = frame.children.find((c) => c.kind === 'elementGroup');
    expect(group?.kind).toBe('elementGroup');
    if (!group || group.kind !== 'elementGroup') throw new Error('unreachable');
    expect(group.children.length).toBe(3);
    expect(group.children.every((c) => c.kind === 'textField')).toBe(true);
  });

  it('preserves subreport sub-parameters and overflowType', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    const summary = model.sections.summary;
    const qrSubreport = summary!.elements.find(
      (e) => e.kind === 'subreport' && e.expression.includes('template-qr'),
    );
    expect(qrSubreport?.kind).toBe('subreport');
    if (!qrSubreport || qrSubreport.kind !== 'subreport') throw new Error('unreachable');
    expect(qrSubreport.overflowType).toBe('NoStretch');
    expect(qrSubreport.subreportParameters?.length).toBe(3);
    expect(qrSubreport.subreportParameters?.map((p) => p.name)).toEqual([
      'qrCodeType',
      'qrCodeContent',
      'qrCodeDescription',
    ]);
  });

  it('preserves <pen> directly on a <line> element', () => {
    const model = parseJrxml(readFileSync(path, 'utf-8'));
    const summary = model.sections.summary;
    const frame = summary!.elements.find((e) => e.kind === 'frame');
    if (!frame || frame.kind !== 'frame') throw new Error('unreachable');
    const line = frame.children.find((c) => c.kind === 'line');
    expect(line?.kind).toBe('line');
    if (!line || line.kind !== 'line') throw new Error('unreachable');
    expect(line.pen?.lineWidth).toBe(2);
  });

  it('round-trips the file (parse → serialize → parse) without losing structure', () => {
    const xml = readFileSync(path, 'utf-8');
    const model1 = parseJrxml(xml);
    const xml2 = serializeJrxml(model1);
    const model2 = parseJrxml(xml2);
    expect(model2.fields?.length).toBe(model1.fields?.length);
    expect(model2.styles?.length).toBe(model1.styles?.length);
    expect(model2.styles?.[0]?.conditionalStyles?.length).toBe(
      model1.styles?.[0]?.conditionalStyles?.length,
    );
    // Title section should round-trip with all elements.
    expect(model2.sections.title?.elements.length).toBe(model1.sections.title?.elements.length);
  });
});
