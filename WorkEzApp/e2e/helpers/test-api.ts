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

export async function createTestCustomer(): Promise<{ email: string; pass: string; tokens: AuthTokens }> {
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

export async function createTestProvider(): Promise<{ email: string; pass: string; tokens: AuthTokens }> {
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
export async function injectAuth(page: any, auth: { email: string; pass: string; tokens: AuthTokens }) {
  await page.addInitScript(({ token, refresh, user }: any) => {
    try {
      window.localStorage.setItem('@workez_access_token', token);
      window.localStorage.setItem('@workez_refresh_token', refresh);
      window.localStorage.setItem('@workez_user_profile', JSON.stringify(user));
    } catch (e) {
      console.warn('Erro ao injetar auth:', e);
    }
  }, {
    token: auth.tokens.accessToken,
    refresh: auth.tokens.refreshToken,
    user: auth.tokens.user,
  });
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
      latitude: -23.5630,
      longitude: -46.6540,
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
