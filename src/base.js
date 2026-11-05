const CATALOG = /*CATALOG*/;
const MED = Object.fromEntries(CATALOG.map(m => [m.id, m]));
const COMUNAS = ["Casablanca","San Antonio","Cartagena","El Quisco","El Tabo","Algarrobo"];
const PLANES = {
  comunal:{nombre:"Comunal", temas:5, usuarios:3, menciones:1500, borradores:4, precio:149000},
  regional:{nombre:"Regional o Político", temas:10, usuarios:5, menciones:4000, borradores:12, precio:249000}
};
const PESO = {A:3, B:2, C:1};
const DAY = 864e5, NOW = Date.now();
const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n).toLocaleString("es-CL");
const clp = n => "$" + fmt(n);
