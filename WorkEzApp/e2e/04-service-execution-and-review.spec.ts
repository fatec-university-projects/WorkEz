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

test.describe('Fluxo 4: Execução do Serviço, Conclusão e Avaliação Real', () => {
  test('deve exibir etapa de aguardando pagamento no tracking e permitir avaliação após conclusão', async ({ page }) => {
    test.setTimeout(90000);
    const customer = await createTestCustomer();
    const provider = await createTestProvider();

    await injectAuth(page, customer);

    const customerProfile = await getCustomerProfile(customer);
    const serviceCall = await createTestServiceCall(customerProfile.id, customer.tokens.accessToken);

    // 1. Prestador envia proposta e cliente aceita
    const proposal = await createTestProposal(provider, serviceCall.id, {
      laborPrice: 100.0,
      materialsPrice: 0.0,
      proposedPrice: 100.0,
      description: 'Serviço rápido.',
    });

    await acceptTestProposal(customer, proposal.id);

    // 2. Prestador conclui execução (status vai para waiting-payment)
    const completeRes = await fetch(`${API_BASE_URL}/api/Services/${serviceCall.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.tokens.accessToken}`,
      },
      body: JSON.stringify({ price: 100.0 }),
    });
    expect(completeRes.ok).toBeTruthy();

    // Valida que no tracking do cliente aparece o botão de pagamento
    await page.goto(`/client/tracking/${serviceCall.id}`);
    await expect(page.getByText('Efetuar Pagamento do Chamado')).toBeVisible({ timeout: 15000 });

    // 3. Confirma o pagamento para que o serviço alcance o status "completed"
    await completeAndPayService(
      serviceCall.id,
      provider.tokens.accessToken,
      customer.tokens.accessToken,
      100.0
    );

    // Auto aceita alertas na web
    page.on('dialog', (dialog) => dialog.accept());

    // 4. Cliente acessa a tela de avaliação (/client/rating/[id])
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
      page.waitForResponse((resp) => resp.url().includes('/api/Reviews/by-customer') && resp.status() === 200, {
        timeout: 15000,
      }),
      submitBtn.click(),
    ]);

    await page.waitForTimeout(500);

    // 5. Confere API de reviews do prestador
    const reviewsRes = await fetch(`${API_BASE_URL}/api/Reviews/by-user/${provider.tokens.user.id}`, {
      headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
    });
    const reviews = await reviewsRes.json();
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0].comment).toContain('Excelente profissional');
  });
});
