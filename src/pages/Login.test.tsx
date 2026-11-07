// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';
import { rbacApi } from '../services/api';
import i18n from '../i18n';

const { setAuth } = vi.hoisted(() => ({ setAuth: vi.fn() }));
vi.mock('../services/api', () => ({ rbacApi: { login: vi.fn() }, useAuth: () => ({ setAuth }) }));
vi.mock('../components/LoginBackground', () => ({ LoginBackground: () => null }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('localized login failures', () => {
  it.each([
    ['zh-CN', 'Login failed', '登录失败，请重试'],
    ['zh-TW', 'LOGIN FAILED', '登入失敗，請重試'],
    ['en-US', ' login failed ', 'Sign-in failed. Please try again.'],
    ['ja-JP', '', 'ログインに失敗しました。もう一度お試しください。'],
  ])('translates generic login errors in %s', async (locale, message, expected) => {
    await i18n.changeLanguage(locale);
    vi.mocked(rbacApi.login).mockRejectedValue(new Error(message));
    render(<ThemeProvider theme={createTheme()}>
      <I18nextProvider i18n={i18n}><MemoryRouter><Login /></MemoryRouter></I18nextProvider>
    </ThemeProvider>);
    fireEvent.change(screen.getByLabelText(i18n.t('login.fields.username')), { target: { value: 'test-user' } });
    fireEvent.change(screen.getByLabelText(i18n.t('login.fields.password')), { target: { value: 'test-password' } });
    fireEvent.submit(screen.getByRole('button', { name: i18n.t('login.buttons.login') }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toBe(expected);
    expect(setAuth).not.toHaveBeenCalled();
  });
});

describe('login verification back button', () => {
  it.each([
    { locale: 'zh-CN', label: '返回', mode: 'dark' as const },
    { locale: 'zh-TW', label: '返回', mode: 'light' as const },
    { locale: 'en-US', label: 'Back', mode: 'dark' as const },
    { locale: 'ja-JP', label: '戻る', mode: 'light' as const },
  ])('translates and returns to password login in $locale / $mode', async ({ locale, label, mode }) => {
    await i18n.changeLanguage(locale);
    vi.mocked(rbacApi.login).mockResolvedValue({
      token: '', totpRequired: true,
      user: { id: 'test-user', username: 'test-user', email: '', fullName: '', roles: [], isActive: true, isSuperAdmin: false, totpEnabled: true, createdAt: '', updatedAt: '' },
    });
    render(<ThemeProvider theme={createTheme({ palette: { mode } })}>
      <I18nextProvider i18n={i18n}><MemoryRouter><Login /></MemoryRouter></I18nextProvider>
    </ThemeProvider>);
    const username = screen.getByLabelText(i18n.t('login.fields.username'));
    const password = screen.getByLabelText(i18n.t('login.fields.password'));
    fireEvent.change(username, { target: { value: 'test-user' } });
    fireEvent.change(password, { target: { value: 'test-password' } });
    const form = screen.getByRole('button', { name: i18n.t('login.buttons.login') }).closest('form')!;
    fireEvent.submit(form);
    const back = await screen.findByRole('button', { name: label });
    expect(screen.queryByText('common.back')).toBeNull();
    expect(getComputedStyle(back).color).toBe(mode === 'dark' ? 'rgb(200, 210, 230)' : 'rgb(70, 100, 140)');
    expect(getComputedStyle(back).borderTopStyle).toBe('solid');
    fireEvent.change(screen.getByLabelText(i18n.t('login.fields.totpCode')), { target: { value: '123456' } });
    fireEvent.click(back);
    expect(screen.queryByLabelText(i18n.t('login.fields.totpCode'))).toBeNull();
    expect(rbacApi.login).toHaveBeenCalledTimes(1);
    expect((username as HTMLInputElement).value).toBe('test-user');
    expect((password as HTMLInputElement).value).toBe('test-password');
    expect(setAuth).not.toHaveBeenCalled();
    fireEvent.submit(form);
    await screen.findByRole('button', { name: label });
    expect((screen.getByLabelText(i18n.t('login.fields.totpCode')) as HTMLInputElement).value).toBe('');
    await waitFor(() => expect(rbacApi.login).toHaveBeenLastCalledWith('test-user', 'test-password', undefined));
  });
});
