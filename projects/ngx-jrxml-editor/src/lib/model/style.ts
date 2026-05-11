import type { HAlign, VAlign } from './units';

export interface Pen {
  lineWidth?: number;
  lineStyle?: 'Solid' | 'Dashed' | 'Dotted' | 'Double';
  lineColor?: string;
}

export interface Font {
  fontName?: string;
  size?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikeThrough?: boolean;
  pdfFontName?: string;
  pdfEncoding?: string;
  isPdfEmbedded?: boolean;
}

export interface ParagraphSpacing {
  lineSpacing?: 'Single' | 'OneAndHalf' | 'Double' | 'AtLeast' | 'Fixed' | 'Proportional';
  lineSpacingSize?: number;
  firstLineIndent?: number;
  leftIndent?: number;
  rightIndent?: number;
  spacingBefore?: number;
  spacingAfter?: number;
}

export interface TextStyle extends Font {
  hTextAlign?: HAlign;
  vTextAlign?: VAlign;
  rotation?: 'None' | 'Left' | 'Right' | 'UpsideDown';
  markup?: 'none' | 'styled' | 'html' | 'rtf';
  paragraph?: ParagraphSpacing;
}

export interface Style {
  name: string;
  isDefault?: boolean;
  parentStyle?: string;
  forecolor?: string;
  backcolor?: string;
  mode?: 'Opaque' | 'Transparent';
  pen?: Pen;
  font?: Font;
  text?: TextStyle;
  /** `<conditionalStyle>` children — preserved for round-trip. */
  conditionalStyles?: ConditionalStyle[];
}

/** A conditional override on a parent <style>. Carries the same visual props
 *  as Style and a Java expression that gates them at render time. */
export interface ConditionalStyle {
  conditionExpression: string;
  forecolor?: string;
  backcolor?: string;
  mode?: 'Opaque' | 'Transparent';
  pen?: Pen;
  text?: TextStyle;
}
