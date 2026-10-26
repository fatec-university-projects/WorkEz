export const API_BASE_URL = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5065';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface TestAuthAccount {
  email: string;
  pass: string;
  tokens: AuthTokens;
}

export async function createTestCustomer(): Promise<TestAuthAccount> {
  const rand = Math.floor(Math.random() * 900000) + 100000;
  const email = `cliente.teste.${rand}@workez.com`;
  const pass = 'Senha@123';
  const name = `Cliente Teste ${rand}`;

  const regRes = await fetch(`${API_BASE_URL}/api/Auth/register/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password: pass,
      phone: '(11) 99999-8888',
    }),
  });

  if (!regRes.ok) {
    const err = await regRes.text();
    throw new Error(`Falha ao registrar cliente: ${err}`);
  }

  const regData = await regRes.json();

  const loginRes = await fetch(`${API_BASE_URL}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });

  if (!loginRes.ok) throw new Error('Falha no login do cliente');
  const tokens = await loginRes.json();

  const userId = regData.id || regData.Id;

  return {
    email,
    pass,
    tokens: {
      ...tokens,
      user: {
        id: userId,
        email,
        name,
        role: 'Customer',
      },
    },
  };
}

export async function createTestProvider(): Promise<TestAuthAccount> {
  const rand = Math.floor(Math.random() * 900000) + 100000;
  const email = `prestador.teste.${rand}@workez.com`;
  const pass = 'Senha@123';
  const name = `Prestador Teste ${rand}`;

  const regRes = await fetch(`${API_BASE_URL}/api/Auth/register/provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password: pass,
      phone: '(11) 98888-7777',
      documentNumber: `${rand}00`,
    }),
  });

  if (!regRes.ok) {
    const err = await regRes.text();
    throw new Error(`Falha ao registrar prestador: ${err}`);
  }

  const regData = await regRes.json();

  const loginRes = await fetch(`${API_BASE_URL}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });

  if (!loginRes.ok) throw new Error('Falha no login do prestador');
  const tokens = await loginRes.json();

  const userId = regData.id || regData.Id;

  return {
    email,
    pass,
    tokens: {
      ...tokens,
      user: {
        id: userId,
        email,
        name,
        role: 'ServiceProvider',
      },
    },
  };
}

/**
 * Injeta o token de autenticação e o perfil no localStorage do navegador para testes E2E
 */
export async function injectAuth(page: any, auth: TestAuthAccount) {
  await page.addInitScript(
    ({ token, refresh, user }: any) => {
      try {
        window.localStorage.setItem('@workez_access_token', token);
        window.localStorage.setItem('@workez_refresh_token', refresh);
        window.localStorage.setItem('@workez_user_profile', JSON.stringify(user));
      } catch (e) {
        console.warn('Erro ao injetar auth:', e);
      }
    },
    {
      token: auth.tokens.accessToken,
      refresh: auth.tokens.refreshToken,
      user: auth.tokens.user,
    }
  );
}

/**
 * Limpa chaves de autenticação do localStorage
 */
export async function clearAuthStorage(page: any) {
  await page.evaluate(() => {
    window.localStorage.removeItem('@workez_access_token');
    window.localStorage.removeItem('@workez_refresh_token');
    window.localStorage.removeItem('@workez_user_profile');
  });
}

export async function getCustomerProfile(customer: TestAuthAccount): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/Customers/by-user/${customer.tokens.user.id}`, {
    headers: { Authorization: `Bearer ${customer.tokens.accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar perfil do cliente: ${await res.text()}`);
  }
  return await res.json();
}

export async function getProviderProfile(provider: TestAuthAccount): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/ServiceProviders/by-user/${provider.tokens.user.id}`, {
    headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar perfil do prestador: ${await res.text()}`);
  }
  return await res.json();
}

export async function createTestServiceCall(customerId: string, token: string, customPayload?: any): Promise<any> {
  let categoryId: string | undefined;
  try {
    const catRes = await fetch(`${API_BASE_URL}/api/Categories`);
    if (catRes.ok) {
      const categories = await catRes.json();
      if (categories && categories.length > 0) {
        categoryId = categories[0].id || categories[0].Id;
      }
    }
  } catch {
    // Continua com fallback
  }

  const payload = {
    title: 'Reparo Hidráulico Urgente',
    description: 'Vazamento sob a pia da cozinha necessitando troca de cano.',
    categoryId,
    ...customPayload,
    address: {
      zipCode: '01310-100',
      street: 'Av Paulista',
      number: '1000',
      complement: 'Apto 101',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      addressType: 'Home',
      latitude: -23.563,
      longitude: -46.654,
      ...(customPayload?.address || {}),
    },
  };

  const res = await fetch(`${API_BASE_URL}/api/Services/by-customer/${customerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao criar chamado: ${err}`);
  }

  return await res.json();
}

export async function createTestProposal(
  provider: TestAuthAccount,
  serviceId: string,
  options?: {
    laborPrice?: number;
    materialsPrice?: number;
    proposedPrice?: number;
    description?: string;
    estimatedTime?: string;
  }
): Promise<any> {
  const laborPrice = options?.laborPrice ?? 120.0;
  const materialsPrice = options?.materialsPrice ?? 30.0;
  const proposedPrice = options?.proposedPrice ?? laborPrice + materialsPrice;

  const res = await fetch(`${API_BASE_URL}/api/Proposals/propose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.tokens.accessToken}`,
    },
    body: JSON.stringify({
      serviceId,
      providerUserId: provider.tokens.user.id,
      laborPrice,
      materialsPrice,
      proposedPrice,
      description: options?.description ?? 'Proposta enviada via suíte de testes E2E.',
      estimatedTime: options?.estimatedTime ?? '1 hora',
    }),
  });

  if (!res.ok) {
    // Verifica se a proposta já foi persistida antes de eventual exceção assíncrona de notificação
    const listRes = await fetch(`${API_BASE_URL}/api/Proposals/by-service/${serviceId}`, {
      headers: { Authorization: `Bearer ${provider.tokens.accessToken}` },
    });
    if (listRes.ok) {
      const list = await listRes.json();
      const existing = Array.isArray(list)
        ? list.find((p: any) => p.providerUserId === provider.tokens.user.id) || list[0]
        : null;
      if (existing) return existing;
    }
    throw new Error(`Erro ao criar proposta: ${await res.text()}`);
  }
  return await res.json();
}

export async function acceptTestProposal(customer: TestAuthAccount, proposalId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/Proposals/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.tokens.accessToken}`,
    },
    body: JSON.stringify({
      proposalId,
      customerUserId: customer.tokens.user.id,
    }),
  });

  if (!res.ok) {
    throw new Error(`Erro ao aceitar proposta: ${await res.text()}`);
  }
  return await res.json();
}

/**
 * Conclui a execução pelo prestador (waiting-payment) e confirma o pagamento (completed + liberação de custódia).
 */
export async function completeAndPayService(
  serviceId: string,
  providerToken: string,
  customerToken: string,
  finalPrice?: number
): Promise<void> {
  const completeRes = await fetch(`${API_BASE_URL}/api/Services/${serviceId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: finalPrice !== undefined ? JSON.stringify({ price: finalPrice }) : undefined,
  });

  if (!completeRes.ok) {
    throw new Error(`Erro ao finalizar execução do serviço: ${await completeRes.text()}`);
  }

  const confirmRes = await fetch(`${API_BASE_URL}/api/Services/${serviceId}/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
  });

  if (!confirmRes.ok) {
    throw new Error(`Erro ao confirmar pagamento do serviço: ${await confirmRes.text()}`);
  }
}
