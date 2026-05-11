import { Injectable, computed, inject, type Signal } from '@angular/core';
import {
  WORKSPACE_FILES_PROVIDER,
  type WorkspaceFileKind,
  type WorkspaceFileRef,
  type WorkspaceFilesProvider,
} from 'ngx-jrxml-editor';

import { WorkspaceService } from './workspace.service';

@Injectable({ providedIn: 'root' })
export class DemoWorkspaceFilesProvider implements WorkspaceFilesProvider {
  private readonly workspace = inject(WorkspaceService);

  /** All files, minus the currently-active one (a report can't reference
   *  itself as subreport or image). */
  private readonly all = computed<readonly WorkspaceFileRef[]>(() => {
    const active = this.workspace.activePath();
    return this.workspace.files()
      .filter((f) => f.path !== active)
      .map((f) => ({ path: f.path, kind: f.kind }));
  });

  private readonly jrxml = computed<readonly WorkspaceFileRef[]>(() =>
    this.all().filter((f) => f.kind === 'jrxml'),
  );
  private readonly images = computed<readonly WorkspaceFileRef[]>(() =>
    this.all().filter((f) => f.kind === 'image'),
  );

  list(kind?: WorkspaceFileKind): Signal<readonly WorkspaceFileRef[]> {
    if (kind === 'jrxml') return this.jrxml;
    if (kind === 'image') return this.images;
    return this.all;
  }

  resolveDataUrl(path: string): string | null {
    return this.workspace.resolveImageDataUrl(path);
  }
}

export const DEMO_WORKSPACE_FILES_PROVIDER = {
  provide: WORKSPACE_FILES_PROVIDER,
  useExisting: DemoWorkspaceFilesProvider,
};
