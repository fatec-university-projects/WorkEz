import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, createTestServiceCall, API_BASE_URL, injectAuth } from './helpers/test-api';

test.describe('Fluxo 6: Navegação para o Perfil do Prestador via Chat e Acompanhamento', () => {
  test('deve acessar o perfil do prestador a partir do Chat do Cliente', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, customer);

    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`);
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const propRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        laborPrice: 100.0,
        materialsPrice: 50.0,
        proposedPrice: 150.0,
        description: 'Proposta para verificação de perfil.',
        estimatedTime: '1 hora',
      }),
    });
    const proposal = await propRes.json();

    // 1. Acessa o chat
    await page.goto(`/client/chat/${proposal.id}`);
    await expect(page.getByText('Ver perfil ›')).toBeVisible({ timeout: 15000 });

    // 2. Clica no perfil do prestador no cabeçalho do chat
    await page.getByText('Ver perfil ›').click();

    // 3. Valida que navegou para o perfil do prestador
    await expect(page.getByText('Perfil do profissional')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(provider.tokens.user.name)).toBeVisible();
    await expect(page.getByText(/Garantia da plataforma/i)).toBeVisible();
  });

  test('deve acessar o perfil do prestador a partir do Acompanhamento de Serviço (Leilão e Confirmado)', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, customer);

    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`);
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const propRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        laborPrice: 120.0,
        materialsPrice: 30.0,
        proposedPrice: 150.0,
        description: 'Proposta para teste de rastreamento.',
        estimatedTime: '2 horas',
      }),
    });
    const proposal = await propRes.json();

    // 1. Acessa o acompanhamento com proposta em leilão
    await page.goto(`/client/tracking/${serviceCall.id}`);
    await expect(page.getByText('Leilão de Propostas em Andamento')).toBeVisible({ timeout: 15000 });

    // Clica no botão "Perfil" do card da proposta
    const profileBtn = page.getByText('Perfil', { exact: true });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Valida abertura do perfil
    await expect(page.getByText('Perfil do profissional')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(provider.tokens.user.name)).toBeVisible();

    // 2. Retorna ao chamado pelo cabeçalho
    const backBtn = page.getByLabel('Voltar');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // 3. Aceita a proposta para testar prestador confirmado
    await page.waitForTimeout(1000);
    await fetch(`${API_BASE_URL}/api/Proposals/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
      body: JSON.stringify({
        proposalId: proposal.id,
        customerUserId: customer.tokens.user.id,
      }),
    });

    // Recarrega o acompanhamento
    await page.goto(`/client/tracking/${serviceCall.id}`);
    await expect(page.getByText('Proposta aceita! Agendamento gerado.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Profissional Verificado')).toBeVisible();

    // Clica em "Ver Perfil" no card de prestador confirmado
    const viewProfileBtn = page.getByText('Ver Perfil', { exact: true });
    await expect(viewProfileBtn).toBeVisible();
    await viewProfileBtn.click();

    // Valida que o perfil abriu novamente com sucesso
    await expect(page.getByText('Perfil do profissional')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(provider.tokens.user.name)).toBeVisible();
  });
});
