import type { AnyElement, JrProperty } from '../model/element';

/**
 * Editor-only metadata stored on element `<property>` children so it round-trips
 * through JRXML untouched. JR ignores these properties at runtime.
 */
export const LOCKED_PROP = 'com.jaspersoft.studio.editor.locked';
export const HIDDEN_PROP = 'com.jaspersoft.studio.editor.hidden';

function readFlag(el: AnyElement, name: string): boolean {
  if (el.kind === 'elementGroup') return false;
  const props = el.properties;
  if (!props) return false;
  const found = props.find((p) => p.name === name);
  return found?.value === 'true';
}

export function isLocked(el: AnyElement | null | undefined): boolean {
  return !!el && readFlag(el, LOCKED_PROP);
}

export function isHidden(el: AnyElement | null | undefined): boolean {
  return !!el && readFlag(el, HIDDEN_PROP);
}

/** Return a new properties array with `name` set to "true" or removed when value is false. */
export function setFlagProperty<T extends AnyElement>(el: T, name: string, on: boolean): T {
  if (el.kind === 'elementGroup') return el;
  const props: JrProperty[] = el.properties ? [...el.properties] : [];
  const idx = props.findIndex((p) => p.name === name);
  if (on) {
    if (idx >= 0) props[idx] = { name, value: 'true' };
    else props.push({ name, value: 'true' });
  } else if (idx >= 0) {
    props.splice(idx, 1);
  }
  const next = { ...el, properties: props.length > 0 ? props : undefined } as T;
  return next;
}
