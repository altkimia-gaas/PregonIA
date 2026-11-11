// Respaldo de /compartir: si el service worker aún no estaba activo, el celular envía aquí lo compartido.
// No se guarda nada en el servidor: se vuelve a la aplicación y se pide compartir de nuevo.
const volver = () => new Response(null, { status: 303, headers: { location: "/?compartir=reintentar#menciones", "cache-control": "no-store" } });
export const GET = volver, POST = volver;
