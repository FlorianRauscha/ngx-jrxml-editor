import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

import { DEMO_WORKSPACE_FILES_PROVIDER } from './workspace/workspace-files-provider-impl';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    DEMO_WORKSPACE_FILES_PROVIDER,
  ],
};
