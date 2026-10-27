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

test.describe('Fluxo 13: Jornada Completa de UI do Prestador (Proposta, Contraproposta, Check-in OTP e Conclusão)', () => {
  test('deve enviar proposta pela UI, aceitar contraproposta e executar todas as etapas do atendimento pela tela do prestador', async ({ page }) => {
    test.setTimeout(120000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    const customerProfile = await getCustomerProfile(customer);
    const providerProfile = await getProviderProfile(provider);

    // Configura localização do prestador próxima ao chamado
    await fetch(`${API_BASE_URL}/api/ServiceProviders/${providerProfile.id}/location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        latitude: -23.5615,
        longitude: -46.6559,
        serviceRadiusKm: 30,
      }),
    });

    const uniqueTitle = `Instalação de Luminária LED ${Date.now()}`;
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken, {
      title: uniqueTitle,
      description: 'Instalar 4 plafons de LED na sala de estar.',
    });

    // Auto-aceita alerts/confirms nativos do navegador
    page.on('dialog', (dialog) => dialog.accept());

    // 1. Prestador acessa a tela de envio de proposta (/provider/new-call/[id]) pela UI
    await injectAuth(page, provider);
    await page.goto(`/provider/new-call/${serviceCall.id}`);

    await expect(page.getByText('Novo chamado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Instalar 4 plafons de LED na sala de estar.')).toBeVisible();
    await expect(page.getByText('Enviar Lance (Leilão)')).toBeVisible();

    // Preenche Mão de Obra e Materiais na UI
    await page.getByPlaceholder('Ex: 200,00').fill('200');
    await page.getByPlaceholder('Ex: 50,00').fill('50');

    // Valida simulação financeira dinâmica (Total R$ 250,00 | Taxa 15% s/ 200 = R$ 30,00 | Líquido = R$ 220,00)
    await expect(page.getByText('Total da proposta:')).toBeVisible();
    await expect(page.getByText('R$ 250,00')).toBeVisible();
    await expect(page.getByText('- R$ 30,00')).toBeVisible();
    await expect(page.getByText('R$ 220,00')).toBeVisible();

    // Seleciona chip de estimativa de tempo e preenche observação
    await page.getByText('2 a 3 horas', { exact: true }).click();
    await page.getByPlaceholder('Ex: Inclui material básico e deslocamento.').fill('Levo escada e ferramentas completas.');

    // Envia proposta pela UI
    await page.getByRole('button', { name: 'Enviar Proposta' }).click();

    // Deve redirecionar para /provider/calls
    await expect(page).toHaveURL(/\/provider\/calls/, { timeout: 15000 });

    // 2. Verifica na aba "Minhas Propostas"
    await page.getByText('Minhas Propostas').click();
    await expect(page.getByText('Aguardando Cliente').first()).toBeVisible({ timeout: 15000 });

    // Busca ID da proposta criada para simular contraproposta do cliente
    const proposalsRes = await fetch(`${API_BASE_URL}/api/Proposals/by-service/${serviceCall.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const proposals = await proposalsRes.json();
    const myProposal = proposals.find((p: any) => p.providerUserId === provider.tokens.user.id) || proposals[0];
    expect(myProposal).toBeTruthy();

    // Cliente envia contraproposta de R$ 230,00
    await fetch(`${API_BASE_URL}/api/Proposals/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
      body: JSON.stringify({
        proposalId: myProposal.id,
        customerUserId: customer.tokens.user.id,
        counterPrice: 230.0,
        counterDescription: 'Consegue fechar por R$ 230?',
      }),
    });

    // Prestador recarrega "Minhas Propostas" e aceita o novo valor pela UI
    await page.reload();
    await page.getByText('Minhas Propostas').click();
    await expect(page.getByText('Contra-proposta Recebida')).toBeVisible({ timeout: 15000 });

    const acceptCounterBtn = page.getByText(/Aceitar R\$ 230\.00/i);
    await expect(acceptCounterBtn).toBeVisible();
    await acceptCounterBtn.click();

    // Cliente confirma o aceite final da proposta
    await fetch(`${API_BASE_URL}/api/Proposals/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.tokens.accessToken}`,
      },
      body: JSON.stringify({
        proposalId: myProposal.id,
        customerUserId: customer.tokens.user.id,
      }),
    });

    // 3. Prestador acessa a tela de execução do chamado aceito (/provider/accepted/[id])
    await page.goto(`/provider/accepted/${serviceCall.id}`);
    await expect(page.getByText('1. Chamado Aceito')).toBeVisible({ timeout: 15000 });

    // Clica em "Iniciar Deslocamento" pela UI
    const startDispBtn = page.getByText('Iniciar Deslocamento', { exact: true });
    await expect(startDispBtn).toBeVisible();
    await startDispBtn.click();

    // Valida que o botão mudou para "Check-in Seguro & Iniciar Execução"
    const openCheckInBtn = page.getByText('Check-in Seguro & Iniciar Execução');
    await expect(openCheckInBtn).toBeVisible({ timeout: 15000 });

    // Obtém o código OTP de 4 dígitos gerado para o cliente
    const detailRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const detailData = await detailRes.json();
    const otpCode = detailData.startCheckInCode || '7492';

    // Abre o modal de Check-in e valida o código OTP pela UI
    await openCheckInBtn.click();
    await expect(page.getByText('Check-in de Segurança')).toBeVisible();

    const otpInput = page.getByPlaceholder('0 0 0 0');
    await expect(otpInput).toBeVisible();
    await otpInput.fill(otpCode);

    await page.getByText('Validar Check-in', { exact: true }).click();

    // 4. Verifica que o serviço entrou em execução e clica em "Concluir Atendimento (Fotos & Valor)"
    const completeBtn = page.getByText('Concluir Atendimento (Fotos & Valor)');
    await expect(completeBtn).toBeVisible({ timeout: 15000 });
    await completeBtn.click();

    // 5. Na tela /provider/inform-value/[id], confirma o valor final e finaliza pela UI
    await expect(page.getByText('Informar Valor Final')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Valor Final do Serviço')).toBeVisible();

    const confirmValueBtn = page.getByText('Confirmar Valor e Finalizar');
    await expect(confirmValueBtn).toBeVisible();
    await confirmValueBtn.click();

    // Deve navegar para a tela de aguardando pagamento (/provider/waiting-payment/[id])
    await expect(page).toHaveURL(new RegExp(`/provider/waiting-payment/${serviceCall.id}`), { timeout: 15000 });
  });
});
