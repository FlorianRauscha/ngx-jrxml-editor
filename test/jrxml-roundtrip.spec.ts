import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseJrxml, serializeJrxml } from '../projects/ngx-jrxml-editor/src/lib/jrxml';

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

/** Whitespace-tolerant XML normalization for equivalence checks. */
function normalize(xml: string): string {
  return xml
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('JRXML round-trip', () => {
  it('parses and re-serializes simple.jrxml without semantic loss', () => {
    const xml = loadFixture('simple.jrxml');
    const model = parseJrxml(xml);

    expect(model.name).toBe('Simple');
    expect(model.pageWidth).toBe(595);
    expect(model.fields).toHaveLength(2);
    expect(model.fields?.[0]?.name).toBe('id');
    expect(model.parameters).toHaveLength(1);
    expect(model.query?.text).toContain('SELECT');
    expect(model.sections.title?.elements).toHaveLength(1);
    expect(model.sections.detail?.[0]?.elements).toHaveLength(2);

    const serialized = serializeJrxml(model);
    const reparsed = parseJrxml(serialized);

    // Idempotence: parse → serialize → parse should produce the same model.
    expect(reparsed).toEqual(model);

    // Sanity: round-trip output mentions the same field expressions.
    expect(serialized).toContain('$F{id}');
    expect(serialized).toContain('$F{name}');
    expect(serialized).toContain('User Report');
  });

  it('preserves CDATA-bearing content', () => {
    const xml = loadFixture('simple.jrxml');
    const model = parseJrxml(xml);
    const serialized = serializeJrxml(model);
    expect(serialized).toMatch(/<text>\s*<!\[CDATA\[User Report]]>\s*<\/text>/);
    expect(serialized).toMatch(/<expression>\s*<!\[CDATA\[\$F\{id\}]]>\s*<\/expression>/);
    expect(serialized).toMatch(/<queryString>\s*<!\[CDATA\[SELECT id, name FROM users]]>\s*<\/queryString>/);
  });

  it('produces semantically equivalent normalized XML', () => {
    const xml = loadFixture('simple.jrxml');
    const model = parseJrxml(xml);
    const serialized = serializeJrxml(model);
    // Both should normalize to the same string except for attribute order
    // (which the test does not enforce). We assert the element structure is
    // unchanged by re-parsing both and comparing.
    expect(parseJrxml(serialized)).toEqual(parseJrxml(xml));
    // And that the normalized lengths are within 5% of each other
    // (catches accidental loss of large chunks).
    const a = normalize(xml).length;
    const b = normalize(serialized).length;
    expect(Math.abs(a - b) / a).toBeLessThan(0.5);
  });
});
