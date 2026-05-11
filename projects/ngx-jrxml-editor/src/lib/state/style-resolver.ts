import type { Pen, Style, TextStyle } from '../model/style';

/** Walk a JR named-style chain and merge it with the report's `isDefault` style.
 *
 *  Result properties are filled by walking, in order:
 *    1. the `isDefault="true"` style (if any)
 *    2. each ancestor of `name`, oldest first
 *    3. the named style itself
 *  …so the most specific (closest-to-element) value wins.
 *
 *  Returns `undefined` if neither a default style nor `name` resolves anything. */
export function resolveStyle(
  name: string | undefined,
  styles: Style[] | undefined,
): Style | undefined {
  if (!styles || styles.length === 0) return undefined;
  const byName = new Map(styles.map((s) => [s.name, s]));

  const chain: Style[] = [];
  const def = styles.find((s) => s.isDefault);
  if (def) chain.push(def);

  if (name) {
    const explicit: Style[] = [];
    const seen = new Set<string>();
    let cur = byName.get(name);
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      explicit.unshift(cur);
      cur = cur.parentStyle ? byName.get(cur.parentStyle) : undefined;
    }
    chain.push(...explicit);
  }

  if (chain.length === 0) return undefined;

  const out: Style = { name: '' };
  for (const s of chain) {
    if (s.forecolor !== undefined) out.forecolor = s.forecolor;
    if (s.backcolor !== undefined) out.backcolor = s.backcolor;
    if (s.mode !== undefined) out.mode = s.mode;
    if (s.pen) out.pen = { ...out.pen, ...s.pen };
    if (s.font) out.font = mergeText(out.font, s.font);
    if (s.text) out.text = mergeText(out.text, s.text);
  }
  return out;
}

function mergeText<T extends TextStyle | Pen | Record<string, unknown>>(
  base: T | undefined,
  add: T,
): T {
  return { ...(base ?? ({} as T)), ...add };
}
