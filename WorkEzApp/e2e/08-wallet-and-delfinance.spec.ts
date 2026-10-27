import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  getCustomerProfile,
  createTestProposal,
  acceptTestProposal,
  API_BASE_URL,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 8: Carteira Digital, Custódia (Escrow), Comissão Justa e Saque PIX (Delfinance)', () => {
  test('deve creditar valor com comissão justa sobre mão de obra, liberar custódia após pagamento e realizar saque PIX com comprovante', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // 1. Cria chamado de serviço
    const customerProfile = await getCustomerProfile(customer);
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    // 2. Prestador envia proposta detalhada com Mão de Obra e Peças/Materiais
    // Valor total: R$ 250 (Mão de Obra: R$ 150 | Materiais: R$ 100)
    // Taxa da plataforma WorkEz: 15% apenas sobre mão de obra (15% de 150 = R$ 22,50). Materiais isentos (0%).
    // Valor líquido que o prestador deve receber: 250 - 22,50 = R$ 227,50
    const proposal = await createTestProposal(provider, serviceCall.id, {
      laborPrice: 150.0,
      materialsPrice: 100.0,
      proposedPrice: 250.0,
      description: 'Instalação com peças inclusas.',
    });
    expect(proposal.id).toBeTruthy();

    // 3. Cliente aceita proposta -> Gera retenção em Custódia (EscrowHold)
    await acceptTestProposal(customer, proposal.id);

    // Verifica que a custódia está ativa via API
    const summaryHoldRes = await fetch(`${API_BASE_URL}/api/Wallet/summary/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    const summaryHold = await summaryHoldRes.json();
    expect(summaryHold.escrowBalance).toBe(227.5);
    expect(summaryHold.availableBalance).toBe(0);

    // 4. Prestador avança e conclui o serviço -> Vai para WaitingPayment (custódia permanece retida até o pagamento)
    await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/start-displacement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });

    await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });

    const completeRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({ price: 250.0 }),
    });
    expect(completeRes.ok).toBeTruthy();

    // 5. Cliente confirma pagamento -> Liberação da Custódia (EscrowRelease)
    const confirmPayRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
    });
    expect(confirmPayRes.ok).toBeTruthy();

    // Verifica que o saldo foi liberado via API
    const summaryReleaseRes = await fetch(`${API_BASE_URL}/api/Wallet/summary/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    const summaryRelease = await summaryReleaseRes.json();
    expect(summaryRelease.availableBalance).toBe(227.5);
    expect(summaryRelease.escrowBalance).toBe(0);
    expect(summaryRelease.lastCommission?.materialsAmount).toBe(100);
    expect(summaryRelease.lastCommission?.platformFeeAmount).toBe(22.5);

    // 6. Injeta sessão do prestador no navegador e abre a tela de Carteira
    await injectAuth(page, provider);
    await page.goto('/provider/wallet');

    // Valida elementos principais da UI
    await expect(page.getByText('Minha Carteira')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Saldo Disponível')).toBeVisible();
    await expect(page.getByText('227,50').first()).toBeVisible();
    await expect(page.getByText('Comissão Justa WorkEz')).toBeVisible();

    // 7. Realiza Saque via PIX na interface
    const withdrawBtn = page.getByText('Transferir via PIX').first();
    await expect(withdrawBtn).toBeVisible();
    await withdrawBtn.click();

    // Modal de transferência aberto
    await expect(page.getByText('Transferência via PIX')).toBeVisible();

    // Digita valor de saque de R$ 100,00
    const inputAmount = page.getByPlaceholder('0,00');
    await inputAmount.fill('100');

    // Clica em confirmar saque
    const confirmBtn = page.getByText('Confirmar Saque PIX');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 8. Valida que o Comprovante Oficial apareceu
    await expect(page.getByText('COMPROVANTE DE TRANSAÇÃO')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Transação Liquidada')).toBeVisible();
    await expect(page.getByText('100,00').first()).toBeVisible();

    // Fecha o comprovante
    const closeReceiptBtn = page.getByText('Fechar');
    await closeReceiptBtn.click();

    // Valida que o saldo disponível na tela foi atualizado para R$ 127,50 (227,50 - 100,00)
    await expect(page.getByText('127,50').first()).toBeVisible({ timeout: 10000 });
  });

  test('deve acessar a tela de pagamento do cliente com DelFinance BaaS e exibir cobrança PIX dinâmica', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    const customerProfile = await getCustomerProfile(customer);
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const proposal = await createTestProposal(provider, serviceCall.id, {
      laborPrice: 150.0,
      materialsPrice: 50.0,
      proposedPrice: 200.0,
      description: 'Serviço com materiais.',
    });

    await acceptTestProposal(customer, proposal.id);

    // Injeta sessão do cliente e navega para /client/payment/[id]
    await injectAuth(page, customer);
    await page.goto(`/client/payment/${serviceCall.id}`);

    // Valida os elementos da tela de pagamento DelFinance BaaS
    await expect(page.getByText('Pagamento via PIX')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Processado por DelFinance BaaS')).toBeVisible();
    await expect(page.getByText('Mão de Obra')).toBeVisible();
    await expect(page.getByText('Peças e Materiais')).toBeVisible();
    await expect(page.getByText('PIX Copia e Cola', { exact: true })).toBeVisible();
    await expect(page.getByText('Copiar Código PIX')).toBeVisible();
    await expect(page.getByText('Garantia e Custódia WorkEz')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByText('Copiar Código PIX').click();
  });
});
