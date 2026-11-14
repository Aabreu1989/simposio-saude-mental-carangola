/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Supabase Client Helper
// Fornece a conexão e utilitários para integração com o Supabase quando configurado via variáveis de ambiente.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('MY_SUPABASE_URL') &&
    !SUPABASE_ANON_KEY.includes('MY_SUPABASE_ANON_KEY')
  );
};

export const getSupabaseHeaders = () => {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

/**
 * Consulta genérica via Supabase REST API (PostgREST)
 * Não requer pacotes externos obrigatórios caso a biblioteca @supabase/supabase-js não esteja instalada.
 */
export async function supabaseRestQuery<T = any>(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: string;
    body?: any;
  } = {}
): Promise<{ data: T | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.') };
  }

  const { method = 'GET', query = '', body } = options;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;

  try {
    const res = await fetch(url, {
      method,
      headers: getSupabaseHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: new Error(`Erro Supabase (${res.status}): ${errText}`) };
    }

    const data = (await res.json()) as T;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
