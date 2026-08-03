const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return Response.json(
        {
          ok: false,
          message: "Method not allowed.",
        },
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    return Response.json(
      {
        ok: true,
        service: "SNCBT Assess Backend",
        environment: "hosted-supabase",
        message: "The Supabase Edge Function is running.",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  },
};