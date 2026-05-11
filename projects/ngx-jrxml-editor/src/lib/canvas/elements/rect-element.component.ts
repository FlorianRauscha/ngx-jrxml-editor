import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { RectangleElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import { computeShapeCss, styleObjectToString } from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-rect-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-rect',
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
export class JasperRectElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as RectangleElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(computeShapeCss(this.element(), this.resolvedStyle(), 'rect')),
  );
}
