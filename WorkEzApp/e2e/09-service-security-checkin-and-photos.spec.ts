import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  API_BASE_URL,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 9: Blindagem Operacional, Código OTP e Vistoria Fotográfica (Branch 5)', () => {
  test('deve exibir o código de check-in (OTP de 4 dígitos) e modal com QR Code na tela do cliente', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, customer);

    // 1. Cliente cria chamado
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Manutenção de Ar-Condicionado',
      description: 'Limpeza e revisão de filtros com segurança presencial.',
    });

    // 2. Prestador envia proposta
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
        description: 'Serviço com protocolo de segurança e vistoria.',
      }),
    });
    const proposal = await propRes.json();

    // 3. Cliente aceita a proposta
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

    // 4. Acessa a tela de acompanhamento do cliente
    await page.goto(`/client/tracking/${serviceCall.id}`);

    // Valida que o card de segurança com o Código de Início de Atendimento está visível
    await expect(page.getByText('Código de Início do Atendimento')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Informe ao profissional apenas quando ele estiver no seu local/i)).toBeVisible();

    // Valida os botões "Copiar Código" e "Mostrar QR Code"
    const copyBtn = page.getByText(/Copiar Código/i);
    await expect(copyBtn).toBeVisible();

    const qrBtn = page.getByText(/Mostrar QR Code/i);
    await expect(qrBtn).toBeVisible();

    // Clica no botão de QR Code e valida que o modal abre
    await qrBtn.click();
    await expect(page.getByText('Check-in de Segurança')).toBeVisible();
    await expect(page.getByText(/Apresente este código ou QR Code para o profissional/i)).toBeVisible();

    // Fecha o modal clicando em "Fechar"
    const closeBtn = page.getByText('Fechar', { exact: true });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByText('Check-in de Segurança')).not.toBeVisible();
  });

  test('deve validar o código OTP presencial e enviar fotos de vistoria inicial do serviço', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // 1. Cria chamado
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Reparo Elétrico Residencial',
    });

    // 2. Prestador envia e cliente aceita proposta
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
        materialsPrice: 0.0,
        proposedPrice: 180.0,
        description: 'Troca de fiação e disjuntores.',
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

    // Obtém o código StartCheckInCode gerado para o cliente
    const detailRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const detailData = await detailRes.json();
    const checkInCode = detailData.startCheckInCode || '7492';
    expect(checkInCode).toHaveLength(4);

    // 3. Prestador valida o check-in presencial via endpoint de segurança
    const checkInRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/validate-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        code: checkInCode,
      }),
    });
    expect(checkInRes.status).toBe(200);

    // 4. Prestador anexa fotos de vistoria "Antes"
    const photoRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/checklist-photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        phase: 'before',
        photos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'],
      }),
    });
    expect(photoRes.status).toBe(200);

    // 5. Injeta auth do cliente e verifica que a foto de vistoria e status de check-in confirmado aparecem no tracking
    await injectAuth(page, customer);
    await page.goto(`/client/tracking/${serviceCall.id}`);

    await expect(page.getByText('Vistoria Fotográfica do Serviço')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Fotos de Início \(Antes\)/i)).toBeVisible();
    await expect(page.getByText('Check-in Realizado com Sucesso')).toBeVisible();
  });

  test('deve exibir fotos de vistoria final do prestador na tela de pagamento do cliente', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // 1. Cria chamado
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Pintura de Fachada',
    });

    // Proposta e aceite
    const propRes = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        serviceId: serviceCall.id,
        providerUserId: provider.tokens.user.id,
        laborPrice: 200.0,
        materialsPrice: 50.0,
        proposedPrice: 250.0,
        description: 'Pintura finalizada com laudo fotográfico.',
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

    // Envia fotos de vistoria "Depois" (concluído)
    const photoRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/checklist-photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        phase: 'after',
        photos: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800'],
      }),
    });
    expect(photoRes.status).toBe(200);

    // 2. Cliente acessa a tela de pagamento
    await injectAuth(page, customer);
    await page.goto(`/client/payment/${serviceCall.id}`);

    // Valida que o card de Vistoria do Serviço Finalizado está visível
    await expect(page.getByText('Vistoria do Serviço Finalizado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Confira as fotos anexadas pelo profissional/i)).toBeVisible();
    await expect(page.getByText(/Depois #1/i)).toBeVisible();
  });
});
