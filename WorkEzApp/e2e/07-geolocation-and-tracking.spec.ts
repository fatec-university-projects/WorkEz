import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestProvider,
  createTestServiceCall,
  API_BASE_URL,
  injectAuth,
} from './helpers/test-api';

test.describe('Fluxo 7: Geolocalização, Raio de Atuação e Rastreamento em Tempo Real', () => {
  test('deve configurar área de atuação e raio de atendimento interativo no mapa', async ({ page }) => {
    test.setTimeout(90000);

    const provider = await createTestProvider();
    await injectAuth(page, provider);

    // 1. Acessa a tela de configuração de área de atuação do prestador
    await page.goto('/provider/work-area');

    await expect(page.getByText('Área de atuação')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Raio de atendimento no mapa')).toBeVisible();

    // 2. Valida o componente de preview de raio (RadiusMapPreview)
    await expect(page.getByText('Você está aqui')).toBeVisible();
    await expect(page.getByText(/Raio: 15 km/i)).toBeVisible();

    // 3. Testa alteração interativa do seletor de raio para 20 km
    const btn20km = page.getByText('20 km', { exact: true });
    await expect(btn20km).toBeVisible();
    await btn20km.click();

    // Valida que o radar no mapa foi atualizado para 20 km
    await expect(page.getByText(/Raio: 20 km/i)).toBeVisible();

    // 4. Seleciona uma categoria de serviço disponível
    const firstCategoryButton = page.locator('text=Categorias que você atende').locator('..').locator('button, div[role="button"], [tabindex="0"]').first();
    // Alternativa robusta buscando pelo texto de categorias caso o botão acima varie
    const anyCategoryOption = page.locator('div').filter({ hasText: /^(Limpeza|Reformas|Elétrica|Pintura|Hidráulica|Assistência)/i }).first();
    if (await anyCategoryOption.isVisible()) {
      await anyCategoryOption.click();
    } else {
      // Fallback: clica na primeira opção disponível dentro da grade
      const catOption = page.locator('text=Categorias que você atende').locator('xpath=following-sibling::div[1]//div').first();
      await catOption.click();
    }

    // 5. Preenche os campos obrigatórios de experiência e descrição
    const experienceInput = page.getByPlaceholder('Ex: 5');
    await expect(experienceInput).toBeVisible();
    await experienceInput.fill('6');

    const descInput = page.getByPlaceholder(/Descreva detalhadamente suas habilidades/i);
    await expect(descInput).toBeVisible();
    await descInput.fill('Profissional qualificado com atendimento pontual e ferramentas completas.');

    // Auto-aceita eventuais diálogos nativos da web
    page.on('dialog', (dialog) => dialog.accept());

    // 6. Clica em "Salvar e Continuar"
    const submitBtn = page.getByText('Salvar e Continuar');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 7. Valida redirecionamento ou processamento com sucesso
    await expect(page).toHaveURL(/\/provider/, { timeout: 15000 });
  });

  test('deve exibir indicador de distância e tempo no card de chamados do prestador', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // Busca perfil do cliente e cria chamado com endereço georreferenciado
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`);
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    // Atualiza a localização do prestador para São Paulo (próximo ao chamado)
    const providerProfileRes = await fetch(`${API_BASE_URL}/api/ServiceProviders/by-user/${provider.tokens.user.id}`);
    const providerProfile = await providerProfileRes.json();

    await fetch(`${API_BASE_URL}/api/ServiceProviders/${providerProfile.id}/location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({
        latitude: -23.5615,
        longitude: -46.6559,
        serviceRadiusKm: 25,
      }),
    });

    // Injeta auth do prestador e acessa a listagem de chamados
    await injectAuth(page, provider);
    await page.goto('/provider/calls');

    await expect(page.getByText('Chamados & Propostas')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Novos')).toBeVisible();

    // Valida que o chamado criado aparece e exibe o selo de distância e tempo no ServiceCard
    // O texto deve corresponder ao padrão "A X.X km de você"
    const distanceBadge = page.getByText(/A \d+(\.\d+)? km de você/i).first();
    await expect(distanceBadge).toBeVisible({ timeout: 15000 });
  });

  test('deve renderizar o mapa em tempo real (LiveTrackingMap) no acompanhamento do cliente quando prestador estiver em deslocamento', async ({ page }) => {
    test.setTimeout(90000);

    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, customer);

    // 1. Cria chamado pelo cliente
    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`);
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

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
        laborPrice: 150.0,
        materialsPrice: 0.0,
        proposedPrice: 150.0,
        description: 'Chegarei em breve com equipamentos.',
        estimatedTime: '1 hora',
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

    // 4. Prestador inicia deslocamento ("on-the-way")
    const startDispRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/start-displacement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
    });
    expect(startDispRes.ok).toBeTruthy();

    // 5. Cliente acessa tela de rastreamento do serviço
    await page.goto(`/client/tracking/${serviceCall.id}`);

    // 6. Valida os elementos visuais do mapa em tempo real (LiveTrackingMap)
    await expect(page.getByText('PRESTADOR EM DESLOCAMENTO')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Chegada prevista em ~12 min/i)).toBeVisible();
    await expect(page.getByText(/Aproximadamente 3\.2 km de distância/i)).toBeVisible();
    await expect(page.getByText('Seu endereço')).toBeVisible();

    // Valida que o nome do prestador aparece como marcador no trajeto do mapa
    await expect(page.getByText(provider.tokens.user.name).first()).toBeVisible();
  });
});
