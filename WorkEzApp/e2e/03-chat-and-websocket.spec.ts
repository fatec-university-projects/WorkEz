import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  getCustomerProfile,
  createTestProposal,
  acceptTestProposal,
  completeAndPayService,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 3: Chat em Tempo Real e Negociação Integrada', () => {
  test('deve trocar mensagens no chat e exibir banner da proposta', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, customer);

    const customerProfile = await getCustomerProfile(customer);
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const proposal = await createTestProposal(provider, serviceCall.id, {
      laborPrice: 120.0,
      materialsPrice: 30.0,
      proposedPrice: 150.0,
      description: 'Faço o reparo hoje à tarde.',
      estimatedTime: '1 hora',
    });

    // Abre a tela de chat pelo cliente
    await page.goto(`/client/chat/${proposal.id}`);

    // Valida banner de negociação ativa e status da proposta
    await expect(page.getByText(/Chat de Negociação \/ Leilão/i)).toBeVisible({ timeout: 15000 });

    // Digita mensagem e envia
    const inputMsg = page.getByPlaceholder('Digite sua mensagem...');
    await expect(inputMsg).toBeVisible();
    await inputMsg.fill('Olá, você consegue vir às 15h?');
    await page.keyboard.press('Enter');

    // Valida que a mensagem aparece no balão de chat
    await expect(page.getByText('Olá, você consegue vir às 15h?')).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir status "Serviço concluído" no chat quando o chamado for finalizado e pago', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, provider);

    const customerProfile = await getCustomerProfile(customer);
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const proposal = await createTestProposal(provider, serviceCall.id, {
      laborPrice: 120.0,
      materialsPrice: 30.0,
      proposedPrice: 150.0,
      description: 'Faço o reparo hoje à tarde.',
    });

    await acceptTestProposal(customer, proposal.id);

    // Conclui a execução e confirma o pagamento para transitar para "completed"
    await completeAndPayService(
      serviceCall.id,
      provider.tokens.accessToken,
      customer.tokens.accessToken,
      150.0
    );

    // Prestador abre a tela de chat
    await page.goto(`/provider/chat/${proposal.id}`);

    // Valida que o status do topo indica "Serviço concluído" e NÃO "Chamado em execução"
    await expect(page.getByText('Serviço concluído', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Chamado em execução')).not.toBeVisible();
    await expect(page.getByText(/Este chamado foi finalizado com sucesso/i)).toBeVisible();
  });
});
