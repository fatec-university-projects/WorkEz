import { test, expect } from '@playwright/test';
import { createTestCustomer, injectAuth } from './helpers/test-api';

test.describe('Fluxo 11: Wizard Completo de Criação de Chamado na UI e Navegação Pós-Criação', () => {
  test('deve criar um chamado completo pela interface e voltar para a Home (/client) ao clicar em Voltar no acompanhamento', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    // Intercepta consulta ViaCEP e Nominatim para resposta instantânea e determinística no teste E2E
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

    // 1. Acessa a Home do cliente (/client)
    await page.goto('/client');
    await expect(page.getByText('Categorias de Serviço')).toBeVisible({ timeout: 15000 });

    // Valida a barra de busca de categorias na Home
    const searchInput = page.getByPlaceholder('Buscar encanador, eletricista, pintor...');
    await expect(searchInput).toBeVisible();

    // Clica em "Chamar agora" no card de Atendimento Imediato (que leva para /client/category)
    const chamarAgoraBtn = page.getByText('Chamar agora');
    await expect(chamarAgoraBtn).toBeVisible();
    await chamarAgoraBtn.click();

    // Na tela de seleção de categoria (/client/category), seleciona "Encanador" (que navega direto para /client/describe)
    await expect(page.getByText('Selecione o serviço')).toBeVisible({ timeout: 15000 });
    await page.getByText('Encanador').first().click();

    // 2. Tela de Descrição do Serviço (/client/describe)
    await expect(page.getByText('Descreva o serviço')).toBeVisible({ timeout: 15000 });

    const descInput = page.getByPlaceholder('Descreva detalhadamente o problema ou serviço que precisa...');
    await expect(descInput).toBeVisible();
    await descInput.fill('Troca de registro geral com vazamento na parede da cozinha.');

    const cepInput = page.getByPlaceholder('Digite o CEP (Ex: 09441-550)');
    await expect(cepInput).toBeVisible();
    await cepInput.fill('01310100');

    // Aguarda preenchimento automático do endereço via CEP
    await expect(page.getByText('Endereço encontrado:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Avenida Paulista, Bela Vista/i)).toBeVisible();

    const numInput = page.getByPlaceholder('Ex: 123');
    await numInput.fill('1578');

    const compInput = page.getByPlaceholder('Ex: Apto 4');
    await compInput.fill('Sala 12');

    // Avança para a tela de confirmação
    const continueBtn = page.getByRole('button', { name: 'Continuar' });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // 3. Tela de Confirmação (/client/confirm)
    await expect(page.getByText('Confirmar chamado').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Resumo do serviço')).toBeVisible();
    await expect(page.getByText('Troca de registro geral com vazamento na parede da cozinha.')).toBeVisible();
    await expect(page.getByText(/Avenida Paulista, nº 1578/i)).toBeVisible();

    // Confirma abertura do chamado
    const confirmCallBtn = page.getByRole('button', { name: 'Confirmar chamado' });
    await expect(confirmCallBtn).toBeVisible();
    await confirmCallBtn.click();

    // 4. Passa pela tela de busca (/client/searching) e redireciona para o acompanhamento (/client/tracking/[id])
    await page.waitForURL(/\/client\/tracking\/[a-f0-9-]+/i, { timeout: 25000 });
    await expect(page.getByText('Acompanhar chamado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Troca de registro geral com vazamento na parede da cozinha.')).toBeVisible();

    // 5. REGRA DE USABILIDADE: Clicar em "Voltar" após criar o chamado deve levar para a Home (/client)
    // e NUNCA de volta para o formulário de criação (/client/describe ou /client/confirm)
    const backBtn = page.getByLabel('Voltar');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await expect(page).toHaveURL(/\/client\/?$/, { timeout: 15000 });
    await expect(page.getByText('Categorias de Serviço')).toBeVisible();

    // 6. Abrir o chamado a partir de "Meus serviços" (/client/services) e clicar em "Voltar" deve retornar para /client/services
    await page.goto('/client/services');
    await expect(page.getByText('Meus serviços')).toBeVisible({ timeout: 15000 });

    // Em "Meus serviços", a aba inicial é "Em andamento" e o ServiceCard exibe "Encanador"
    const serviceCard = page.getByText('Encanador').first();
    await expect(serviceCard).toBeVisible({ timeout: 15000 });
    await serviceCard.click();

    await page.waitForURL(/\/client\/tracking\/[a-f0-9-]+/i, { timeout: 15000 });
    await expect(page.getByText('Acompanhar chamado')).toBeVisible();

    await page.getByLabel('Voltar').click();
    await expect(page).toHaveURL(/\/client\/services/, { timeout: 15000 });
  });
});
