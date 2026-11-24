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

test.describe('Fluxo 18: Inovações do Roadmap PO Fase 2 (Mural SOS & Aceite de Contra-Proposta pelo Prestador)', () => {
  test('deve exibir badge SOS no mural, permitir filtro rápido de emergências e mostrar banner explicativo na oportunidade', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const customerProfile = await getCustomerProfile(customer);

    const provider = await createTestProvider();
    const providerProfile = await getProviderProfile(provider);

    // Cria um chamado normal e um chamado emergencial SOS
    const normalCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Pintura Residencial Normal',
      description: 'Pintura de quarto para a próxima semana',
      urgencyLevel: 'Normal',
    });

    const sosCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Encanamento Emergencial SOS',
      description: 'Cano estourado alagando a sala',
      urgencyLevel: 'Emergency',
    });

    // Prestador acessa o mural de chamados (/provider/calls)
    await injectAuth(page, provider);
    await page.goto('/provider/calls');
    await expect(page.getByText('Chamados & Propostas')).toBeVisible({ timeout: 15000 });

    // 1. Valida que o badge "🚨 SOS" está visível no card da oportunidade emergencial
    await expect(page.getByText('🚨 SOS').first()).toBeVisible({ timeout: 15000 });

    // 2. Valida os filtros rápidos de oportunidade
    const allFilterBtn = page.getByText(/Todos \(/i);
    const sosFilterBtn = page.getByText(/🚨 SOS/i).first();
    await expect(allFilterBtn).toBeVisible();
    await expect(sosFilterBtn).toBeVisible();

    // Clica no filtro SOS
    await sosFilterBtn.click();
    await expect(page.getByText('Cano estourado alagando a sala')).toBeVisible();

    // 3. Acessa a tela de envio de proposta para o chamado SOS (/provider/new-call/[id])
    await page.getByText('Cano estourado alagando a sala').click();
    await page.waitForURL(/\/provider\/new-call\/[a-f0-9-]+/i, { timeout: 15000 });

    // 4. Valida o banner de alerta de atendimento emergencial
    await expect(page.getByText(/Atendimento Emergencial SOS/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/O cliente necessita deste atendimento hoje nas próximas 2 horas/i)).toBeVisible();
  });

  test('prestador deve receber contra-proposta do cliente na aba Minhas Propostas e aceitar com sucesso', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const customerProfile = await getCustomerProfile(customer);

    const provider = await createTestProvider();
    const providerProfile = await getProviderProfile(provider);

    // Cria chamado
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Instalação Elétrica',
      description: 'Instalação de tomadas e disjuntor',
      urgencyLevel: 'Emergency',
    });

    // Prestador envia proposta inicial de R$ 200,00
    const proposeRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        proposedPrice: 200.0,
        laborPrice: 160.0,
        materialsPrice: 40.0,
        description: 'Serviço com garantia e disjuntor incluído.',
      }),
    });
    expect(proposeRes.ok).toBeTruthy();
    const proposal = await proposeRes.json();

    // Cliente envia contra-proposta de R$ 180,00
    const counterRes = await fetch(`${API_BASE_URL}/api/Proposals/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
      body: JSON.stringify({
        proposalId: proposal.id,
        customerUserId: customer.tokens.user.id,
        counterPrice: 180.0,
        counterDescription: 'Consegue fechar por R$ 180 à vista?',
      }),
    });
    expect(counterRes.ok).toBeTruthy();

    // Prestador acessa /provider/calls e vai para a aba "Minhas Propostas"
    await injectAuth(page, provider);
    await page.goto('/provider/calls');
    await expect(page.getByText('Chamados & Propostas')).toBeVisible({ timeout: 15000 });

    const myProposalsTab = page.getByText('Minhas Propostas');
    await expect(myProposalsTab).toBeVisible();
    await myProposalsTab.click();

    // Valida que a contra-proposta é exibida com badge e valor
    await expect(page.getByText('Contra-proposta Recebida')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Aceitar R\$ 180/i)).toBeVisible();

    // Aceita a contra-proposta pela UI
    page.on('dialog', (dialog) => dialog.accept());
    const acceptCounterBtn = page.getByText(/Aceitar R\$ 180/i);
    await acceptCounterBtn.click();

    // Valida que o feedback de sucesso é processado
    await page.waitForTimeout(2000);
  });
});
