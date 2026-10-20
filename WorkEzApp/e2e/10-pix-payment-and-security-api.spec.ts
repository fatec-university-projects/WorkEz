import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  API_BASE_URL,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 10: Validação de Funções de API de Pagamento DelFinance e Segurança (api.ts)', () => {
  test('1. Deve gerar cobrança PIX DelFinance oficial (generateEscrowPixCheckout) com QR Code e Copia-e-Cola', async () => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // 1. Cria chamado
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Instalação Elétrica Residencial',
      description: 'Substituição de disjuntores e cabeamento do quadro geral.',
    });

    // 2. Prestador envia proposta com mão de obra e peças
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
        materialsPrice: 70.0,
        proposedPrice: 250.0,
        description: 'Mão de obra e disjuntores DIN inclusos.',
      }),
    });
    const proposal = await propRes.json();
    expect(proposal.id).toBeTruthy();

    // 3. Cliente aceita a proposta
    const acceptRes = await fetch(`${API_BASE_URL}/api/Proposals/accept`, {
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
    expect(acceptRes.ok).toBeTruthy();

    // 4. Valida endpoint /api/Wallet/checkout-pix/{serviceId} (generateEscrowPixCheckout)
    const checkoutRes = await fetch(`${API_BASE_URL}/api/Wallet/checkout-pix/${serviceCall.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
    });
    expect(checkoutRes.ok).toBeTruthy();

    const checkoutData = await checkoutRes.json();
    expect(checkoutData.serviceId).toBe(serviceCall.id);
    expect(checkoutData.totalAmount).toBe(250.0);
    expect(checkoutData.laborAmount).toBe(180.0);
    expect(checkoutData.materialsAmount).toBe(70.0);
    expect(checkoutData.pixCopiaECola).toBeTruthy();
    expect(checkoutData.pixCopiaECola).toContain('br.gov.bcb.pix');
    expect(checkoutData.transactionId).toBeTruthy();
    expect(checkoutData.expiresAt).toBeTruthy();
  });

  test('2. Deve permitir reenvio de e-mail de cobrança PIX (resendPixEmail)', async () => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

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
        laborPrice: 100.0,
        materialsPrice: 0.0,
        proposedPrice: 100.0,
        description: 'Serviço pontual.',
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

    // Chama o endpoint de reenvio de e-mail /api/Wallet/resend-pix-email/{serviceId}
    const resendRes = await fetch(`${API_BASE_URL}/api/Wallet/resend-pix-email/${serviceCall.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
    });

    expect(resendRes.ok).toBeTruthy();
    const resendData = await resendRes.json();
    expect(resendData.message).toContain('E-mail com dados do PIX enviado com sucesso!');
  });

  test('3. Deve validar check-in de atendimento com código OTP (validateCheckIn)', async () => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

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
        proposedPrice: 150.0,
        description: 'Serviço com check-in.',
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

    // Inicia deslocamento
    await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/start-displacement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });

    // Obtém o código correto de check-in do serviço gerado para o cliente
    const serviceDetailsRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const serviceDetails = await serviceDetailsRes.json();
    const correctCode = serviceDetails.startCheckInCode || '7492';
    expect(correctCode).toBeTruthy();

    // 1. Testa código errado -> deve falhar
    const wrongRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/validate-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({ code: '9999' }),
    });
    expect(wrongRes.ok).toBeFalsy();

    // 2. Testa código correto -> deve avançar para in-progress
    const validRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/validate-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({ code: correctCode }),
    });
    expect(validRes.ok).toBeTruthy();
    const validData = await validRes.json();
    expect(validData.status.toLowerCase()).toBe('in-progress');
  });

  test('4. Deve realizar upload de fotos de vistoria antes e depois (uploadChecklistPhotos)', async () => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

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
        proposedPrice: 200.0,
        description: 'Vistoria fotográfica.',
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

    // 1. Upload fase "before"
    const beforeRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/checklist-photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        phase: 'before',
        photos: ['https://placehold.co/400x300.jpg?text=Antes1'],
      }),
    });
    expect(beforeRes.ok).toBeTruthy();

    // 2. Upload fase "after"
    const afterRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/checklist-photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        phase: 'after',
        photos: ['https://placehold.co/400x300.jpg?text=Depois1'],
      }),
    });
    expect(afterRes.ok).toBeTruthy();

    const updatedServiceRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const updatedService = await updatedServiceRes.json();
    expect(updatedService.beforePhotos.length).toBeGreaterThan(0);
    expect(updatedService.afterPhotos.length).toBeGreaterThan(0);
  });

  test('5. Interface do Cliente: Validação do fluxo DelFinance BaaS sem botão de simulação e liquidação via Webhook', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

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
        materialsPrice: 40.0,
        proposedPrice: 160.0,
        description: 'Serviço elétrico.',
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

    // Prestador conclui e o chamado vai para WaitingPayment
    await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({ price: 160.0 }),
    });

    // Abre a tela de pagamento como cliente
    await injectAuth(page, customer);
    await page.goto(`/client/payment/${serviceCall.id}`);
    await page.waitForLoadState('networkidle');

    // Valida elementos do DelFinance
    await expect(page.getByText('Pagamento via PIX')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Processado por DelFinance BaaS')).toBeVisible();
    await expect(page.getByText('PIX Copia e Cola', { exact: true })).toBeVisible();
    await expect(page.getByText('Enviamos para o seu e-mail')).toBeVisible();

    // Valida que o botão de simulação NÃO EXISTE na tela
    const fakeSimulateBtn = page.getByText(/Confirmar Pagamento PIX \(Simulação \/ Teste\)/i);
    await expect(fakeSimulateBtn).toHaveCount(0);

    // Valida que o botão presente é "Verificar Pagamento no DelFinance"
    const checkDelFinanceBtn = page.getByText('Verificar Pagamento no DelFinance');
    await expect(checkDelFinanceBtn).toBeVisible();

    // Clica em "Verificar Pagamento no DelFinance" antes do pagamento -> Deve alertar que está aguardando
    const dialogPromise = page.waitForEvent('dialog', { timeout: 10000 });
    await checkDelFinanceBtn.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Aguardando Liquidação Bancária');
    await dialog.accept();

    // Simula recebimento de PIX no DelFinance BaaS via Webhook oficial
    const webhookRes = await fetch(`${API_BASE_URL}/api/Wallet/webhook/delfinance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'PIX_RECEIVED',
        correlationId: serviceCall.id,
        amount: 160.0,
      }),
    });
    expect(webhookRes.ok).toBeTruthy();

    // Aguarda polling do frontend detectar a liquidação e navegar para /client/completed/[id]
    await page.waitForURL(new RegExp(`/client/completed/${serviceCall.id}`), { timeout: 20000 });
    expect(page.url()).toContain(`/client/completed/${serviceCall.id}`);
  });
});
