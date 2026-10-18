import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestProvider, createTestServiceCall, API_BASE_URL, injectAuth } from './helpers/test-api';

test.describe('Fluxo 4: Execução do Serviço, Conclusão e Avaliação Real', () => {
  test('deve concluir serviço e registrar avaliação de 5 estrelas com tags', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    // Injeta auth na sessão do navegador
    await injectAuth(page, customer);

    const customerProfileRes = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const customerProfile = await customerProfileRes.json();
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    const providerProfileRes = await fetch(`${API_BASE_URL}/api/ServiceProviders/by-user/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    const providerProfile = await providerProfileRes.json();

    // 1. Prestador envia proposta e cliente aceita
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
        description: 'Serviço rápido.',
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

    // 2. Prestador avança o chamado para completed
    const completeRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
    });
    expect(completeRes.ok).toBeTruthy();

    // Auto aceita alertas na web
    page.on('dialog', dialog => dialog.accept());

    // 3. Cliente acessa a tela de avaliação (/client/rating/[id])
    await page.goto(`/client/rating/${serviceCall.id}`);

    await expect(page.getByText('Como foi sua experiência?')).toBeVisible({ timeout: 15000 });

    // Clica na 5ª estrela
    await page.getByLabel('Avaliar com 5 estrelas').click();

    // Preenche comentário
    const commentInput = page.getByPlaceholder('Conte como foi sua experiência...');
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Excelente profissional, extremamente pontual e atencioso!');

    // Seleciona uma tag
    const pontualTag = page.getByText('Pontual', { exact: true });
    if (await pontualTag.isVisible()) {
      await pontualTag.click();
    }

    // Clica em Enviar avaliação
    const submitBtn = page.getByRole('button', { name: 'Enviar avaliação' });
    await expect(submitBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/Reviews/by-customer') && resp.status() === 200, { timeout: 15000 }),
      submitBtn.click(),
    ]);

    // Aguarda o processamento
    await page.waitForTimeout(500);

    // 4. Confere API de reviews do prestador
    const reviewsRes = await fetch(`${API_BASE_URL}/api/Reviews/by-user/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const reviews = await reviewsRes.json();
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0].comment).toContain('Excelente profissional');
  });
});
