import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  getCustomerProfile,
  createTestProposal,
  acceptTestProposal,
  completeAndPayService,
  API_BASE_URL,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 15: Cancelamento de Chamado na UI e Filtros em Meus Serviços', () => {
  test('deve cancelar um chamado pela tela de acompanhamento e filtrar abas em Meus Serviços', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();
    await injectAuth(page, customer);

    const customerProfile = await getCustomerProfile(customer);

    // 1. Cria três chamados: um que continuará em andamento, um que será cancelado pela UI e outro que será concluído
    await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Instalação de Tomada 220V',
      description: 'Nova tomada para forno elétrico.',
    });

    const callToCancel = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Manutenção de Portão',
      description: 'Portão eletrônico travando no trilho.',
    });

    const callToComplete = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: 'Limpeza de Caixa DÁgua',
      description: 'Higienização anual completa de reservatório.',
    });

    // Conclui e paga o terceiro chamado via helper para testar os filtros de abas
    const proposal = await createTestProposal(provider, callToComplete.id, {
      laborPrice: 150.0,
      materialsPrice: 0.0,
      proposedPrice: 150.0,
    });
    await acceptTestProposal(customer, proposal.id);
    await completeAndPayService(
      callToComplete.id,
      provider.tokens.accessToken,
      customer.tokens.accessToken,
      150.0
    );

    // Auto-aceita window.confirm no cancelamento
    page.on('dialog', (dialog) => dialog.accept());

    // 2. Abre o chamado de portão no acompanhamento e clica em "Cancelar Chamado" pela UI
    await page.goto(`/client/tracking/${callToCancel.id}`);
    await expect(page.getByText('Acompanhar chamado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Portão eletrônico travando no trilho.')).toBeVisible();

    const cancelBtn = page.getByText('Cancelar Chamado', { exact: true });
    await expect(cancelBtn).toBeVisible();

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes(`/api/Services/${callToCancel.id}/status`) && resp.status() === 200,
        { timeout: 15000 }
      ),
      cancelBtn.click(),
    ]);

    // Confere na API que o status mudou para cancelled
    const checkStatusRes = await fetch(`${API_BASE_URL}/api/Services/${callToCancel.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const checkStatusData = await checkStatusRes.json();
    expect(checkStatusData.status.toLowerCase()).toBe('cancelled');

    // 3. Acessa a tela "Meus serviços" (/client/services) e valida a separação por abas:
    // "Em andamento", "Concluídos" e "Cancelados"
    await page.goto('/client/services');
    await expect(page.getByText('Meus serviços')).toBeVisible({ timeout: 15000 });

    // Na aba inicial ("Em andamento"), apenas o chamado aberto ("Instalação de Tomada 220V") deve estar visível
    await expect(page.getByText('Instalação de Tomada 220V')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Manutenção de Portão')).not.toBeVisible();
    await expect(page.getByText('Limpeza de Caixa DÁgua')).not.toBeVisible();

    // Na aba "Concluídos", apenas o serviço concluído ("Limpeza de Caixa DÁgua") deve aparecer
    await page.getByText('Concluídos', { exact: true }).click();
    await expect(page.getByText('Limpeza de Caixa DÁgua')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Manutenção de Portão')).not.toBeVisible();
    await expect(page.getByText('Instalação de Tomada 220V')).not.toBeVisible();

    // Na aba "Cancelados", apenas o serviço cancelado ("Manutenção de Portão") deve aparecer
    await page.getByText('Cancelados', { exact: true }).click();
    await expect(page.getByText('Manutenção de Portão')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Limpeza de Caixa DÁgua')).not.toBeVisible();
    await expect(page.getByText('Instalação de Tomada 220V')).not.toBeVisible();
  });
});
