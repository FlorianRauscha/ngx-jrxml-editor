import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Icon name. Each one's SVG paths are baked into the template below.
 *  Geometry comes from Lucide (https://lucide.dev, MIT). */
export type JasperIconName =
  // editor toolbar
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste'
  | 'trash'
  | 'zoom-in'
  | 'zoom-out'
  // view toggles
  | 'panel-left'
  | 'panel-right'
  // demo / file ops
  | 'folder-open'
  | 'save'
  // palette
  | 'type'
  | 'variable'
  | 'image'
  | 'minus'
  | 'square'
  | 'circle'
  | 'frame'
  | 'corner-down-right'
  | 'file'
  | 'table'
  | 'qr-code'
  // datasource panel
  | 'plus'
  | 'x'
  // alignment toolbar
  | 'align-left'
  | 'align-h-center'
  | 'align-right'
  | 'align-top'
  | 'align-v-center'
  | 'align-bottom'
  | 'distribute-h'
  | 'distribute-v'
  // z-order
  | 'bring-to-front'
  | 'send-to-back'
  | 'bring-forward'
  | 'send-backward'
  // lock + visibility
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eye-off'
  // source view
  | 'search'
  // charts + groups
  | 'pie-chart'
  | 'bar-chart'
  | 'line-chart'
  | 'group'
  | 'chevron-down'
  | 'chevron-right'
  | 'crosstab';

@Component({
  selector: 'lib-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
      svg {
        display: block;
      }
    `,
  ],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name()) {
        @case ('undo') {
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        }
        @case ('redo') {
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
        }
        @case ('copy') {
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        }
        @case ('paste') {
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        }
        @case ('trash') {
          <path d="M3 6h18"></path>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" x2="10" y1="11" y2="17"></line>
          <line x1="14" x2="14" y1="11" y2="17"></line>
        }
        @case ('zoom-in') {
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
          <line x1="11" x2="11" y1="8" y2="14"></line>
          <line x1="8" x2="14" y1="11" y2="11"></line>
        }
        @case ('zoom-out') {
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
          <line x1="8" x2="14" y1="11" y2="11"></line>
        }
        @case ('panel-left') {
          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
          <path d="M9 3v18"></path>
        }
        @case ('panel-right') {
          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
          <path d="M15 3v18"></path>
        }
        @case ('folder-open') {
          <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>
        }
        @case ('save') {
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        }
        @case ('type') {
          <polyline points="4 7 4 4 20 4 20 7"></polyline>
          <line x1="9" x2="15" y1="20" y2="20"></line>
          <line x1="12" x2="12" y1="4" y2="20"></line>
        }
        @case ('variable') {
          <path d="M8 21s-4-3-4-9 4-9 4-9"></path>
          <path d="M16 3s4 3 4 9-4 9-4 9"></path>
          <line x1="15" x2="9" y1="9" y2="15"></line>
          <line x1="9" x2="15" y1="9" y2="15"></line>
        }
        @case ('image') {
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
          <circle cx="9" cy="9" r="2"></circle>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
        }
        @case ('minus') {
          <line x1="5" x2="19" y1="12" y2="12"></line>
        }
        @case ('square') {
          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        }
        @case ('circle') {
          <circle cx="12" cy="12" r="10"></circle>
        }
        @case ('frame') {
          <line x1="22" x2="2" y1="6" y2="6"></line>
          <line x1="22" x2="2" y1="18" y2="18"></line>
          <line x1="6" x2="6" y1="2" y2="22"></line>
          <line x1="18" x2="18" y1="2" y2="22"></line>
        }
        @case ('corner-down-right') {
          <polyline points="15 10 20 15 15 20"></polyline>
          <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
        }
        @case ('file') {
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        }
        @case ('table') {
          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
          <path d="M3 9h18"></path>
          <path d="M3 15h18"></path>
          <path d="M12 3v18"></path>
        }
        @case ('qr-code') {
          <rect width="5" height="5" x="3" y="3" rx="1"></rect>
          <rect width="5" height="5" x="16" y="3" rx="1"></rect>
          <rect width="5" height="5" x="3" y="16" rx="1"></rect>
          <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
          <path d="M21 21v.01"></path>
          <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
          <path d="M3 12h.01"></path>
          <path d="M12 3h.01"></path>
          <path d="M12 16v.01"></path>
          <path d="M16 12h1"></path>
          <path d="M21 12v.01"></path>
          <path d="M12 21v-1"></path>
        }
        @case ('plus') {
          <path d="M5 12h14"></path>
          <path d="M12 5v14"></path>
        }
        @case ('x') {
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        }
        @case ('align-left') {
          <rect width="9" height="6" x="3" y="5" rx="2"></rect>
          <rect width="16" height="6" x="3" y="13" rx="2"></rect>
          <path d="M2 2v20"></path>
        }
        @case ('align-h-center') {
          <rect width="14" height="6" rx="2" x="5" y="14"></rect>
          <rect width="10" height="6" rx="2" x="7" y="4"></rect>
          <path d="M12 2v20"></path>
        }
        @case ('align-right') {
          <rect width="16" height="6" x="5" y="5" rx="2"></rect>
          <rect width="9" height="6" x="12" y="13" rx="2"></rect>
          <path d="M22 2v20"></path>
        }
        @case ('align-top') {
          <rect width="6" height="16" x="4" y="6" rx="2"></rect>
          <rect width="6" height="9" x="14" y="6" rx="2"></rect>
          <path d="M22 2H2"></path>
        }
        @case ('align-v-center') {
          <rect width="6" height="14" rx="2" x="14" y="5"></rect>
          <rect width="6" height="10" rx="2" x="4" y="7"></rect>
          <path d="M22 12H2"></path>
        }
        @case ('align-bottom') {
          <rect width="6" height="16" x="4" y="2" rx="2"></rect>
          <rect width="6" height="9" x="14" y="9" rx="2"></rect>
          <path d="M22 22H2"></path>
        }
        @case ('distribute-h') {
          <rect width="6" height="14" x="4" y="5" rx="2"></rect>
          <rect width="6" height="10" x="14" y="7" rx="2"></rect>
          <path d="M17 22v-5"></path>
          <path d="M17 7V2"></path>
          <path d="M7 22v-3"></path>
          <path d="M7 5V2"></path>
        }
        @case ('distribute-v') {
          <rect width="14" height="6" x="5" y="14" rx="2"></rect>
          <rect width="10" height="6" x="7" y="4" rx="2"></rect>
          <path d="M22 7h-5"></path>
          <path d="M7 7H1"></path>
          <path d="M22 17h-3"></path>
          <path d="M7 17H5"></path>
        }
        @case ('bring-to-front') {
          <rect width="8" height="8" x="14" y="14" rx="2"></rect>
          <path d="M4 22a2 2 0 0 1-2-2"></path>
          <path d="M2 16v-2"></path>
          <path d="M2 10v-2"></path>
          <path d="M2 4a2 2 0 0 1 2-2"></path>
          <path d="M8 2h2"></path>
          <path d="M14 2h2"></path>
          <path d="M20 2a2 2 0 0 1 2 2"></path>
          <path d="M22 8v2"></path>
        }
        @case ('send-to-back') {
          <rect width="14" height="14" x="8" y="8" rx="2"></rect>
          <path d="M4 10V8a2 2 0 0 1 2-2"></path>
          <path d="M14 6h-2"></path>
          <path d="M22 14v-2a2 2 0 0 0-2-2"></path>
        }
        @case ('bring-forward') {
          <rect width="14" height="14" x="3" y="7" rx="2"></rect>
          <path d="M14 7V5a2 2 0 0 1 2-2h2"></path>
          <path d="M22 9V7a2 2 0 0 0-2-2"></path>
        }
        @case ('send-backward') {
          <rect width="14" height="14" x="7" y="3" rx="2"></rect>
          <path d="M3 17a2 2 0 0 0 2 2h2"></path>
          <path d="M21 13v2a2 2 0 0 1-2 2"></path>
        }
        @case ('lock') {
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        }
        @case ('unlock') {
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        }
        @case ('eye') {
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        }
        @case ('eye-off') {
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
          <line x1="2" x2="22" y1="2" y2="22"></line>
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        }
        @case ('pie-chart') {
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
          <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
        }
        @case ('bar-chart') {
          <line x1="12" x2="12" y1="20" y2="10"></line>
          <line x1="18" x2="18" y1="20" y2="4"></line>
          <line x1="6" x2="6" y1="20" y2="16"></line>
        }
        @case ('line-chart') {
          <path d="M3 3v18h18"></path>
          <path d="m19 9-5 5-4-4-3 3"></path>
        }
        @case ('group') {
          <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
          <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
          <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
          <rect width="7" height="5" x="7" y="7" rx="1"></rect>
          <rect width="7" height="5" x="10" y="12" rx="1"></rect>
        }
        @case ('chevron-down') {
          <polyline points="6 9 12 15 18 9"></polyline>
        }
        @case ('chevron-right') {
          <polyline points="9 18 15 12 9 6"></polyline>
        }
        @case ('crosstab') {
          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
          <path d="M3 9h18"></path>
          <path d="M9 3v18"></path>
          <path d="M3 15h18"></path>
          <path d="M15 3v18"></path>
        }
      }
    </svg>
  `,
})
export class JasperIconComponent {
  readonly name = input.required<JasperIconName>();
  readonly size = input<number>(16);
}
