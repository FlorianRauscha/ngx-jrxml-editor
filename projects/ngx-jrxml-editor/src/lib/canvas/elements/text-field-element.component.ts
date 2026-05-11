import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { TextFieldElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import { computeTextElementCss, styleObjectToString } from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-text-field-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-text-field',
    '[attr.style]': 'style()',
  },
  template: `{{ element().expression }}`,
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
        color: #5b5b8a;
        font-style: italic;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperTextFieldElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as TextFieldElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(computeTextElementCss(this.element(), this.resolvedStyle())),
  );
}
