import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, injectAuth } from './helpers/test-api';

test.describe('Fluxo 14: Proteção de Rotas (Role Guards), Edição de Perfil, Pagamentos e Ajuda', () => {
  test('deve redirecionar usuário não autenticado tentando acessar rotas privadas para /login', async ({ page }) => {
    await page.goto('/client');
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible();
  });

  test('deve impedir que Cliente acesse rotas de Prestador (/provider) e vice-versa', async ({ page }) => {
    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    // Cliente tentando acessar /provider deve ser redirecionado para /client
    await page.goto('/provider');
    await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
    await expect(page.getByText('Categorias de Serviço')).toBeVisible();
  });

  test('deve impedir que Prestador acesse rotas de Cliente (/client)', async ({ page }) => {
    const provider = await createTestProvider();
    await injectAuth(page, provider);

    // Prestador tentando acessar /client deve ser redirecionado para /provider
    await page.goto('/client');
    await expect(page).toHaveURL(/.*\/provider/, { timeout: 15000 });
    await expect(page.getByText('Ganhos do mês')).toBeVisible({ timeout: 15000 });
  });

  test('deve editar dados pessoais do cliente, acessar Formas de Pagamento, Central de Ajuda e realizar Logout', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    page.on('dialog', (dialog) => dialog.accept());

    // 1. Acessa tela de Edição de Perfil (/client/edit-profile)
    await page.goto('/client/edit-profile');
    await expect(page.getByText('Dados pessoais')).toBeVisible({ timeout: 15000 });

    const nameInput = page.getByPlaceholder('Seu nome completo');
    await expect(nameInput).toBeVisible();
    const updatedName = `${customer.tokens.user.name} Editado`;
    await nameInput.fill(updatedName);

    const saveBtn = page.getByText('Salvar Alterações');
    await expect(saveBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/Users/profile') && resp.status() === 200, {
        timeout: 15000,
      }),
      saveBtn.click(),
    ]);

    // 2. Navega para Formas de Pagamento (/client/payment-methods)
    await page.goto('/client/payment-methods');
    await expect(page.getByText('Formas de pagamento')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Pagamento 100% Seguro')).toBeVisible();
    await expect(page.getByText('PIX instantâneo')).toBeVisible();
    await expect(page.getByText(/BaaS Oficial DelFinance/i)).toBeVisible();

    // 3. Navega para Ajuda e Suporte (/help)
    await page.goto('/help');
    await expect(page.getByText('Ajuda e suporte')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Como podemos ajudar?')).toBeVisible();
    await expect(page.getByText('Perguntas frequentes')).toBeVisible();
    await expect(page.getByText('Como funciona o pagamento?')).toBeVisible();

    // 4. Acessa o Perfil (/client/profile), valida dados, ausência de formas de pagamento e presença de Meus Endereços
    await page.goto('/client/profile');
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 15000 });

    // Valida que "Meus endereços" está disponível no menu do perfil
    await expect(page.getByText('Meus endereços')).toBeVisible();

    // Valida que "Formas de pagamento" foi removida da conta do usuário conforme regra de negócio
    await expect(page.getByText('Formas de pagamento')).not.toBeVisible();

    const logoutBtn = page.getByText('Sair', { exact: true });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Confere que o token foi limpo do localStorage após clicar em Sair
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('@workez_access_token')))
      .toBeNull();
  });
});
