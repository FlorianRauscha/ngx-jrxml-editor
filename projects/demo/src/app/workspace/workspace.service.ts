import { Injectable, computed, effect, signal } from '@angular/core';
import JSZip from 'jszip';

const STORAGE_KEY = 'ngx-jrxml-editor-demo:workspace';
const STORAGE_VERSION = 1;

interface StoredWorkspace {
  version: 1;
  name: string;
  mainReport: string | null;
  activePath: string | null;
  files: WorkspaceFile[];
}

/** A file in the workspace. Stage 1 only handles `jrxml`; `image` is stubbed
 *  so future stages can extend the bundle/import code without rewriting. */
export interface WorkspaceFile {
  /** Path relative to the workspace root, e.g. `main.jrxml`,
   *  `subreports/invoice.jrxml`, `images/logo.png`. */
  path: string;
  kind: 'jrxml' | 'image';
  /** UTF-8 text for `jrxml`, base64 for `image` (stub). */
  content: string;
}

interface WorkspaceManifest {
  version: 1;
  mainReport: string | null;
  files: { path: string; kind: 'jrxml' | 'image' }[];
}

const MANIFEST_PATH = 'manifest.json';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly _files = signal<Map<string, WorkspaceFile>>(new Map());
  private readonly _activePath = signal<string | null>(null);
  private readonly _mainReport = signal<string | null>(null);
  private readonly _name = signal<string>('Untitled Workspace');

  /** True when persisted state was successfully restored on boot — lets the
   *  app skip its default sample so the user doesn't lose their workspace. */
  private _hydratedFromStorage = false;
  /** Suppress the autosave effect during programmatic hydration / reset; we
   *  flip it off again once the writes have settled. */
  private suppressPersist = false;

  constructor() {
    this.tryHydrate();
    // Autosave on any tracked change. The effect runs in the injection context
    // of the service, so it stays alive for the app's lifetime.
    effect(() => {
      // Track each persisted signal explicitly so the effect re-runs.
      this._files();
      this._activePath();
      this._mainReport();
      this._name();
      if (this.suppressPersist) return;
      this.persist();
    });
  }

  hasPersistedState(): boolean {
    return this._hydratedFromStorage;
  }

  /** Clear persisted storage and forget hydration so the app can fall back to
   *  its sample workspace. */
  clearPersisted(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this._hydratedFromStorage = false;
  }

  private tryHydrate(): void {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed: StoredWorkspace | null = null;
    try {
      parsed = JSON.parse(raw) as StoredWorkspace;
    } catch {
      return;
    }
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.files) || parsed.files.length === 0) {
      return;
    }
    const map = new Map<string, WorkspaceFile>();
    for (const f of parsed.files) {
      if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
      if (f.kind !== 'jrxml' && f.kind !== 'image') continue;
      map.set(f.path, { path: f.path, kind: f.kind, content: f.content });
    }
    if (map.size === 0) return;
    this.suppressPersist = true;
    this._files.set(map);
    this._mainReport.set(parsed.mainReport ?? null);
    this._activePath.set(map.has(parsed.activePath ?? '') ? parsed.activePath : null);
    this._name.set(typeof parsed.name === 'string' ? parsed.name : 'Workspace');
    this.suppressPersist = false;
    this._hydratedFromStorage = true;
  }

  private persist(): void {
    const data: StoredWorkspace = {
      version: STORAGE_VERSION,
      name: this._name(),
      mainReport: this._mainReport(),
      activePath: this._activePath(),
      files: this.files(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota exceeded or storage unavailable — surface only via console; the
      // demo continues to work in-memory.
      console.warn('Workspace autosave failed');
    }
  }

  readonly name = this._name.asReadonly();
  readonly activePath = this._activePath.asReadonly();
  readonly mainReport = this._mainReport.asReadonly();

  /** Sorted-by-path list, jrxml first then image. */
  readonly files = computed<WorkspaceFile[]>(() => {
    const arr = [...this._files().values()];
    arr.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'jrxml' ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
    return arr;
  });

  readonly activeContent = computed<string>(() => {
    const p = this._activePath();
    if (!p) return '';
    return this._files().get(p)?.content ?? '';
  });

  /** Replace the entire workspace with a single jrxml file. Useful when the
   *  user clicks a sample button — we want sample switches to feel atomic. */
  resetWith(name: string, path: string, content: string): void {
    const map = new Map<string, WorkspaceFile>();
    map.set(path, { path, kind: 'jrxml', content });
    this._files.set(map);
    this._activePath.set(path);
    this._mainReport.set(path);
    this._name.set(name);
  }

  setActive(path: string): void {
    if (!this._files().get(path)) return;
    if (this._activePath() === path) return;
    this._activePath.set(path);
  }

  /** Update the active file's content. No-op if nothing changes (the editor's
   *  echo guard means we get one of these per real edit, not per cycle). */
  updateActiveContent(content: string): void {
    const path = this._activePath();
    if (!path) return;
    const cur = this._files().get(path);
    if (!cur || cur.content === content) return;
    const next = new Map(this._files());
    next.set(path, { ...cur, content });
    this._files.set(next);
  }

  addJrxmlFile(path: string, content = EMPTY_JRXML(path)): void {
    if (this._files().has(path)) return;
    const next = new Map(this._files());
    next.set(path, { path, kind: 'jrxml', content });
    this._files.set(next);
    if (this._mainReport() === null) this._mainReport.set(path);
    this._activePath.set(path);
  }

  /** Add an image file. Auto-suffixes the path on collision (`logo.png` →
   *  `logo_2.png`). Content is base64 (no `data:` prefix). */
  addImageFile(path: string, base64: string): string {
    const finalPath = this.uniquePath(path);
    const next = new Map(this._files());
    next.set(finalPath, { path: finalPath, kind: 'image', content: base64 });
    this._files.set(next);
    return finalPath;
  }

  /** Compute a `data:` URL for the named image file, or null if not found. */
  resolveImageDataUrl(path: string): string | null {
    const f = this._files().get(path);
    if (!f || f.kind !== 'image') return null;
    return `data:${mimeFor(path)};base64,${f.content}`;
  }

  private uniquePath(path: string): string {
    if (!this._files().has(path)) return path;
    const dot = path.lastIndexOf('.');
    const base = dot >= 0 ? path.slice(0, dot) : path;
    const ext = dot >= 0 ? path.slice(dot) : '';
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}_${i}${ext}`;
      if (!this._files().has(candidate)) return candidate;
    }
    return `${base}_${Date.now()}${ext}`;
  }

  /** Rename a file. Refuses no-op renames and collisions. References inside
   *  other JRXMLs are NOT rewritten — that's a later stage. */
  renameFile(oldPath: string, newPath: string): { ok: true } | { ok: false; reason: string } {
    if (oldPath === newPath) return { ok: false, reason: 'Same path' };
    const files = this._files();
    const cur = files.get(oldPath);
    if (!cur) return { ok: false, reason: 'File not found' };
    if (files.has(newPath)) return { ok: false, reason: 'A file with that path already exists' };
    const next = new Map<string, WorkspaceFile>();
    // Preserve insertion order so the file list stays stable across renames.
    for (const [k, v] of files) {
      next.set(k === oldPath ? newPath : k, k === oldPath ? { ...v, path: newPath } : v);
    }
    this._files.set(next);
    if (this._mainReport() === oldPath) this._mainReport.set(newPath);
    if (this._activePath() === oldPath) this._activePath.set(newPath);
    return { ok: true };
  }

  /** Mark `path` as the main entry-point report. Must be a jrxml. */
  setMainReport(path: string): void {
    const f = this._files().get(path);
    if (!f || f.kind !== 'jrxml') return;
    if (this._mainReport() === path) return;
    this._mainReport.set(path);
  }

  removeFile(path: string): void {
    if (!this._files().has(path)) return;
    const next = new Map(this._files());
    next.delete(path);
    this._files.set(next);
    if (this._mainReport() === path) {
      const fallback = [...next.values()].find((f) => f.kind === 'jrxml')?.path ?? null;
      this._mainReport.set(fallback);
    }
    if (this._activePath() === path) {
      const fallback = [...next.values()].find((f) => f.kind === 'jrxml')?.path ?? null;
      this._activePath.set(fallback);
    }
  }

  /** Pack the workspace into a zip blob. Layout: `manifest.json` at the root,
   *  every file at its declared path. */
  async exportZip(): Promise<Blob> {
    const zip = new JSZip();
    const files = this.files();
    const manifest: WorkspaceManifest = {
      version: 1,
      mainReport: this._mainReport(),
      files: files.map((f) => ({ path: f.path, kind: f.kind })),
    };
    zip.file(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    for (const f of files) {
      if (f.kind === 'jrxml') {
        zip.file(f.path, f.content);
      } else {
        zip.file(f.path, f.content, { base64: true });
      }
    }
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  /** Load a workspace zip. If a `manifest.json` is present we trust it;
   *  otherwise infer from file extensions. */
  async importZip(blob: Blob, name = 'Workspace'): Promise<void> {
    const zip = await JSZip.loadAsync(blob);
    const manifestEntry = zip.file(MANIFEST_PATH);
    let manifest: WorkspaceManifest | null = null;
    if (manifestEntry) {
      try {
        manifest = JSON.parse(await manifestEntry.async('string')) as WorkspaceManifest;
      } catch {
        manifest = null;
      }
    }

    const next = new Map<string, WorkspaceFile>();
    let mainReport: string | null = manifest?.mainReport ?? null;

    if (manifest) {
      for (const entry of manifest.files) {
        const file = zip.file(entry.path);
        if (!file) continue;
        const content = entry.kind === 'jrxml'
          ? await file.async('string')
          : await file.async('base64');
        next.set(entry.path, { path: entry.path, kind: entry.kind, content });
      }
    } else {
      // Manifest-less zips: infer from extensions, ignore folder entries.
      const entries = Object.values(zip.files).filter((f) => !f.dir);
      for (const e of entries) {
        const path = e.name;
        if (path === MANIFEST_PATH) continue;
        const isJrxml = /\.jrxml$/i.test(path);
        const isImage = /\.(png|jpe?g|gif|svg|webp)$/i.test(path);
        if (!isJrxml && !isImage) continue;
        const kind: 'jrxml' | 'image' = isJrxml ? 'jrxml' : 'image';
        const content = isJrxml ? await e.async('string') : await e.async('base64');
        next.set(path, { path, kind, content });
        if (isJrxml && !mainReport) mainReport = path;
      }
    }

    if (next.size === 0) throw new Error('Workspace zip contains no readable files');
    this._files.set(next);
    this._mainReport.set(mainReport);
    this._activePath.set(mainReport ?? [...next.values()].find((f) => f.kind === 'jrxml')?.path ?? null);
    this._name.set(name);
  }
}

function mimeFor(path: string): string {
  const ext = path.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

/** Minimal jrxml stub used for newly-created files. */
function EMPTY_JRXML(path: string): string {
  const name = path.replace(/\.jrxml$/i, '').replace(/^.*\//, '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="${name}" pageWidth="595" pageHeight="842" columnWidth="555" leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20">
  <detail>
    <band height="50"/>
  </detail>
</jasperReport>`;
}
