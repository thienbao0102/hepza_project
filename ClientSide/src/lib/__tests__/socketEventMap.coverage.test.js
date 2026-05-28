import { describe, it, expect } from 'vitest';
import * as userService from '@/services/userService';
import * as zoneService from '@/services/zoneService';
import * as industryService from '@/services/industryService';
import * as hashtagService from '@/services/hashtagService';
import * as regulationService from '@/services/regulationService';
import * as solutionService from '@/services/solutionService';
import * as summaryService from '@/services/summaryRecordService';
import * as emissionService from '@/services/emissionService';
import * as exportFileService from '@/services/exportFileService';
import * as errorLogService from '@/services/errorLogService';
import * as symbiosisService from '@/services/businessSysmbiosisService';
import * as enterpriseListService from '@/services/enterpriseListService';
import * as resourceWasteService from '@/services/resoureceAndWasteService';
import * as authService from '@/services/authService';
import { socketEventMap, httpOnlyFunctions } from '@/lib/socket-event-map';

const nonAuthModules = [
  userService,
  zoneService,
  industryService,
  hashtagService,
  resourceWasteService,
  regulationService,
  solutionService,
  summaryService,
  emissionService,
  exportFileService,
  errorLogService,
  symbiosisService,
  enterpriseListService,
];

const expectedHttpOnlyFunctions = new Set([
  ...httpOnlyFunctions,
  'handlerGetManagedCompany',
  'handlerAdminResetPassword',
  'handlerVerifyLoginOtp',
  'handlerResendLoginOtp',
  'uploadWasteAttachments',
]);

const collectMappedKeys = (mod) => {
  const keys = [];
  Object.entries(mod).forEach(([name, value]) => {
    if (typeof value === 'function') {
      keys.push(name);
      return;
    }

    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([subName, subValue]) => {
        if (typeof subValue === 'function') {
          keys.push(`${name}.${subName}`);
        }
      });
    }
  });
  return keys;
};

describe('socket event mapping coverage', () => {
  it('all non-auth service exports are mapped', () => {
    const allKeys = nonAuthModules.flatMap(collectMappedKeys);

    allKeys.forEach((fnKey) => {
      if (expectedHttpOnlyFunctions.has(fnKey)) return;
      expect(socketEventMap[fnKey], `Missing mapping for: ${fnKey}`).toBeTruthy();
    });
  });

  it('auth service functions stay http-only', () => {
    Object.keys(authService).forEach((fn) => {
      expect(expectedHttpOnlyFunctions.has(fn)).toBe(true);
    });
  });
});
