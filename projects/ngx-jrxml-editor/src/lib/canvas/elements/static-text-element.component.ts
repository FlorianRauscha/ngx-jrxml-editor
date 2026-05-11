import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { StaticTextElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import { computeTextElementCss, styleObjectToString } from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-static-text-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-static-text',
    '[attr.style]': 'style()',
  },
  template: `{{ element().text }}`,
  styles: [
    `
      :host {
        position: absolute;
        overflow: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        display: flex;
        padding: 1px 2px;
        box-sizing: border-box;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperStaticTextElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as StaticTextElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(computeTextElementCss(this.element(), this.resolvedStyle())),
  );
}
