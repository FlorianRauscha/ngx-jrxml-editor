import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { ChartElement } from '../../model/element';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { JasperIconComponent, type JasperIconName } from '../../icon/jasper-icon.component';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-chart-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JasperIconComponent],
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-chart',
    '[style.left.px]': 'element().x',
    '[style.top.px]': 'element().y',
    '[style.width.px]': 'element().width',
    '[style.height.px]': 'element().height',
  },
  template: `
    <div class="ch-icon"><lib-icon [name]="iconName()" [size]="32" /></div>
    <div class="ch-label">{{ element().chartType }}</div>
    @if (binding(); as b) {
      <div class="ch-binding">{{ b }}</div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        background: linear-gradient(135deg, #f5f8ff 0%, #eef0f4 100%);
        border: 1px dashed #b3b8c2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: #4a6cf7;
        box-sizing: border-box;
        overflow: hidden;
      }
      .ch-icon { color: #4a6cf7; }
      .ch-label {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
        font-weight: 600;
        color: #4a6cf7;
        letter-spacing: 0.04em;
      }
      .ch-binding {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 10px;
        color: #6b7280;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperChartElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  protected readonly element = computed(() => this.interaction.element() as ChartElement);

  protected iconName(): JasperIconName {
    const t = this.element().chartType;
    if (t.startsWith('pie')) return 'pie-chart';
    if (t.startsWith('line')) return 'line-chart';
    return 'bar-chart';
  }

  /** One-line summary of the dataset bindings shown under the placeholder. */
  protected binding = computed<string>(() => {
    const ds = this.element().dataset;
    if (ds.kind === 'pie') {
      return `${ds.keyExpression || '?'} → ${ds.valueExpression || '?'}`;
    }
    const s = ds.series[0];
    if (!s) return '(no series)';
    return `${s.categoryExpression || '?'} → ${s.valueExpression || '?'}`;
  });
}
