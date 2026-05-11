import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
} from '@angular/core';

import type { ElementGroup } from '../../model/element';
import type { ElementPath } from '../../state/path';
import { JasperElementComponent } from '../jasper-element.component';

/**
 * `<elementGroup>` has no rendered surface of its own — it's a structural
 * container whose children render into the parent's stacking context. The host
 * uses `display: contents` so it adds nothing to the DOM box tree, and no
 * selection / drag wiring is attached (the group itself is never selectable;
 * its children are).
 */
@Component({
  selector: 'jasper-element-group-element',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [forwardRef(() => JasperElementComponent)],
  template: `
    @for (child of element().children; track $index; let i = $index) {
      <lib-jasper-element [element]="child" [path]="childPath(i)" />
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class JasperElementGroupElementComponent {
  readonly element = input.required<ElementGroup>();
  readonly path = input<ElementPath | null>(null);

  protected childPath(childIndex: number): ElementPath | null {
    const p = this.path();
    if (!p) return null;
    return { ...p, indices: [...p.indices, childIndex] };
  }
}
