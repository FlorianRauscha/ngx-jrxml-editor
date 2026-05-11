import { describe, expect, it } from 'vitest';

import {
  parseJrxml,
  serializeJrxml,
  type JasperReport,
} from '../projects/ngx-jrxml-editor/src/lib/jrxml';

const reportWithBox: JasperReport = {
  name: 'BoxSample',
  uuid: 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  pageWidth: 595,
  pageHeight: 842,
  columnWidth: 555,
  leftMargin: 20,
  rightMargin: 20,
  topMargin: 20,
  bottomMargin: 20,
  sections: {
    detail: [
      {
        height: 40,
        elements: [
          {
            kind: 'textField',
            uuid: 'aaaaaaaa-bbbb-cccc-dddd-000000000002',
            x: 10,
            y: 10,
            width: 200,
            height: 20,
            expression: '$F{name}',
            box: {
              padding: 4,
              topPadding: 6,
              pen: { lineWidth: 1, lineColor: '#000000', lineStyle: 'Solid' },
            },
          },
        ],
      },
    ],
  },
};

describe('box round-trip', () => {
  it('preserves padding + pen on a textField', () => {
    const xml = serializeJrxml(reportWithBox);
    const parsed = parseJrxml(xml);
    const tf = parsed.sections.detail![0].elements[0];
    expect(tf.kind).toBe('textField');
    if (tf.kind !== 'textField') throw new Error('unreachable');
    expect(tf.box?.padding).toBe(4);
    expect(tf.box?.topPadding).toBe(6);
    expect(tf.box?.pen?.lineWidth).toBe(1);
    expect(tf.box?.pen?.lineStyle).toBe('Solid');
  });

  it('round-trips a report with isDefault style', () => {
    const reportWithStyle: JasperReport = {
      ...reportWithBox,
      styles: [
        {
          name: 'Default',
          isDefault: true,
          forecolor: '#222222',
          text: { fontName: 'Helvetica', size: 9 },
        },
      ],
    };
    const xml = serializeJrxml(reportWithStyle);
    const parsed = parseJrxml(xml);
    expect(parsed.styles).toBeDefined();
    expect(parsed.styles!.length).toBe(1);
    expect(parsed.styles![0].name).toBe('Default');
    expect(parsed.styles![0].isDefault).toBe(true);
    expect(parsed.styles![0].text?.size).toBe(9);
    expect(parsed.styles![0].text?.fontName).toBe('Helvetica');
  });
});
