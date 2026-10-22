import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, createTestServiceCall, API_BASE_URL, injectAuth } from './helpers/test-api';

test.describe('Fluxo 5: Tela de Profissional Encontrado (found.tsx) Dinâmica', () => {
  test('deve carregar dados reais do profissional sem dados mockados', async ({ page }) => {
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // Injeta autenticação na sessão do navegador
    await injectAuth(page, customer);

    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const providerProfileRes = await fetch(`${API_BASE_URL}/api/ServiceProviders/by-user/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    const providerProfile = await providerProfileRes.json();

    // Prestador envia proposta e cliente aceita
    const propRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        laborPrice: 180.0,
        materialsPrice: 20.0,
        proposedPrice: 200.0,
        description: 'Reparo profissional completo.',
      }),
    });
    const proposal = await propRes.json();

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

    // Abre a tela /client/found com o ID do serviço e do prestador
    await page.goto(`/client/found?id=${serviceCall.id}&providerId=${providerProfile.id}`);

    // Valida que o nome real do prestador aparece (e NÃO "Carlos Silva")
    await expect(page.getByText('Profissional encontrado!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`${provider.tokens.user.name} aceitou seu chamado`)).toBeVisible();
    await expect(page.getByText(provider.tokens.user.name, { exact: true })).toBeVisible();

    // Valida os botões de ação dinâmica
    await expect(page.getByRole('button', { name: /Ver perfil completo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Abrir chat/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Acompanhar chamado/i })).toBeVisible();
  });
});
