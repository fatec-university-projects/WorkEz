import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestServiceCall, API_BASE_URL, injectAuth } from './helpers/test-api';

test.describe('Fluxo 17: Inovações do Roadmap PO (Urgência SOS, Smart Scoping e Stepper Visual)', () => {
  test('deve criar chamado em modo Urgência SOS usando sugestão rápida e validar o Stepper de 5 etapas no acompanhamento', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    // Intercepta ViaCEP e Nominatim para resposta determinística
    await page.route('**/viacep.com.br/ws/**/json/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: '',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      });
    });

    await page.route('**/nominatim.openstreetmap.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ lat: '-23.5614', lon: '-46.6558' }]),
      });
    });

    // 1. Acessa a tela de descrição com categoria Encanador
    await page.goto('/client/describe?categoryId=11111111-1111-1111-1111-111111111102&categoryName=Encanador');
    await expect(page.getByText('Descreva o serviço')).toBeVisible({ timeout: 15000 });

    // 2. Valida a presença dos seletores de urgência (Normal vs SOS)
    const normalOption = page.getByText('Normal', { exact: true });
    const emergencyOption = page.getByText(/SOS \(Hoje\)/i);
    await expect(normalOption).toBeVisible();
    await expect(emergencyOption).toBeVisible();

    // Seleciona modo de Emergência SOS
    await emergencyOption.click();

    // 3. Valida e utiliza o Smart Scoping (Chips rápidos de escopo da categoria)
    await expect(page.getByText(/Sugestões rápidas/i)).toBeVisible();
    const chipVazamento = page.getByText('Vazamento em pia');
    await expect(chipVazamento).toBeVisible();
    await chipVazamento.click();

    // Valida que o chip inseriu o texto na caixa de descrição
    const descInput = page.getByPlaceholder('Descreva detalhadamente o problema ou serviço que precisa...');
    await expect(descInput).toHaveValue(/Vazamento em pia/);

    // 4. Preenche endereço
    const cepInput = page.getByPlaceholder('Digite o CEP (Ex: 09441-550)');
    await cepInput.fill('01310100');
    await expect(page.getByText('Endereço encontrado:')).toBeVisible({ timeout: 10000 });

    const numInput = page.getByPlaceholder('Ex: 123');
    await numInput.fill('900');

    // Avança para confirmação
    const continueBtn = page.getByRole('button', { name: 'Continuar' });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // 5. Na tela de Confirmação, valida o banner de Urgência SOS
    await expect(page.getByText('Confirmar chamado').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Modo Urgência SOS Ativo/i)).toBeVisible();
    await expect(page.getByText(/Vazamento em pia/)).toBeVisible();

    // Confirma abertura do chamado
    const confirmBtn = page.getByRole('button', { name: 'Confirmar chamado' });
    await confirmBtn.click();

    // 6. Aguarda redirecionamento para o Acompanhamento (/client/tracking/[id])
    await page.waitForURL(/\/client\/tracking\/[a-f0-9-]+/i, { timeout: 25000 });
    await expect(page.getByText('Acompanhar chamado')).toBeVisible({ timeout: 15000 });

    // 7. Validação do novo Componente: TrackingTimelineStepper (5 Etapas visuais)
    await expect(page.getByText('Criado', { exact: true })).toBeVisible();
    await expect(page.getByText('Aguardando', { exact: true })).toBeVisible();
    await expect(page.getByText('A Caminho', { exact: true })).toBeVisible();
    await expect(page.getByText('Execução', { exact: true })).toBeVisible();
    await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
  });

  test('deve exibir barra de comparativo de propostas e badges de destaque quando houver múltiplos lances no leilão', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    // Obtém perfil do cliente
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();

    // Cria chamado aberto no leilão
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);
    expect(serviceCall.id).toBeDefined();

    // Intercepta requisição de propostas para injetar lances concorrentes (um com menor preço e outro com maior avaliação)
    await page.route(`**/api/Proposals/by-service/${serviceCall.id}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '11111111-1111-1111-1111-111111111111',
            serviceId: serviceCall.id,
            providerUserId: '22222222-2222-2222-2222-222222222222',
            providerName: 'Carlos Encanador Econômico',
            providerRating: 4.2,
            proposedPrice: 160.0,
            laborPrice: 130.0,
            materialsPrice: 30.0,
            description: 'Melhor preço garantido e execução rápida.',
            status: 'Pending',
          },
          {
            id: '33333333-3333-3333-3333-333333333333',
            serviceId: serviceCall.id,
            providerUserId: '44444444-4444-4444-4444-444444444444',
            providerName: 'Marcos Master Expert',
            providerRating: 4.9,
            proposedPrice: 280.0,
            laborPrice: 220.0,
            materialsPrice: 60.0,
            description: 'Profissional especialista com 10 anos de experiência.',
            status: 'Pending',
          },
        ]),
      });
    });

    // Acessa o acompanhamento do chamado (/client/tracking/[id])
    await page.goto(`/client/tracking/${serviceCall.id}`);
    await expect(page.getByText('Acompanhar chamado')).toBeVisible({ timeout: 15000 });

    // Valida a Barra Comparativa de Lances (novo recurso do Roadmap)
    await expect(page.getByText('Menor Proposta')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('R$ 160,00').first()).toBeVisible();
    await expect(page.getByText('Lances Ativos')).toBeVisible();

    // Valida os badges de destaque gerados automaticamente:
    // 1) "Melhor Preço" na proposta de R$ 160
    await expect(page.getByText('Melhor Preço', { exact: true })).toBeVisible();

    // 2) "Mais Bem Avaliado" na proposta de avaliação 4.9
    await expect(page.getByText('Mais Bem Avaliado', { exact: true })).toBeVisible();
  });
});
