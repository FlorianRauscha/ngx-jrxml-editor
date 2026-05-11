import { XMLBuilder, XMLParser } from 'fast-xml-parser';

export const ATTR = '@_';

const parserOpts = {
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  parseAttributeValue: false,
  parseTagValue: false,
  // Trim is required because fast-xml-parser's pretty printer surrounds
  // CDATA blocks with indentation that would otherwise become part of the
  // string content on re-parse. JR doesn't carry semantic leading/trailing
  // whitespace inside these elements, so trimming is safe.
  trimValues: true,
  cdataPropName: false as const,
};

const builderOpts = {
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  format: true,
  indentBy: '\t',
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
  cdataPropName: '__cdata',
  processEntities: true,
};

export const xmlParser = new XMLParser(parserOpts);
export const xmlBuilder = new XMLBuilder(builderOpts);

/** Wrap a string as CDATA when serialized through xmlBuilder. */
export function cdata(value: string): { __cdata: string } {
  return { __cdata: value };
}

/** Read child elements from a parser node. fast-xml-parser yields
 *  either a single object or an array depending on cardinality. */
export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Read text from a CDATA-bearing node, regardless of whether parser
 *  surfaced it as a string or an object. */
export function readText(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === 'string') return node;
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj['#text'] === 'string') return obj['#text'] as string;
  }
  return undefined;
}
