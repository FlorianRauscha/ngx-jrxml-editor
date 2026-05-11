import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { SubreportElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import {
  commonElementStyle,
  effectiveCommon,
  styleObjectToString,
} from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-subreport-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-subreport',
    '[attr.style]': 'style()',
  },
  template: `subreport: {{ element().expression }}`,
  styles: [
    `
      :host {
        position: absolute;
        border: 1px dashed #888;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
        font-size: 11px;
        background: rgba(0, 0, 0, 0.02);
        box-sizing: border-box;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperSubreportElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as SubreportElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(commonElementStyle(effectiveCommon(this.element(), this.resolvedStyle()))),
  );
}
