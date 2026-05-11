import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { CrosstabElement } from '../../model/element';
import { JasperIconComponent } from '../../icon/jasper-icon.component';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-crosstab-element',
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
    class: 'je-crosstab',
    '[style.left.px]': 'element().x',
    '[style.top.px]': 'element().y',
    '[style.width.px]': 'element().width',
    '[style.height.px]': 'element().height',
  },
  template: `
    <div class="cx-icon"><lib-icon name="crosstab" [size]="20" /></div>
    <div class="cx-grid">
      <div class="cx-cell cx-corner"></div>
      @for (cg of columnGroups(); track cg.name) {
        <div class="cx-cell cx-col-h">{{ cg.name }}</div>
      }
      @for (rg of rowGroups(); track rg.name; let ri = $index) {
        <div class="cx-cell cx-row-h">{{ rg.name }}</div>
        @for (cg of columnGroups(); track cg.name) {
          <div class="cx-cell cx-data">{{ ri === 0 ? measures()[0]?.name ?? '' : '' }}</div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
        border: 1px dashed #b45309;
        box-sizing: border-box;
        overflow: hidden;
        padding: 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cx-icon {
        position: absolute;
        top: 4px;
        right: 4px;
        color: #b45309;
        opacity: 0.6;
      }
      .cx-grid {
        flex: 1;
        display: grid;
        grid-template-columns: 80px repeat(var(--cx-cols, 1), minmax(0, 1fr));
        gap: 2px;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 10px;
      }
      .cx-cell {
        background: #fff;
        border: 1px solid #d8dbe3;
        padding: 2px 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #333;
      }
      .cx-corner { background: #f4f5f8; }
      .cx-col-h { background: #fde68a; font-weight: 600; }
      .cx-row-h { background: #fde68a; font-weight: 600; }
      .cx-data { color: #888; }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperCrosstabElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  protected readonly element = computed(() => this.interaction.element() as CrosstabElement);
  protected readonly rowGroups = computed(() => this.element().rowGroups);
  protected readonly columnGroups = computed(() => this.element().columnGroups);
  protected readonly measures = computed(() => this.element().measures);
}
