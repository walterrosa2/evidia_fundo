import { describe, expect, it } from "vitest";
import { ApiError, request, resolveBaseUrl } from "./api";

const BASE = "http://api.invalid";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("a requisição deveria ter falhado");
}

describe("configuração da API operacional", () => {
  it("sem URL configurada falha com erro explícito, sem endereço embutido", () => {
    for (const raw of [undefined, "", "   "]) {
      expect(() => resolveBaseUrl(raw)).toThrowError(ApiError);
    }
    try {
      resolveBaseUrl(undefined);
    } catch (error) {
      expect((error as ApiError).code).toBe("api_not_configured");
    }
  });

  it("normaliza barra final", () => {
    expect(resolveBaseUrl("http://localhost:8007/")).toBe("http://localhost:8007");
  });
});

describe("request", () => {
  it("envia cookie de sessão e o cabeçalho exigido pelo servidor em toda chamada", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    await request(
      "/api/v1/opportunities",
      { method: "POST", body: JSON.stringify({ a: 1 }) },
      async (url, init) => {
        calls.push({ url, init: init! });
        return jsonResponse(200, []);
      },
      BASE,
    );
    const { url, init } = calls[0];
    const headers = new Headers(init.headers);
    expect(url).toBe("http://api.invalid/api/v1/opportunities");
    expect(init.credentials).toBe("include");
    expect(headers.get("x-evidia-request")).toBe("1");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("não força content-type em upload multipart", async () => {
    let captured: Headers | null = null;
    await request(
      "/upload",
      { method: "POST", body: new FormData() },
      async (_url, init) => {
        captured = new Headers(init!.headers);
        return jsonResponse(200, {});
      },
      BASE,
    );
    expect(captured!.get("content-type")).toBeNull();
  });

  it("converte o envelope de erro da API em erro tipado com rastreio", async () => {
    const error = await failure(
      request(
        "/x",
        {},
        async () =>
          jsonResponse(503, {
            error: {
              code: "origination_not_configured",
              message: "Integracao nao configurada.",
              details: { retryable: false },
            },
            correlation_id: "corr-123",
          }),
        BASE,
      ),
    );
    expect(error.status).toBe(503);
    expect(error.code).toBe("origination_not_configured");
    expect(error.details).toEqual({ retryable: false });
    expect(error.correlationId).toBe("corr-123");
  });

  it("identifica sessão ausente", async () => {
    const error = await failure(
      request(
        "/x",
        {},
        async () =>
          jsonResponse(401, {
            error: {
              code: "not_authenticated",
              message: "Autenticacao necessaria.",
              details: null,
            },
            correlation_id: "c",
          }),
        BASE,
      ),
    );
    expect(error.isUnauthenticated).toBe(true);
  });

  it("falha de rede vira erro explícito — nunca dado substituto", async () => {
    const error = await failure(
      request(
        "/x",
        {},
        async () => {
          throw new TypeError("Failed to fetch");
        },
        BASE,
      ),
    );
    expect(error.code).toBe("api_unreachable");
    expect(error.status).toBe(0);
  });

  it("resposta 200 que não é JSON é recusada", async () => {
    const error = await failure(
      request(
        "/x",
        {},
        async () =>
          new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }),
        BASE,
      ),
    );
    expect(error.code).toBe("unexpected_response");
  });

  it("erro sem envelope conhecido não expõe corpo bruto", async () => {
    const error = await failure(
      request("/x", {}, async () => new Response("stack trace interno", { status: 500 }), BASE),
    );
    expect(error.code).toBe("unexpected_response");
    expect(error.message).not.toContain("stack trace");
  });

  it("204 devolve vazio", async () => {
    const result = await request(
      "/x",
      { method: "POST" },
      async () => new Response(null, { status: 204 }),
      BASE,
    );
    expect(result).toBeUndefined();
  });
});
