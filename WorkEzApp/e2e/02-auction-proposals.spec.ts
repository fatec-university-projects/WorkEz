import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, createTestServiceCall, API_BASE_URL, injectAuth } from './helpers/test-api';

test.describe('Fluxo 2: Sistema de Leilão, Decomposição e Contraproposta', () => {
  test('deve criar chamado no leilão e processar proposta com mão de obra e materiais', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Cria cliente e prestador no backend
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // Injeta autenticação do cliente na sessão do navegador
    await injectAuth(page, customer);

    // Obtém perfil do cliente para ter o customerId
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();

    // 2. Cliente cria o chamado aberto no leilão
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);
    expect(serviceCall.id).toBeDefined();

    // Obtém providerId
    const providerProfileRes = await fetch(`${API_BASE_URL}/api/ServiceProviders/by-user/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    const providerProfile = await providerProfileRes.json();

    // 3. Prestador envia proposta com Mão de Obra (R$ 150) e Materiais (R$ 50)
    const proposeRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        laborPrice: 150.0,
        materialsPrice: 50.0,
        proposedPrice: 200.0,
        description: 'Faço a troca completa do encanamento e forneço os canos PVC.',
        estimatedTime: '2 horas',
      }),
    });

    expect(proposeRes.ok).toBeTruthy();
    const proposal = await proposeRes.json();
    expect(proposal.laborPrice).toBe(150.0);
    expect(proposal.materialsPrice).toBe(50.0);
    expect(proposal.proposedPrice).toBe(200.0);

    // 4. Cliente abre a tela de rastreamento do leilão (/client/tracking/[id])
    await page.goto(`/client/tracking/${serviceCall.id}`);

    // Valida exibição dos dados da proposta no leilão
    await expect(page.getByText('Leilão de Propostas')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('R$ 200,00')).toBeVisible();
    await expect(page.getByText(/Mão de obra: R\$ 150,00/i)).toBeVisible();
    await expect(page.getByText(/Materiais: R\$ 50,00/i)).toBeVisible();

    // 5. Cliente faz Contraproposta pelo modal
    const counterBtn = page.getByText('Contra-proposta', { exact: true });
    await expect(counterBtn).toBeVisible({ timeout: 15000 });
    await counterBtn.click();

    // Preenche novo valor e justificativa
    await page.getByPlaceholder('Ex: 180,00').fill('180');
    const descInput = page.getByPlaceholder(/Podemos fechar por esse valor/i);
    if (await descInput.isVisible()) {
      await descInput.fill('Consigo pagar 180 no PIX imediato');
    }

    await page.getByText('Enviar Contra-proposta', { exact: true }).click();

    // Valida que a proposta atualizou para status de contraproposta enviada
    await expect(page.getByText(/Sua contra-proposta/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('R$ 180,00')).toBeVisible();

    // 6. Prestador aceita a contraproposta via API
    const acceptCounterRes = await fetch(`${API_BASE_URL}/api/Proposals/${proposal.id}/accept-counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        providerUserId: provider.tokens.user.id,
      }),
    });

    expect(acceptCounterRes.ok).toBeTruthy();

    // Recarrega navegando para a tela
    await page.goto(`/client/tracking/${serviceCall.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Proposta aceita! Agendamento gerado.')).toBeVisible({ timeout: 15000 });
  });
});
