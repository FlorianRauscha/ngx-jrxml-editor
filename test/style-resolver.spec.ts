import { describe, expect, it } from 'vitest';

import { resolveStyle } from '../projects/ngx-jrxml-editor/src/lib/state/style-resolver';
import type { Style } from '../projects/ngx-jrxml-editor/src/lib/model/style';

describe('resolveStyle', () => {
  it('returns undefined when no styles given', () => {
    expect(resolveStyle('Foo', undefined)).toBeUndefined();
    expect(resolveStyle('Foo', [])).toBeUndefined();
  });

  it('returns undefined when name does not match and no isDefault', () => {
    const styles: Style[] = [{ name: 'Other', text: { size: 8 } }];
    expect(resolveStyle('Missing', styles)).toBeUndefined();
  });

  it('applies the isDefault style as the base, even without a name', () => {
    const styles: Style[] = [
      { name: 'Base', isDefault: true, forecolor: '#111', text: { fontName: 'Helvetica', size: 9 } },
    ];
    const r = resolveStyle(undefined, styles);
    expect(r?.forecolor).toBe('#111');
    expect(r?.text?.fontName).toBe('Helvetica');
    expect(r?.text?.size).toBe(9);
  });

  it('walks the parent chain so the named (child) style wins over its parents', () => {
    const styles: Style[] = [
      { name: 'A', text: { size: 12, fontName: 'Times' } },
      { name: 'B', parentStyle: 'A', text: { size: 8 } },
    ];
    const r = resolveStyle('B', styles);
    expect(r?.text?.size).toBe(8);
    expect(r?.text?.fontName).toBe('Times');
  });

  it('lets the named style override the isDefault style', () => {
    const styles: Style[] = [
      { name: 'D', isDefault: true, text: { size: 16 } },
      { name: 'Small', text: { size: 7 } },
    ];
    const r = resolveStyle('Small', styles);
    expect(r?.text?.size).toBe(7);
  });

  it('does not loop when parentStyle forms a cycle', () => {
    const styles: Style[] = [
      { name: 'X', parentStyle: 'Y', text: { size: 10 } },
      { name: 'Y', parentStyle: 'X', text: { isBold: true } },
    ];
    const r = resolveStyle('X', styles);
    expect(r?.text?.size).toBe(10);
    expect(r?.text?.isBold).toBe(true);
  });

  it('merges pen and colors from the chain with named-style values winning', () => {
    const styles: Style[] = [
      {
        name: 'P',
        forecolor: '#000',
        backcolor: '#fff',
        pen: { lineWidth: 1, lineColor: '#000' },
      },
      {
        name: 'Q',
        parentStyle: 'P',
        forecolor: '#f00',
        pen: { lineWidth: 2 },
      },
    ];
    const r = resolveStyle('Q', styles);
    expect(r?.forecolor).toBe('#f00');
    expect(r?.backcolor).toBe('#fff');
    expect(r?.pen?.lineWidth).toBe(2);
    expect(r?.pen?.lineColor).toBe('#000');
  });
});
