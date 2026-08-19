export interface ErrorPayload {
  code: string;
  message: string;
}

function configuredOrigins(): string[] {
  return (Deno.env.get("FRONTEND_URLS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigins = configuredOrigins();

  // Local development remains usable when FRONTEND_URLS has not been set.
  // Production should set FRONTEND_URLS to the deployed Nuxt origin(s).
  const allowOrigin = allowedOrigins.length === 0
    ? "*"
    : allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] ?? "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
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
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}
