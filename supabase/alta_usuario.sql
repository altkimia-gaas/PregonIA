-- Dar acceso a una persona (se ejecuta en Supabase › SQL Editor).
-- 1. Primero invítela en Authentication › Users › Invite user, con su correo. Le llegará un enlace para crear su contraseña.
-- 2. Luego cambie el correo, la comuna, el nombre y el rol de abajo y ejecute.
--    Roles: admin (todo, incluida la gestión de usuarios), comunicaciones (edita temas, marca, aprueba y agrega publicaciones),
--           alcalde, directivo y lector (solo lectura).
insert into perfiles (id, municipio_id, nombre, rol)
select u.id, m.id, 'Nombre Apellido', 'admin'
from auth.users u, municipios m
where u.email = 'correo@ejemplo.cl' and m.comuna = 'Casablanca'
on conflict (id) do update set municipio_id = excluded.municipio_id, nombre = excluded.nombre, rol = excluded.rol;
