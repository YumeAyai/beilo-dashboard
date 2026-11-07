// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { CommonChip } from '../components/Common/CommonChip';
import zhCN from '../i18n/locales/zh-CN.json';
import zhTW from '../i18n/locales/zh-TW.json';
import enUS from '../i18n/locales/en-US.json';
import jaJP from '../i18n/locales/ja-JP.json';

const resources = {
  'zh-CN': { translation: zhCN }, 'zh-TW': { translation: zhTW },
  'en-US': { translation: enUS }, 'ja-JP': { translation: jaJP },
};
const i18n = createInstance();

beforeAll(async () => { await i18n.use(initReactI18next).init({ lng: 'en-US', fallbackLng: false, resources }); });
afterEach(cleanup);

describe('dashboard summary card translations', () => {
  it.each([
    ['zh-CN', '服务拓扑', '威胁防护', '集群状态', '入口暴露面'],
    ['zh-TW', '服務拓撲', '威脅防護', '叢集狀態', '入口暴露面'],
    ['en-US', 'Service Topology', 'Threat Protection', 'Cluster Status', 'Exposed Entry Points'],
    ['ja-JP', 'サービストポロジー', '脅威防御', 'クラスターの状態', '入口の公開状況'],
  ])('defines all card labels and cluster states natively in %s', (language, topology, protection, cluster, exposure) => {
    const t = i18n.getFixedT(language);
    expect(t('dashboard.stats.topology')).toBe(topology);
    expect(t('dashboard.stats.threatBlock')).toBe(protection);
    expect(t('dashboard.stats.clusterStatus')).toBe(cluster);
    expect(t('dashboard.stats.entryExposure')).toBe(exposure);
    for (const section of ['stats', 'clusterStatus'] as const) {
      for (const key of Object.keys(zhCN.dashboard[section])) {
        const value: unknown = i18n.getResource(language, 'translation', `dashboard.${section}.${key}`);
        expect(typeof value).toBe('string');
        expect(value).not.toBe('');
        if (typeof value === 'string') expect(value).toBe(value.trim());
      }
    }
  });

  it('updates mounted cluster status chips when the language changes', async () => {
    await i18n.changeLanguage('en-US');
    render(<I18nextProvider i18n={i18n}>
      {['healthy', 'degraded', 'down', 'unknown'].map(status => <CommonChip key={status} type="status" value={status} />)}
    </I18nextProvider>);
    for (const label of ['Healthy', 'Degraded', 'Down', 'Unknown']) expect(screen.getByText(label)).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('ja-JP'); });
    for (const label of ['正常', '機能低下', '停止', '不明']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('Healthy')).toBeNull();
  });
});
