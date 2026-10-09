export default {
  async fetch(request) {
    try {
      
      // const ALLOWED_ORIGIN = "*";
      const API_URL = "https://app02.centraloftalmica.com.br/rest/app/contact/01052901";
      const ALLOWED_ORIGIN = "https://jessealvessilva.github.io";
	  
	  // NOVO: Credenciais do Protheus (Basic Auth)
    const PROTHEUS_USER = "jesse";
    const PROTHEUS_PASS = "@Phoft0515";

      const corsHeaders = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      const body = await request.json();
      const { pedido, documento } = body;

      const url = new URL(API_URL);
      url.searchParams.set("pedido", pedido);
      url.searchParams.set("documento", documento);

      const credentials = btoa(`${PROTHEUS_USER}:${PROTHEUS_PASS}`);

      const resp = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Accept": "application/json",
        },
      });

      const response = new Response(resp.body, resp);
      response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return response;

    } catch (err) {
      return new Response(JSON.stringify({
        erro: err.message,
        stack: err.stack
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
