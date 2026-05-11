import { describe, expect, it } from 'vitest';

import { parseJrxml, serializeJrxml } from '../projects/ngx-jrxml-editor/src/lib/jrxml';
import type { ChartElement, CrosstabElement } from '../projects/ngx-jrxml-editor/src/lib/model/element';

const REPORT_HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="Test" pageWidth="595" pageHeight="842">`;

describe('Report groups round-trip', () => {
  it('parses, models, and re-serializes a group with header/footer bands', () => {
    const xml = `${REPORT_HEAD}
  <field name="department" class="java.lang.String"/>
  <group name="DeptGroup" isStartNewPage="true">
    <groupExpression><![CDATA[$F{department}]]></groupExpression>
    <groupHeader><band height="20"/></groupHeader>
    <groupFooter><band height="15"/></groupFooter>
  </group>
  <detail><band height="30"/></detail>
</jasperReport>`;
    const model = parseJrxml(xml);
    expect(model.groups).toHaveLength(1);
    const g = model.groups![0]!;
    expect(g.name).toBe('DeptGroup');
    expect(g.expression).toBe('$F{department}');
    expect(g.isStartNewPage).toBe(true);
    expect(g.groupHeader).toHaveLength(1);
    expect(g.groupHeader![0]!.height).toBe(20);
    expect(g.groupFooter![0]!.height).toBe(15);

    const serialized = serializeJrxml(model);
    expect(serialized).toContain('<group');
    expect(serialized).toContain('DeptGroup');
    expect(serialized).toContain('groupHeader');
    expect(serialized).toContain('groupFooter');
    const reparsed = parseJrxml(serialized);
    expect(reparsed).toEqual(model);
  });
});

describe('Charts round-trip', () => {
  it('round-trips a barChart with a category dataset and series', () => {
    const xml = `${REPORT_HEAD}
  <field name="category" class="java.lang.String"/>
  <field name="value" class="java.lang.Integer"/>
  <detail>
    <band height="180">
      <barChart>
        <chart isShowLegend="true">
          <reportElement x="0" y="0" width="240" height="180" uuid="11111111-1111-1111-1111-111111111111"/>
        </chart>
        <categoryDataset>
          <dataset/>
          <categorySeries>
            <seriesExpression><![CDATA["Series 1"]]></seriesExpression>
            <categoryExpression><![CDATA[$F{category}]]></categoryExpression>
            <valueExpression><![CDATA[$F{value}]]></valueExpression>
          </categorySeries>
        </categoryDataset>
        <barPlot>
          <plot/>
          <categoryAxisLabelExpression><![CDATA["Categories"]]></categoryAxisLabelExpression>
          <valueAxisLabelExpression><![CDATA["Values"]]></valueAxisLabelExpression>
        </barPlot>
      </barChart>
    </band>
  </detail>
</jasperReport>`;
    const model = parseJrxml(xml);
    const detail = model.sections.detail!;
    expect(detail).toHaveLength(1);
    const elements = detail[0]!.elements;
    expect(elements).toHaveLength(1);
    const chart = elements[0] as ChartElement;
    expect(chart.kind).toBe('chart');
    expect(chart.chartType).toBe('barChart');
    expect(chart.dataset.kind).toBe('category');
    expect(chart.showLegend).toBe(true);
    expect(chart.categoryAxisLabelExpression).toBe('"Categories"');
    expect(chart.valueAxisLabelExpression).toBe('"Values"');
    if (chart.dataset.kind === 'category') {
      expect(chart.dataset.series).toHaveLength(1);
      expect(chart.dataset.series[0]!.valueExpression).toBe('$F{value}');
    }

    const serialized = serializeJrxml(model);
    expect(serialized).toContain('<barChart>');
    expect(serialized).toContain('<categoryDataset>');
    expect(serialized).toContain('<barPlot>');
    expect(serialized).toContain('"Series 1"');
    const reparsed = parseJrxml(serialized);
    expect(reparsed).toEqual(model);
  });

  it('round-trips a crosstab with row/column groups + measure', () => {
    const xml = `${REPORT_HEAD}
  <field name="region" class="java.lang.String"/>
  <field name="year" class="java.lang.Integer"/>
  <field name="value" class="java.lang.Double"/>
  <subDataset name="cx_data"/>
  <detail>
    <band height="200">
      <crosstab>
        <reportElement x="0" y="0" width="500" height="200" uuid="33333333-3333-3333-3333-333333333333"/>
        <crosstabDataset>
          <dataset>
            <datasetRun subDataset="cx_data"/>
          </dataset>
        </crosstabDataset>
        <rowGroup name="Region" width="80" totalPosition="End">
          <bucket class="java.lang.String">
            <bucketExpression><![CDATA[$F{region}]]></bucketExpression>
          </bucket>
        </rowGroup>
        <columnGroup name="Year" height="20">
          <bucket class="java.lang.Integer">
            <bucketExpression><![CDATA[$F{year}]]></bucketExpression>
          </bucket>
        </columnGroup>
        <measure name="Total" class="java.lang.Double" calculation="Sum">
          <measureExpression><![CDATA[$F{value}]]></measureExpression>
        </measure>
        <crosstabCell width="100" height="20"/>
      </crosstab>
    </band>
  </detail>
</jasperReport>`;
    const model = parseJrxml(xml);
    const cx = model.sections.detail![0]!.elements[0] as CrosstabElement;
    expect(cx.kind).toBe('crosstab');
    expect(cx.rowGroups).toHaveLength(1);
    expect(cx.rowGroups[0]!.name).toBe('Region');
    expect(cx.rowGroups[0]!.bucket.expression).toBe('$F{region}');
    expect(cx.rowGroups[0]!.totalPosition).toBe('End');
    expect(cx.columnGroups[0]!.name).toBe('Year');
    expect(cx.measures[0]!.calculation).toBe('Sum');
    expect(cx.measures[0]!.expression).toBe('$F{value}');
    expect(cx.datasetRun?.subDataset).toBe('cx_data');

    const serialized = serializeJrxml(model);
    expect(serialized).toContain('<crosstab>');
    expect(serialized).toContain('<bucketExpression>');
    expect(serialized).toContain('<measureExpression>');
    expect(serialized).toContain('subDataset="cx_data"');
    const reparsed = parseJrxml(serialized);
    const cx2 = reparsed.sections.detail![0]!.elements[0] as CrosstabElement;
    expect(cx2.rowGroups).toEqual(cx.rowGroups);
    expect(cx2.columnGroups).toEqual(cx.columnGroups);
    expect(cx2.measures).toEqual(cx.measures);
  });

  it('round-trips a pieChart with a pie dataset', () => {
    const xml = `${REPORT_HEAD}
  <field name="key" class="java.lang.String"/>
  <field name="value" class="java.lang.Integer"/>
  <detail>
    <band height="180">
      <pieChart>
        <chart>
          <reportElement x="10" y="20" width="200" height="160" uuid="22222222-2222-2222-2222-222222222222"/>
        </chart>
        <pieDataset>
          <dataset/>
          <keyExpression><![CDATA[$F{key}]]></keyExpression>
          <valueExpression><![CDATA[$F{value}]]></valueExpression>
        </pieDataset>
        <piePlot>
          <plot/>
        </piePlot>
      </pieChart>
    </band>
  </detail>
</jasperReport>`;
    const model = parseJrxml(xml);
    const chart = model.sections.detail![0]!.elements[0] as ChartElement;
    expect(chart.chartType).toBe('pieChart');
    expect(chart.dataset.kind).toBe('pie');
    if (chart.dataset.kind === 'pie') {
      expect(chart.dataset.keyExpression).toBe('$F{key}');
      expect(chart.dataset.valueExpression).toBe('$F{value}');
    }
    const serialized = serializeJrxml(model);
    expect(serialized).toContain('<pieChart>');
    expect(serialized).toContain('<keyExpression>');
    const reparsed = parseJrxml(serialized);
    expect(reparsed).toEqual(model);
  });
});
