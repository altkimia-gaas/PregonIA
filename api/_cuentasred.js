// Generado por scripts/build.py desde src/cuentasred.js. No editar a mano.
/* Cuentas de Facebook e Instagram: usuario a partir de un enlace o @usuario, y enlace a partir del usuario.
   Lo usan la aplicación (inscripción) y el servidor (lectura): scripts/build.py copia este archivo a api/_cuentasred.js. */
/* Usuario de la cuenta a partir de un enlace, un @usuario o el usuario solo. Facebook acepta además profile.php?id=número. */
function usuarioDe(red, entrada){
  let s = String(entrada || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || /^(www\.|m\.)?(facebook|instagram|fb)\.com\//i.test(s)) {
    let u; try { u = new URL(/^https?:/i.test(s) ? s : "https://" + s); } catch { return null; }
    const h = u.hostname.replace(/^(www|m|web|business)\./, "");
    if (red === "instagram" && h !== "instagram.com") return null;
    if (red === "facebook" && !["facebook.com", "fb.com"].includes(h)) return null;
    const partes = u.pathname.split("/").filter(Boolean);
    if (red === "facebook" && partes[0] === "profile.php") return /^\d{5,20}$/.test(u.searchParams.get("id") || "") ? u.searchParams.get("id") : null;
    if (red === "facebook" && partes[0] === "people" && /^\d{5,20}$/.test(partes[2] || "")) return partes[2];
    if (red === "facebook" && partes[0] === "pages" && /^\d{5,20}$/.test(partes[partes.length - 1] || "")) return partes[partes.length - 1];
    s = partes[0] || "";
  }
  s = s.replace(/^@/, "");
  if (red === "instagram") return /^(?!.*\.\.)[A-Za-z0-9._]{1,30}$/.test(s) && !/^(p|reel|reels|stories|explore|accounts)$/i.test(s) ? s.toLowerCase() : null;
  return /^[A-Za-z0-9.\-]{5,80}$/.test(s) && !/^(groups|events|watch|share|story\.php|permalink\.php|photo|photos|reel)$/i.test(s) ? s : null;
}
const urlDe = (red, u) => red === "instagram" ? `https://www.instagram.com/${u}/` : /^\d+$/.test(u) ? `https://www.facebook.com/profile.php?id=${u}` : `https://www.facebook.com/${u}`;

export { usuarioDe, urlDe };
