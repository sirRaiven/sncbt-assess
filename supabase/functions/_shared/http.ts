export interface ErrorPayload {
  code: string;
  message: string;
}

const LOCAL_DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]);

function configuredOrigins(): string[] {
  return (Deno.env.get("FRONTEND_URLS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizedOrigin(req: Request): string {
  return (req.headers.get("origin") ?? "").trim();
}

export function isBrowserOriginAllowed(req: Request): boolean {
  const origin = normalizedOrigin(req);

  // Requests without Origin are not browser CORS requests. Authentication and
  // authorization still need to be enforced by each function independently.
  if (!origin) {
    return true;
  }

  const allowedOrigins = configuredOrigins();

  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  // Fail closed for deployed origins when FRONTEND_URLS has not been set,
  // while keeping standard local Nuxt development usable.
  return LOCAL_DEVELOPMENT_ORIGINS.has(origin);
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = normalizedOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && isBrowserOriginAllowed(req)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
    },
  });
}

export function errorResponse(
  req: Request,
  code: string,
  message: string,
  status: number,
): Response {
  return jsonResponse(req, { code, message } satisfies ErrorPayload, status);
}

export function optionsResponse(req: Request): Response {
  if (!isBrowserOriginAllowed(req)) {
    return new Response(null, {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Vary": "Origin",
      },
    });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}
