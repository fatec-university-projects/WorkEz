import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, createTestServiceCall, API_BASE_URL, injectAuth } from './helpers/test-api';

test.describe('Fluxo 3: Chat em Tempo Real e Negociação Integrada', () => {
  test('deve trocar mensagens no chat e exibir banner da proposta', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // Injeta autenticação na sessão do navegador
    await injectAuth(page, customer);

    // Obtém perfis
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const providerProfileRes = await fetch(`${API_BASE_URL}/api/ServiceProviders/by-user/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    const providerProfile = await providerProfileRes.json();

    // Envia proposta
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
        description: 'Faço o reparo hoje à tarde.',
        estimatedTime: '1 hora',
      }),
    });
    const proposal = await propRes.json();

    // Abre a tela de chat pelo cliente
    await page.goto(`/client/chat/${proposal.id}`);

    // Valida banner da proposta ativa
    await expect(page.getByText(/Lance: R\$ 150,00/i)).toBeVisible({ timeout: 15000 });

    // Digita mensagem e envia
    const inputMsg = page.getByPlaceholder('Digite sua mensagem...');
    await expect(inputMsg).toBeVisible();
    await inputMsg.fill('Olá, você consegue vir às 15h?');
    await page.keyboard.press('Enter');

    // Valida que a mensagem aparece no balão de chat
    await expect(page.getByText('Olá, você consegue vir às 15h?')).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir status "Serviço concluído" no chat quando o chamado for finalizado', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, provider);

    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
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
        description: 'Faço o reparo hoje à tarde.',
      }),
    });
    const proposal = await propRes.json();

    // Aceita proposta
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

    // Conclui serviço
    const completeRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
    });
    expect(completeRes.ok).toBeTruthy();

    // Prestador abre a tela de chat
    await page.goto(`/provider/chat/${proposal.id}`);

    // Valida que o status do topo indica "Serviço concluído" e NÃO "Chamado em execução"
    await expect(page.getByText('Serviço concluído', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Chamado em execução')).not.toBeVisible();
    await expect(page.getByText(/Este chamado foi finalizado com sucesso/i)).toBeVisible();
  });
});
