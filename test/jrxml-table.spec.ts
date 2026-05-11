import { describe, expect, it } from 'vitest';

import {
  parseJrxml,
  serializeJrxml,
  type JasperReport,
  type TableElement,
} from '../projects/ngx-jrxml-editor/src/lib/jrxml';

const reportWithTable: JasperReport = {
  name: 'TableSample',
  uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  pageWidth: 595,
  pageHeight: 842,
  columnWidth: 555,
  leftMargin: 20,
  rightMargin: 20,
  topMargin: 20,
  bottomMargin: 20,
  subDatasets: [
    {
      name: 'Users',
      uuid: '11111111-2222-3333-4444-555555555555',
      fields: [
        { name: 'id', class: 'java.lang.Integer' },
        { name: 'name', class: 'java.lang.String' },
      ],
    },
  ],
  fields: [
    { name: 'id', class: 'java.lang.Integer' },
    { name: 'name', class: 'java.lang.String' },
  ],
  sections: {
    detail: [
      {
        height: 100,
        elements: [
          {
            kind: 'componentElement',
            componentKind: 'table',
            x: 0,
            y: 0,
            width: 555,
            height: 100,
            uuid: '99999999-8888-7777-6666-555555555555',
            table: {
              datasetRun: { subDataset: 'Users' },
              columns: [
                {
                  width: 100,
                  uuid: 'col-1',
                  columnHeader: {
                    height: 20,
                    children: [
                      {
                        kind: 'staticText',
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 20,
                        text: 'ID',
                      },
                    ],
                  },
                  detailCell: {
                    height: 20,
                    children: [
                      {
                        kind: 'textField',
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 20,
                        expression: '$F{id}',
                      },
                    ],
                  },
                },
                {
                  width: 455,
                  uuid: 'col-2',
                  columnHeader: {
                    height: 20,
                    children: [
                      {
                        kind: 'staticText',
                        x: 0,
                        y: 0,
                        width: 455,
                        height: 20,
                        text: 'Name',
                      },
                    ],
                  },
                  detailCell: {
                    height: 20,
                    children: [
                      {
                        kind: 'textField',
                        x: 0,
                        y: 0,
                        width: 455,
                        height: 20,
                        expression: '$F{name}',
                      },
                    ],
                  },
                },
              ],
            },
          } satisfies TableElement,
        ],
      },
    ],
  },
};

describe('JRXML table component', () => {
  it('serializes and re-parses tables identically', () => {
    const xml = serializeJrxml(reportWithTable);

    expect(xml).toContain('<jr:table');
    expect(xml).toContain('<jr:column');
    expect(xml).toContain('<jr:columnHeader');
    expect(xml).toContain('<jr:detailCell');
    expect(xml).toContain('subDataset="Users"');

    const reparsed = parseJrxml(xml);
    expect(reparsed.subDatasets?.[0]?.name).toBe('Users');

    const detailBand = reparsed.sections.detail?.[0];
    expect(detailBand?.elements).toHaveLength(1);
    const tableEl = detailBand?.elements[0];
    expect(tableEl?.kind).toBe('componentElement');

    if (tableEl?.kind !== 'componentElement') throw new Error('expected table');
    expect(tableEl.table.columns).toHaveLength(2);
    expect(tableEl.table.columns[0]?.width).toBe(100);
    expect(tableEl.table.columns[1]?.detailCell?.children[0]?.kind).toBe('textField');
  });
});
