/**
 * Shared `:host` rules for the selection outline and pointer cursor, applied
 * by `ElementInteractionDirective` via the `.selectable` / `.selected` host
 * classes. Imported into each per-kind element component's styles array.
 */
export const INTERACTION_STYLES = `
  :host(.selectable) { cursor: pointer; }
  :host(.selected) { outline: 2px solid #4a6cf7; outline-offset: 0; }
  :host(.je-hidden) { opacity: 0.35; }
  :host(.je-locked) { cursor: not-allowed; }
  :host(.je-locked.selected) { outline-color: #f7964a; }
`;
