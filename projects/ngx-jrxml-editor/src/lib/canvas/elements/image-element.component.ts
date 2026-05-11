import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { ImageElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import { WORKSPACE_FILES_PROVIDER } from '../../state/workspace-files-provider';
import { computeImageElementCss, styleObjectToString } from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-image-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-image',
    '[attr.style]': 'style()',
    '[class.has-preview]': '!!previewUrl()',
  },
  template: `
    @if (previewUrl(); as src) {
      <img [src]="src" [alt]="element().expression" draggable="false" />
    } @else {
      <span class="je-image-fallback">[image] {{ element().expression }}</span>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          repeating-linear-gradient(45deg, #f1f4ff, #f1f4ff 6px, #e6ebff 6px, #e6ebff 12px);
        color: #5b5b8a;
        font-size: 11px;
        text-align: center;
        box-sizing: border-box;
        overflow: hidden;
      }
      :host.has-preview {
        background: #fff;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
      }
      .je-image-fallback {
        padding: 2px 4px;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperImageElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });
  private readonly filesProvider = inject(WORKSPACE_FILES_PROVIDER, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as ImageElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(computeImageElementCss(this.element(), this.resolvedStyle())),
  );

  /** Try to resolve `expression` to a renderable URL. Best-effort design-time
   *  preview: only literal-string expressions (`"file.png"`) are matched; any
   *  Java-side computation (`$P{...}`, concatenation) falls back to the
   *  hatched placeholder. */
  protected readonly previewUrl = computed<string | null>(() => {
    const expr = this.element().expression?.trim();
    if (!expr) return null;
    const path = parseStringLiteral(expr);
    if (!path) return null;
    const resolve = this.filesProvider?.resolveDataUrl;
    if (!resolve) return null;
    return this.filesProvider!.resolveDataUrl!(path);
  });
}

/** Match a Java string literal — `"foo.png"` or `'foo.png'` — and return the
 *  inner content. Returns null for anything more complex. */
function parseStringLiteral(expr: string): string | null {
  if (expr.length < 2) return null;
  const quote = expr[0];
  if (quote !== '"' && quote !== "'") return null;
  if (expr[expr.length - 1] !== quote) return null;
  const inner = expr.slice(1, -1);
  // Reject expressions with embedded quotes (likely concatenation, not a literal).
  if (inner.includes(quote)) return null;
  return inner;
}
