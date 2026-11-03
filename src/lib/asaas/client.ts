// Forçamos o URL de produção diretamente
const baseUrl = "https://api.asaas.com/v3";

export async function asaasRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  
  // COLE A SUA CHAVE DO ASAAS AQUI DENTRO DAS ASPAS (Substitua tudo o que está a verde)
  const apiKey = process.env.ASAAS_ACCESS_TOKEN;

  if (!apiKey || apiKey.includes("COLE_O_RESTO")) {
    throw new Error("Esqueceu-se de colar a chave inteira no ficheiro client.ts");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "access_token": apiKey,
      "User-Agent": "MEGAGamer/0.1.0",
      ...init.headers
    },
    cache: "no-store" // Impede que o Next.js guarde dados velhos em cache
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Agora vai mostrar exatamente o motivo se o Asaas recusar (ex: CPF inválido)
    throw new Error(body?.errors?.[0]?.description || `O Asaas recusou a ligação (Erro ${response.status})`);
  }

  return body as T;
}