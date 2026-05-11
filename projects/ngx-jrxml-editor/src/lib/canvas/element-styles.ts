import type {
  AnyElement,
  BoxBorders,
  ElementCommon,
  EllipseElement,
  ImageElement,
  RectangleElement,
  StaticTextElement,
  TextFieldElement,
} from '../model/element';
import type { Pen, Style, TextStyle } from '../model/style';

/** Map a JR HAlign to a CSS text-align value. */
export function hAlignToCss(h?: string): string | null {
  switch (h) {
    case 'Left':
      return 'left';
    case 'Center':
      return 'center';
    case 'Right':
      return 'right';
    case 'Justified':
      return 'justify';
    default:
      return null;
  }
}

export function vAlignToFlex(v?: string): string | null {
  switch (v) {
    case 'Top':
      return 'flex-start';
    case 'Middle':
      return 'center';
    case 'Bottom':
      return 'flex-end';
    default:
      return null;
  }
}

/** Compute absolute-position style for any element inside a band/frame. */
export function commonElementStyle(el: ElementCommon): Record<string, string> {
  const style: Record<string, string> = {
    position: 'absolute',
    left: el.x + 'px',
    top: el.y + 'px',
    width: el.width + 'px',
    height: el.height + 'px',
    'box-sizing': 'border-box',
  };
  if (el.backcolor && el.mode === 'Opaque') style['background-color'] = el.backcolor;
  if (el.forecolor) style['color'] = el.forecolor;
  return style;
}

export function textStyleToCss(t?: TextStyle): Record<string, string> {
  const out: Record<string, string> = {};
  if (!t) return out;
  if (t.fontName) out['font-family'] = `${t.fontName}, sans-serif`;
  if (t.size !== undefined) out['font-size'] = t.size + 'px';
  if (t.isBold) out['font-weight'] = 'bold';
  if (t.isItalic) out['font-style'] = 'italic';
  const decorations: string[] = [];
  if (t.isUnderline) decorations.push('underline');
  if (t.isStrikeThrough) decorations.push('line-through');
  if (decorations.length > 0) out['text-decoration'] = decorations.join(' ');
  const align = hAlignToCss(t.hTextAlign);
  if (align) out['text-align'] = align;
  return out;
}

export function penToBorder(pen?: Pen, fallback: string = '1px solid #000'): string {
  if (!pen) return fallback;
  const w = (pen.lineWidth ?? 1) + 'px';
  const style = (pen.lineStyle ?? 'Solid').toLowerCase();
  const color = pen.lineColor ?? '#000';
  const cssStyle = style === 'double' ? 'double' : style === 'dashed' ? 'dashed' : style === 'dotted' ? 'dotted' : 'solid';
  return `${w} ${cssStyle} ${color}`;
}

/** Convert a JR `key: value` map into a CSS string. */
export function styleObjectToString(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

export function isFrameLike(el: AnyElement): boolean {
  return el.kind === 'frame';
}

/** Merge a resolved named style into element-common props. Inline values win. */
export function effectiveCommon<T extends ElementCommon>(el: T, resolved: Style | undefined): T {
  if (!resolved) return el;
  return {
    ...el,
    forecolor: el.forecolor ?? resolved.forecolor,
    backcolor: el.backcolor ?? resolved.backcolor,
    mode: el.mode ?? resolved.mode,
  };
}

/** Merge a resolved named style's text/font props with the inline TextStyle.
 *  Style.font fills any text-style props the named `text` block didn't set. */
export function effectiveTextStyle(
  inline: TextStyle | undefined,
  resolved: Style | undefined,
): TextStyle | undefined {
  if (!resolved && !inline) return undefined;
  return { ...resolved?.font, ...resolved?.text, ...inline };
}

/** Merge a resolved named style's pen with the inline pen. Inline wins. */
export function effectivePen(inline: Pen | undefined, resolved: Style | undefined): Pen | undefined {
  if (!resolved?.pen && !inline) return inline;
  return { ...resolved?.pen, ...inline };
}

/** Compute the CSS for a text-bearing element (staticText / textField).
 *  Combines common props, box paddings/borders, font/decoration, and the
 *  flexbox horizontal/vertical alignment derived from `textStyle`. */
export function computeTextElementCss(
  el: StaticTextElement | TextFieldElement,
  resolved: Style | undefined,
): Record<string, string> {
  const text = effectiveTextStyle(el.textStyle, resolved);
  const css: Record<string, string> = {
    ...commonElementStyle(effectiveCommon(el, resolved)),
    ...boxToCss(el.box),
    ...textStyleToCss(text),
  };
  const justify = hAlignToCss(text?.hTextAlign);
  if (justify)
    css['justify-content'] =
      justify === 'center' ? 'center' : justify === 'right' ? 'flex-end' : 'flex-start';
  const v = vAlignToFlex(text?.vTextAlign);
  if (v) css['align-items'] = v;
  return css;
}

/** Compute the CSS for an image element: common + box paddings/borders. */
export function computeImageElementCss(
  el: ImageElement,
  resolved: Style | undefined,
): Record<string, string> {
  return {
    ...commonElementStyle(effectiveCommon(el, resolved)),
    ...boxToCss(el.box),
  };
}

/** Compute the CSS for a rectangle/ellipse: common + a single CSS border drawn
 *  from the resolved pen. `mode` selects rect vs ellipse border-radius. */
export function computeShapeCss(
  el: RectangleElement | EllipseElement,
  resolved: Style | undefined,
  mode: 'rect' | 'ellipse',
): Record<string, string> {
  const css = commonElementStyle(effectiveCommon(el, resolved));
  css['border'] = penToBorder(effectivePen(el.pen, resolved));
  if (mode === 'ellipse') {
    css['border-radius'] = '50%';
  } else if ('radius' in el && el.radius) {
    css['border-radius'] = el.radius + 'px';
  }
  return css;
}

/** Render a JR <box> as CSS padding + border declarations.
 *  Per-side overrides win over the uniform value. */
export function boxToCss(box: BoxBorders | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!box) return out;
  const t = box.topPadding ?? box.padding;
  const r = box.rightPadding ?? box.padding;
  const b = box.bottomPadding ?? box.padding;
  const l = box.leftPadding ?? box.padding;
  if (t !== undefined) out['padding-top'] = t + 'px';
  if (r !== undefined) out['padding-right'] = r + 'px';
  if (b !== undefined) out['padding-bottom'] = b + 'px';
  if (l !== undefined) out['padding-left'] = l + 'px';
  if (box.topPen) out['border-top'] = penToBorder(box.topPen);
  else if (box.pen) out['border-top'] = penToBorder(box.pen);
  if (box.rightPen) out['border-right'] = penToBorder(box.rightPen);
  else if (box.pen) out['border-right'] = penToBorder(box.pen);
  if (box.bottomPen) out['border-bottom'] = penToBorder(box.bottomPen);
  else if (box.pen) out['border-bottom'] = penToBorder(box.pen);
  if (box.leftPen) out['border-left'] = penToBorder(box.leftPen);
  else if (box.pen) out['border-left'] = penToBorder(box.pen);
  return out;
}
