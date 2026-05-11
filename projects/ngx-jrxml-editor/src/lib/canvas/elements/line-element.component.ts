import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { LineElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import {
  commonElementStyle,
  effectiveCommon,
  effectivePen,
  penToBorder,
  styleObjectToString,
} from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-line-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-line',
    '[attr.style]': 'style()',
  },
  template: ``,
  styles: [
    `
      :host {
        position: absolute;
        background: transparent;
        box-sizing: border-box;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperLineElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as LineElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() => {
    const el = this.element();
    const rs = this.resolvedStyle();
    const css = commonElementStyle(effectiveCommon(el, rs));
    const border = penToBorder(effectivePen(el.pen, rs));
    if (el.direction === 'BottomUp') {
      css['border-top'] = border;
      css['transform'] = 'scaleY(-1)';
    } else if (el.height <= 1 || el.width > el.height) {
      css['border-top'] = border;
    } else {
      css['border-left'] = border;
    }
    return styleObjectToString(css);
  });
}
