import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  getCustomerProfile,
  getProviderProfile,
  API_BASE_URL,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 19: Inovações do Roadmap PO Fase 3 (Analytics de Performance, Prontidão SOS e Negociação)', () => {
  test('prestador deve visualizar painel de performance, economia de taxa zero e prontidão operacional SOS na carteira', async ({ page }) => {
    test.setTimeout(90000);

    const provider = await createTestProvider();
    await getProviderProfile(provider);

    await injectAuth(page, provider);
    await page.goto('/provider/wallet');
    await expect(page.getByText('Minha Carteira')).toBeVisible({ timeout: 15000 });

    // 1. Valida o painel de Analytics de Performance & Competitividade
    await expect(page.getByText('Performance & Competitividade')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Taxa de Conversão')).toBeVisible();
    await expect(page.getByText('Economia Taxa 0%')).toBeVisible();
    await expect(page.getByText('Ticket Médio')).toBeVisible();

    // 2. Valida o Banner de Prontidão SOS
    await expect(page.getByText('Prontidão Operacional SOS')).toBeVisible();
    await expect(page.getByText('Habilitado')).toBeVisible();
    await expect(page.getByText(/Seu perfil está apto a receber chamados com selo 🚨 SOS/i)).toBeVisible();
  });

  test('ciclo completo de contra-proposta com feedback reativo no rastreamento e aceite pelo prestador', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const customerProfile = await getCustomerProfile(customer);

    const provider = await createTestProvider();
    const providerProfile = await getProviderProfile(provider);

    // 1. Cliente cria chamado com urgência SOS
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Reparo Crítico Disjuntor',
      description: 'Disjuntor geral desarmando a cada 10 minutos',
      urgencyLevel: 'Emergency',
    });

    // 2. Prestador envia proposta inicial de R$ 300,00 (R$ 220 mão de obra + R$ 80 materiais)
    const proposeRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        proposedPrice: 300.0,
        laborPrice: 220.0,
        materialsPrice: 80.0,
        description: 'Troca de disjuntor bipolar com peças incluídas.',
      }),
    });
    expect(proposeRes.ok).toBeTruthy();
    const proposal = await proposeRes.json();

    // 3. Cliente envia contra-proposta de R$ 260,00
    const counterRes = await fetch(`${API_BASE_URL}/api/Proposals/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
      body: JSON.stringify({
        proposalId: proposal.id,
        customerUserId: customer.tokens.user.id,
        counterPrice: 260.0,
        counterDescription: 'Pode fechar por R$ 260 à vista?',
      }),
    });
    expect(counterRes.ok).toBeTruthy();

    // 4. Prestador acessa /provider/calls na aba "Minhas Propostas" e aceita
    await injectAuth(page, provider);
    await page.goto('/provider/calls');
    await expect(page.getByText('Chamados & Propostas')).toBeVisible({ timeout: 15000 });

    const myProposalsTab = page.getByText('Minhas Propostas');
    await myProposalsTab.click();

    await expect(page.getByText('Contra-proposta Recebida')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Aceitar R\$ 260/i)).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByText(/Aceitar R\$ 260/i).click();

    // 5. Valida transição para a aba "Aceitos"
    await page.waitForTimeout(2000);
    const acceptedTab = page.getByText('Aceitos');
    await acceptedTab.click();
    await expect(page.getByText(/Reparo Crítico Disjuntor|Aceito/i).first()).toBeVisible({ timeout: 15000 });
  });
});
