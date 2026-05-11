import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
} from '@angular/core';

import type { AnyElement, FrameElement } from '../../model/element';
import { EditorStore } from '../../state/editor-store';
import type { ElementPath } from '../../state/path';
import { resolveStyle } from '../../state/style-resolver';
import {
  boxToCss,
  commonElementStyle,
  effectiveCommon,
  effectivePen,
  penToBorder,
  styleObjectToString,
} from '../element-styles';
import { ElementInteractionDirective } from '../element-interaction.directive';
import { JasperElementComponent } from '../jasper-element.component';
import { JasperResizeHandlesComponent } from '../jasper-resize-handles.component';
import { INTERACTION_STYLES } from './interaction-styles';

@Component({
  selector: 'jasper-frame-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: ElementInteractionDirective,
      inputs: ['libElementInteraction: element', 'libElementPath: path'],
    },
  ],
  imports: [forwardRef(() => JasperElementComponent), JasperResizeHandlesComponent],
  host: {
    class: 'je-frame',
    '[attr.style]': 'style()',
  },
  template: `
    @for (child of element().children; track $index; let i = $index) {
      <lib-jasper-element [element]="child" [path]="childPath(i)" />
    }
    @if (selectedChild(); as sel) {
      <lib-jasper-resize-handles
        [element]="sel"
        [style.left.px]="sel.x"
        [style.top.px]="sel.y"
        [style.width.px]="sel.width"
        [style.height.px]="sel.height"
      />
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        box-sizing: border-box;
      }
    `,
    INTERACTION_STYLES,
  ],
})
export class JasperFrameElementComponent {
  private readonly interaction = inject(ElementInteractionDirective);
  private readonly store = inject(EditorStore, { optional: true });

  protected readonly element = computed(() => this.interaction.element() as FrameElement);

  private readonly resolvedStyle = computed(() =>
    resolveStyle(this.element().style, this.store?.report()?.styles),
  );

  protected readonly style = computed(() => {
    const el = this.element();
    const rs = this.resolvedStyle();
    const css = { ...commonElementStyle(effectiveCommon(el, rs)), ...boxToCss(el.box) };
    if (
      !el.box?.pen &&
      !el.box?.topPen &&
      !el.box?.rightPen &&
      !el.box?.bottomPen &&
      !el.box?.leftPen
    ) {
      const pen = effectivePen(undefined, rs);
      if (pen) css['border'] = penToBorder(pen);
    }
    return styleObjectToString(css);
  });

  protected childPath(childIndex: number): ElementPath | null {
    const p = this.interaction.path();
    if (!p) return null;
    return { ...p, indices: [...p.indices, childIndex] };
  }

  /** The directly-selected child of this frame (if any). Powers the resize
   *  handles overlaid inside the frame. Multi-selection or selections that
   *  point deeper than one level get no handles. */
  protected readonly selectedChild = computed<Exclude<AnyElement, { kind: 'elementGroup' }> | null>(() => {
    if (!this.store) return null;
    if (this.store.hasMultiSelection()) return null;
    const sel = this.store.selection();
    const myPath = this.interaction.path();
    if (!sel || !myPath) return null;
    if (sel.tableCell) return null;
    if (sel.section !== myPath.section) return null;
    if (sel.bandIndex !== myPath.bandIndex) return null;
    if ((sel.groupName ?? '') !== (myPath.groupName ?? '')) return null;
    if (sel.indices.length !== myPath.indices.length + 1) return null;
    for (let i = 0; i < myPath.indices.length; i++) {
      if (sel.indices[i] !== myPath.indices[i]) return null;
    }
    const childIndex = sel.indices[sel.indices.length - 1]!;
    const child = this.element().children[childIndex];
    if (!child || child.kind === 'elementGroup') return null;
    return child;
  });
}
