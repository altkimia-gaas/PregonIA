-- Dar acceso a una persona (se ejecuta en Supabase › SQL Editor).
-- 1. Primero invítela en Authentication › Users › Invite user, con su correo. Le llegará un enlace para crear su contraseña.
-- 2. Luego use el bloque A (municipio) o el bloque B (autoridad): cambie los datos de ejemplo y ejecute solo ese bloque.
--    Roles: admin (todo, incluida la gestión de usuarios), comunicaciones (edita temas, marca, aprueba y agrega publicaciones),
--           alcalde o autoridad (la persona titular), directivo y lector (solo lectura).


-- A. Equipo de un municipio. Cambie el correo, la comuna, el nombre y el rol.
insert into perfiles (id, municipio_id, nombre, rol)
select u.id, m.id, 'Nombre Apellido', 'admin'
from auth.users u, municipios m
where u.email = 'correo@ejemplo.cl' and m.tipo = 'municipio' and m.comuna = 'Casablanca'
on conflict (id) do update set municipio_id = excluded.municipio_id, nombre = excluded.nombre, rol = excluded.rol;


-- B. Equipo de una autoridad (diputado, senador, core, concejal, gobernador, delegado).
-- B1. Cree la cuenta de la autoridad, una sola vez. Si ya existe, no hace nada.
--     tipo: diputado, senador, core, concejal, gobernador o delegado.
--     zona: distrito (D6, D7); circunscripción (C6); circunscripción provincial del consejo regional (V1N, V2S, MM, QUI, SA, SF, LA, PET, IP);
--           comuna del concejal (por ejemplo Casablanca); REG para el gobernador y el delegado regional; MM, QUI, SA, SF, LA, PET o IP para un delegado provincial.
--     id: el de la nómina de PregonIA si la persona está en ella (src/autoridades.js, por ejemplo "dip-nombre-apellido"); si no, null.
--     nombre: como la nombra la prensa (nombre y apellido). g: "F" o "M".
insert into municipios (tipo, nombre, autoridad)
values ('diputado', 'Diputada Nombre Apellido', '{"id": null, "zona": "D7", "nombre": "Nombre Apellido", "g": "F", "partido": ""}')
on conflict do nothing;

-- B2. Asigne la persona a esa cuenta. Cambie el correo, el tipo, el nombre de la autoridad, el nombre de la persona y el rol.
insert into perfiles (id, municipio_id, nombre, rol)
select u.id, m.id, 'Nombre Apellido', 'comunicaciones'
from auth.users u, municipios m
where u.email = 'correo@ejemplo.cl' and m.tipo = 'diputado' and lower(m.autoridad ->> 'nombre') = lower('Nombre Apellido')
on conflict (id) do update set municipio_id = excluded.municipio_id, nombre = excluded.nombre, rol = excluded.rol;

-- C. Editor de Redacción (cuentas propias de PregonIA en Facebook e Instagram, página /redaccion).
-- La persona debe existir antes en Authentication › Users (invitación por correo). No necesita municipio ni rol:
-- un editor no ve datos de clientes y los clientes no ven Redacción.
-- insert into editores (usuario, nombre) select id, 'Nombre Apellido' from auth.users where email = 'correo@dominio.cl' on conflict (usuario) do nothing;
