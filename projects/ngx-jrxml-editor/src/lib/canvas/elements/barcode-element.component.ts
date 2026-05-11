import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { BarcodeElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import { resolveStyle } from '../../state/style-resolver';
import {
  commonElementStyle,
  effectiveCommon,
  styleObjectToString,
} from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { INTERACTION_STYLES } from './interaction-styles';

const TWO_D_BARCODES = new Set(['QRCode', 'DataMatrix', 'PDF417']);

@Component({
  selector: 'jasper-barcode-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  host: {
    class: 'je-barcode',
    '[attr.style]': 'style()',
  },
  template: `
    <div class="je-barcode-bars" [class.qr]="is2D()"></div>
    @if (showLabel()) {
      <div class="je-barcode-label">{{ label() }}</div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        background: #fff;
        border: 1px solid #d0d4dc;
        display: flex;
        flex-direction: column;
        font-size: 10px;
        font-family: ui-monospace, Menlo, monospace;
        overflow: hidden;
        box-sizing: border-box;
      }
      .je-barcode-bars {
        flex: 1;
        background-image: repeating-linear-gradient(
          to right,
          #1a1d27 0 2px,
          transparent 2px 4px,
          #1a1d27 4px 5px,
          transparent 5px 8px,
          #1a1d27 8px 11px,
          transparent 11px 13px
        );
      }
      .je-barcode-bars.qr {
        background-image:
          conic-gradient(
            from 0deg at 25% 25%,
            #1a1d27 0 25%,
            transparent 25% 50%,
            #1a1d27 50% 75%,
            transparent 75%
          ),
          conic-gradient(
            from 0deg at 75% 75%,
            #1a1d27 0 25%,
            transparent 25% 50%,
            #1a1d27 50% 75%,
            transparent 75%
          );
        background-size:
          40% 40%,
          40% 40%;
        background-position:
          0 0,
          100% 100%;
        background-repeat: repeat;
        background-color: #fff;
      }
      .je-barcode-label {
        text-align: center;
        padding: 1px 2px;
        color: #1a1d27;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperBarcodeElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as BarcodeElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() =>
    styleObjectToString(commonElementStyle(effectiveCommon(this.element(), this.resolvedStyle()))),
  );

  protected readonly is2D = computed(() => TWO_D_BARCODES.has(this.element().barcode.type));
  protected readonly showLabel = computed(() => this.element().barcode.textPosition !== 'none');
  protected readonly label = computed(() => {
    const bc = this.element().barcode;
    return bc.codeExpression || bc.type;
  });
}
