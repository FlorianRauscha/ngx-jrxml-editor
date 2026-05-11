import { InjectionToken, type Signal } from '@angular/core';

/** Kinds of host-side asset the editor knows how to surface as a picker. */
export type WorkspaceFileKind = 'jrxml' | 'image';

/** A single host-side file the editor can offer as a pickable expression
 *  target — e.g. a subreport jrxml or an image asset. */
export interface WorkspaceFileRef {
  /** The path to render in the picker and to embed in the JR expression. */
  path: string;
  kind: WorkspaceFileKind;
}

/** Host integration point that lets the editor's inspector show pickers for
 *  expressions that reference other files (subreports, images), and lets the
 *  canvas preview workspace image assets. The library never assumes any host
 *  state — implement only the parts you need. */
export interface WorkspaceFilesProvider {
  /** Live list of available files, optionally filtered by kind. The signal
   *  must update reactively as files are added/renamed/removed so the
   *  inspector picker refreshes. */
  list(kind?: WorkspaceFileKind): Signal<readonly WorkspaceFileRef[]>;

  /** Resolve `path` to a renderable URL — typically a `data:` URL. Used by
   *  the image element component to show a real preview when the image's
   *  expression is a literal `"path"` matching a workspace asset. Return
   *  `null` for unknown paths or non-image entries. */
  resolveDataUrl?(path: string): string | null;
}

/** Provide an implementation in the host (root-level providers or component
 *  providers) to enable workspace-aware pickers. When unprovided, the
 *  inspector falls back to plain text inputs. */
export const WORKSPACE_FILES_PROVIDER = new InjectionToken<WorkspaceFilesProvider>(
  'ngx-jrxml-editor.WorkspaceFilesProvider',
);
