import { test, expect } from '@playwright/test';
import { createTestCustomer, injectAuth } from './helpers/test-api';

test.describe('Fluxo 16: Gerenciamento de Meus Endereços e Integração na Criação de Chamados', () => {
  test('deve gerenciar endereços salvos e utilizá-los rapidamente na criação do chamado', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    await injectAuth(page, customer);

    // Mock determinístico do ViaCEP
    await page.route('**/viacep.com.br/ws/**/json/**', async (route) => {
      const url = route.request().url();
      if (url.includes('04101000') || url.includes('04101-000')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cep: '04101-000',
            logradouro: 'Rua Domingos de Morais',
            complemento: '',
            bairro: 'Vila Mariana',
            localidade: 'São Paulo',
            uf: 'SP',
          }),
        });
      } else {
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
      }
    });

    // Mock Nominatim OpenStreetMap
    await page.route('**/nominatim.openstreetmap.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ lat: '-23.5614', lon: '-46.6558' }]),
      });
    });

    // Auto aceita eventuais caixas de diálogo / alerts nativos
    page.on('dialog', (dialog) => dialog.accept());

    // 1. Acessa o Perfil do Cliente e navega até "Meus endereços"
    await page.goto('/client/profile');
    await expect(page.getByText('Meus endereços')).toBeVisible({ timeout: 15000 });
    await page.getByText('Meus endereços').click();

    // 2. Tela de Meus Endereços (/client/addresses)
    await expect(page.getByText('Meus endereços').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Nenhum endereço cadastrado')).toBeVisible();

    // 3. Cadastra o primeiro endereço (Casa)
    await page.getByText('+ Adicionar endereço').click();
    await expect(page.getByText('Novo endereço')).toBeVisible();

    const cepInput = page.getByPlaceholder('00000-000');
    await cepInput.fill('01310100');

    // Aguarda auto-preenchimento
    await expect(page.getByText('Endereço localizado:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Avenida Paulista, Bela Vista/i)).toBeVisible();

    await page.getByPlaceholder('123').fill('1500');
    await page.getByPlaceholder('Ex: Apto 101, Bloco B').fill('Apto 42');

    // Seleciona categoria "Casa"
    await page.getByText('Casa', { exact: true }).first().click();

    // Salva o endereço
    const saveAddrBtn = page.getByRole('button', { name: 'Salvar endereço' });
    await saveAddrBtn.click();

    // Valida que o endereço aparece listado como padrão (pois é o primeiro)
    await expect(page.getByText('Avenida Paulista, 1500')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Padrão')).toBeVisible();

    // 4. Cadastra um segundo endereço (Trabalho)
    await page.getByText('+ Adicionar endereço').click();
    await expect(page.getByText('Novo endereço')).toBeVisible();

    await page.getByPlaceholder('00000-000').fill('04101000');
    await expect(page.getByText('Endereço localizado:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Rua Domingos de Morais, Vila Mariana/i)).toBeVisible();

    await page.getByPlaceholder('123').fill('800');
    await page.getByPlaceholder('Ex: Apto 101, Bloco B').fill('Sala 5');

    // Categoria Trabalho
    await page.getByText('Trabalho', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Salvar endereço' }).click();

    // Valida que ambos os endereços estão listados
    await expect(page.getByText('Rua Domingos de Morais, 800')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Avenida Paulista, 1500')).toBeVisible();

    // 5. Integração com a Criação de Chamado (/client/describe)
    // O cliente vai solicitar um serviço e o endereço salvo deve estar disponível para escolha imediata
    await page.goto('/client/describe?category=Eletricista&categoryId=cat-eletricista');
    await expect(page.getByText('Descreva o serviço')).toBeVisible({ timeout: 15000 });

    // Preenche a descrição do serviço
    const descInput = page.getByPlaceholder('Descreva detalhadamente o problema ou serviço que precisa...');
    await descInput.fill('Instalação de disjuntor bipolar no quadro de distribuição.');

    // Valida que o seletor de endereços salvos está presente
    await expect(page.getByText('Onde o serviço será realizado?')).toBeVisible();
    await expect(page.getByText('Selecionado')).toBeVisible();

    // Alterna para o endereço de Trabalho com apenas 1 clique no chip
    const trabalhoChip = page.getByText(/Trabalho:/i);
    await expect(trabalhoChip).toBeVisible();
    await trabalhoChip.click();

    // Confirma que o endereço de Trabalho ficou ativo
    await expect(page.getByText(/Rua Domingos de Morais, 800/i)).toBeVisible();

    // Avança para o Resumo do Chamado (/client/confirm)
    const continueBtn = page.getByRole('button', { name: 'Continuar' });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // 6. Validação na tela de Confirmação (/client/confirm)
    await expect(page.getByText('Confirmar chamado').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Resumo do serviço')).toBeVisible();
    await expect(page.getByText(/Rua Domingos de Morais, nº 800/i)).toBeVisible();
    await expect(page.getByText(/Sala 5/i)).toBeVisible();
    await expect(page.getByText(/Vila Mariana/i)).toBeVisible();
  });
});
