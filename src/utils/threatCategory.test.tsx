// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AttackTypeChip } from '../components/Common/StatusChip';
import { getThreatCategory, getThreatCategoryColors, threatCategories, threatCategoryKeys } from './threatCategory';

afterEach(cleanup);

describe('generated Coraza category contract', () => {
  it.each([
    ['php_injection', 'PHP 注入'], ['java_injection', 'Java 注入'], ['session_fixation', '会话固定'],
    ['multipart_attack', 'Multipart 异常'], ['deprecated_header', '废弃请求头'],
    ['data_leak', '信息泄露'], ['sql_data_leak', 'SQL 信息泄露'], ['java_data_leak', 'Java 信息泄露'],
    ['php_data_leak', 'PHP 信息泄露'], ['iis_data_leak', 'IIS 信息泄露'], ['web_shell', 'WebShell 特征'],
    ['anomaly', '异常分数判定'], ['correlation', '事务关联'], ['generic_injection', '通用注入'],
  ])('renders %s with a native label in the shared chip', async (category, label) => {
    await i18n.changeLanguage('zh-CN');
    render(<I18nextProvider i18n={i18n}><AttackTypeChip attackType={category} /></I18nextProvider>);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText(category)).toBeNull();
  });

  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'])('translates every catalog category and alias in %s', language => {
    for (const category of threatCategories) {
      expect(typeof i18n.getResource(language, 'translation', category.label_key)).toBe('string');
      for (const id of [category.id, ...category.aliases]) {
        expect(threatCategoryKeys[id]).toBe(category.label_key);
        expect(getThreatCategoryColors(id)).toEqual(getThreatCategoryColors(category.id));
      }
    }
  });

  it.each([['SQLI','sql_injection'], ['RCE','command_injection'], ['path_traversal','lfi'], ['file_include','rfi']])('normalizes legacy %s while preserving future categories', async (input, expected) => {
    await i18n.changeLanguage('zh-CN');
    expect(getThreatCategory({ attackType: input })).toBe(expected);
    expect(getThreatCategory({ attackType: 'custom-extension-v2' })).toBe('custom-extension-v2');
    render(<I18nextProvider i18n={i18n}><AttackTypeChip attackType={input} /></I18nextProvider>);
    expect(screen.getByText(i18n.t(threatCategoryKeys[expected]))).toBeTruthy();
  });

  it('preserves rule fallbacks rather than inventing a named attack for unknown tags', () => {
    expect(getThreatCategory({ attackType: '', action: 'detected', ruleIDs: ['100001'] })).toBe('rule_alert');
    expect(getThreatCategory({ attackType: '', action: 'blocked', ruleIDs: ['100001'] })).toBe('rule_block');
    expect(getThreatCategory({ attackTypes: ['java_injection'] })).toBe('java_injection');
  });
});
