import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider } from './helpers/test-api';

test.describe('Fluxo 1: Onboarding, Perfil e Autenticação', () => {
  test('deve navegar pelas telas de onboarding e chegar em escolha de perfil', async ({ page }) => {
    await page.goto('/onboarding');

    // Valida tela de onboarding e botão avançar
    await expect(page.getByText('Profissionais verificados')).toBeVisible({ timeout: 15000 });
    const continueBtn = page.getByRole('button', { name: 'Continuar' });
    await expect(continueBtn).toBeVisible();

    // Clica no botão Pular para ir direto à escolha de perfil
    const skipBtn = page.getByRole('button', { name: 'Pular' });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    } else {
      await continueBtn.click();
      await page.waitForTimeout(500);
      await continueBtn.click();
    }

    // Valida chegada na tela de profile-choice
    await expect(page.getByText('Como você quer usar o WorkEz?')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sou cliente')).toBeVisible();
    await expect(page.getByText('Sou prestador')).toBeVisible();
  });

  test('deve permitir login de cliente com credenciais reais', async ({ page }) => {
    // Cria credencial real na API
    const customer = await createTestCustomer();

    await page.goto('/login');
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible({ timeout: 15000 });

    // Preenche credenciais
    const emailInput = page.getByPlaceholder('Seu e-mail');
    await expect(emailInput).toBeVisible();
    await emailInput.click();
    await emailInput.fill(customer.email);
    await expect(emailInput).toHaveValue(customer.email);

    const passInput = page.getByPlaceholder('Sua senha');
    await passInput.click();
    await passInput.fill(customer.pass);
    await expect(passInput).toHaveValue(customer.pass);

    // Clica em Entrar
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Deve redirecionar para a área do cliente (/client)
    await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
    await expect(page.getByText('Categorias de Serviço')).toBeVisible();
  });

  test('deve permitir login de prestador com credenciais reais', async ({ page }) => {
    // Cria prestador real na API
    const provider = await createTestProvider();

    await page.goto('/login');
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible({ timeout: 15000 });

    const emailInput = page.getByPlaceholder('Seu e-mail');
    await expect(emailInput).toBeVisible();
    await emailInput.click();
    await emailInput.fill(provider.email);
    await expect(emailInput).toHaveValue(provider.email);

    const passInput = page.getByPlaceholder('Sua senha');
    await passInput.click();
    await passInput.fill(provider.pass);
    await expect(passInput).toHaveValue(provider.pass);

    await page.getByRole('button', { name: 'Entrar' }).click();

    // Deve redirecionar para a área do prestador (/provider)
    await expect(page).toHaveURL(/.*\/provider/, { timeout: 15000 });
    await expect(page.getByText('Aceite novos chamados para começar a crescer')).toBeVisible();
  });
});
