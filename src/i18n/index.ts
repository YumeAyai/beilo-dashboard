import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { policyAuditLocales } from './policyAudit';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import { dataplaneLocales } from './dataplane';
import { runtimeLibraryLocales } from './runtimeLibrary';
import { runtimeProtectionLocales } from './runtimeProtection';
import { runtimeNetworkLocales } from './runtimeNetwork';
import { runtimeAttributionLocales } from './runtimeAttribution';
import { clusterManagementLocales } from './clusterManagement';
import { notificationPipelineLocales } from './notificationPipeline';
import { ruleManagementLocales } from './ruleManagement';
import { crsUpdatesLocales } from './crsUpdates';
import { crsBuildLocales } from './crsBuild';

export const languages = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'zh-TW', name: '繁體中文', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ja-JP', name: '日本語', nativeName: '日本語' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

const resources = {
  'zh-CN': { translation: { runtimeLibrary: runtimeLibraryLocales['zh-CN'], policyAudit: policyAuditLocales['zh-CN'], ...zhCN, ruleManagement: ruleManagementLocales['zh-CN'], crsUpdates: crsUpdatesLocales['zh-CN'], crsBuild: crsBuildLocales['zh-CN'], dataplane: dataplaneLocales['zh-CN'], runtimeProtection: runtimeProtectionLocales['zh-CN'], runtimeNetwork: runtimeNetworkLocales['zh-CN'], runtimeAttribution: runtimeAttributionLocales['zh-CN'], notificationPipeline: notificationPipelineLocales['zh-CN'], clusterManagement: clusterManagementLocales['zh-CN'] } },
  'zh-TW': { translation: { runtimeLibrary: runtimeLibraryLocales['zh-TW'], policyAudit: policyAuditLocales['zh-TW'], ...zhTW, ruleManagement: ruleManagementLocales['zh-TW'], crsUpdates: crsUpdatesLocales['zh-TW'], crsBuild: crsBuildLocales['zh-TW'], dataplane: dataplaneLocales['zh-TW'], runtimeProtection: runtimeProtectionLocales['zh-TW'], runtimeNetwork: runtimeNetworkLocales['zh-TW'], runtimeAttribution: runtimeAttributionLocales['zh-TW'], notificationPipeline: notificationPipelineLocales['zh-TW'], clusterManagement: clusterManagementLocales['zh-TW'] } },
  'en-US': { translation: { runtimeLibrary: runtimeLibraryLocales['en-US'], policyAudit: policyAuditLocales['en-US'], ...enUS, ruleManagement: ruleManagementLocales['en-US'], crsUpdates: crsUpdatesLocales['en-US'], crsBuild: crsBuildLocales['en-US'], dataplane: dataplaneLocales['en-US'], runtimeProtection: runtimeProtectionLocales['en-US'], runtimeNetwork: runtimeNetworkLocales['en-US'], runtimeAttribution: runtimeAttributionLocales['en-US'], notificationPipeline: notificationPipelineLocales['en-US'], clusterManagement: clusterManagementLocales['en-US'] } },
  'ja-JP': { translation: { runtimeLibrary: runtimeLibraryLocales['ja-JP'], policyAudit: policyAuditLocales['ja-JP'], ...jaJP, ruleManagement: ruleManagementLocales['ja-JP'], crsUpdates: crsUpdatesLocales['ja-JP'], crsBuild: crsBuildLocales['ja-JP'], dataplane: dataplaneLocales['ja-JP'], runtimeProtection: runtimeProtectionLocales['ja-JP'], runtimeNetwork: runtimeNetworkLocales['ja-JP'], runtimeAttribution: runtimeAttributionLocales['ja-JP'], notificationPipeline: notificationPipelineLocales['ja-JP'], clusterManagement: clusterManagementLocales['ja-JP'] } },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
