import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, injectAuth } from './helpers/test-api';

test.describe('Fluxo 12: Temas Claro, Escuro e Sistema + Persistência', () => {
  test('deve iniciar no tema Claro por padrão e alternar entre Claro, Escuro e Sistema com persistência', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    // 1. Acessa a Home do cliente sem preferência prévia -> Padrão deve ser Claro (light)
    await page.goto('/client');
    await expect(page.getByText('Categorias de Serviço')).toBeVisible({ timeout: 15000 });

    const initialHasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(initialHasDarkClass).toBe(false);

    // 2. Clica no botão de alternância rápida de tema no cabeçalho da Home
    const quickThemeBtn = page.getByLabel('Mudar para modo escuro').first();
    await expect(quickThemeBtn).toBeVisible();
    await quickThemeBtn.click();

    // Verifica que ativou o modo Escuro no DOM e no localStorage
    await expect
      .poll(async () => {
        return await page.evaluate(() => ({
          isDark: document.documentElement.classList.contains('dark'),
          stored: window.localStorage.getItem('@workez_theme_mode'),
        }));
      })
      .toEqual({ isDark: true, stored: 'dark' });

    // 3. Acessa a tela de Perfil do Cliente (/client/profile) e valida o seletor de Aparência
    await page.goto('/client/profile');
    await expect(page.getByText('Aparência do aplicativo')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Claro', { exact: true })).toBeVisible();
    await expect(page.getByText('Escuro', { exact: true })).toBeVisible();
    await expect(page.getByText('Sistema', { exact: true })).toBeVisible();

    // Recarrega a página e garante que o tema Escuro persistiu
    await page.reload();
    await expect(page.getByText('Aparência do aplicativo')).toBeVisible({ timeout: 15000 });
    const persistedDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(persistedDark).toBe(true);

    // 4. Muda para o tema Claro pelo seletor do Perfil
    await page.getByText('Claro', { exact: true }).click();
    await expect
      .poll(async () => {
        return await page.evaluate(() => ({
          isDark: document.documentElement.classList.contains('dark'),
          stored: window.localStorage.getItem('@workez_theme_mode'),
        }));
      })
      .toEqual({ isDark: false, stored: 'light' });

    // 5. Muda para o modo Sistema pelo seletor do Perfil
    await page.getByText('Sistema', { exact: true }).click();
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('@workez_theme_mode')))
      .toBe('system');
  });

  test('deve permitir alternar tema também no Perfil do Prestador (/provider/profile)', async ({ page }) => {
    const provider = await createTestProvider();
    await injectAuth(page, provider);

    await page.goto('/provider/profile');
    await expect(page.getByText('Aparência do aplicativo')).toBeVisible({ timeout: 15000 });

    await page.getByText('Escuro', { exact: true }).click();
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.classList.contains('dark'))
      )
      .toBe(true);
  });
});
