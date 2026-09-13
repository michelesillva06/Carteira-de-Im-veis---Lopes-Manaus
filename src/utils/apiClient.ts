/**
 * Robust API Client for handling network requests,
 * validating Content-Type JSON headers, and handling HTML/server error responses gracefully.
 */

export async function fetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error("Erro de conexão com o servidor. Verifique sua rede.");
  }

  const contentType = res.headers.get("content-type") || "";

  // If response is not JSON (e.g., HTML 502/504 Bad Gateway, Cloudflare error, or 404 page)
  if (!contentType.includes("application/json")) {
    const rawText = await res.text().catch(() => "");
    console.error(`[API Error] Non-JSON response from ${url} (${res.status}):`, rawText.slice(0, 150));
    
    if (res.status === 502 || res.status === 504) {
      throw new Error("O servidor de dados está inicializando ou indisponível. Tente novamente em alguns instantes.");
    }
    if (res.status === 404) {
      throw new Error("Recurso não encontrado no servidor (404).");
    }
    throw new Error(`Resposta do servidor em formato inválido (${res.status}). Aguarde e tente novamente.`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error("Falha ao interpretar dados recebidos do servidor.");
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Erro na requisição (${res.status}).`);
  }

  return data;
}
