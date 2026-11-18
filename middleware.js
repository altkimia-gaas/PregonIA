// www.pregonia.cl muestra la página del servicio; pregonia.cl (y pregonia.vercel.app) la app.
// Va en middleware porque las reglas de vercel.json no pueden reemplazar un archivo existente (index.html en «/»).
export const config = { matcher: "/" };

export default function middleware(request) {
  const host = (request.headers.get("host") || "").toLowerCase();
  if (host === "www.pregonia.cl") {
    return new Response(null, { headers: { "x-middleware-rewrite": new URL("/servicio.html", request.url).toString() } });
  }
}
