import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { BreakElement } from '../../model/element';
import { commonElementStyle, styleObjectToString } from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-break-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-break',
    '[attr.style]': 'style()',
  },
  template: ``,
  styles: [
    `
      :host {
        position: absolute;
        border-top: 1px dashed #aaa;
        background: transparent;
        box-sizing: border-box;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperBreakElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);

  protected readonly element = computed(() => this.interaction.element() as BreakElement);

  protected readonly style = computed(() => {
    const css = commonElementStyle(this.element());
    css['height'] = '0';
    return styleObjectToString(css);
  });
}
