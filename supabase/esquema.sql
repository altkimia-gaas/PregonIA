-- PregonIA · esquema de la base de datos (etapa 2, piloto)
-- Se ejecuta completo en Supabase › SQL Editor. Es idempotente: se puede volver a correr sin perder datos.
-- Seguridad: cada usuario ve solo los datos de su municipio (Row Level Security). La lectura programada de medios
-- usa la clave secreta del servidor, que salta estas reglas, y nunca llega al navegador.


-- Catálogo de medios (se carga desde data/catalogo_medios.csv con supabase/semilla.sql)
create table if not exists medios (
  id          int primary key,
  nombre      text not null,
  ambito      text not null check (ambito in ('nacional', 'regional', 'local', 'institucional')),
  provincia   text,
  comunas     text,
  tipo        text,
  nivel       text,
  metodo      text,
  url_lectura text,
  estado      text,
  observacion text
);
-- Fuentes institucionales (nov 2026): en bases creadas antes, ampliar el ámbito permitido.
alter table medios drop constraint if exists medios_ambito_check;
alter table medios add constraint medios_ambito_check check (ambito in ('nacional', 'regional', 'local', 'institucional'));

-- Cuentas de Facebook e Instagram de medios (nov 2026): las inscribe un editor desde la aplicación y quedan en el catálogo,
-- compartidas por todos los municipios. La lectura programada las lee por la API de Meta y anota cuándo y si falló.
-- Nunca se borran (sus notas las referencian): al retirarlas quedan con estado 'retirado' y dejan de leerse.
alter table medios add column if not exists usuario_red    text;
alter table medios add column if not exists inscrito_muni  uuid;
alter table medios add column if not exists inscrito_por   uuid references auth.users (id) on delete set null;
alter table medios add column if not exists inscrito       timestamptz;
alter table medios add column if not exists ultima_lectura timestamptz;
alter table medios add column if not exists error_lectura  text;
create unique index if not exists medios_cuenta_red on medios (metodo, lower(usuario_red)) where usuario_red is not null and estado <> 'retirado';
create sequence if not exists medios_redes_id start 10000;

-- Municipios clientes. config guarda la caracterización y los temas tal como los usa la aplicación.
create table if not exists municipios (
  id      uuid primary key default gen_random_uuid(),
  comuna  text not null unique,
  nombre  text not null,
  plan    text not null default 'comunal' check (plan in ('comunal', 'regional')),
  activo  boolean not null default true,
  config  jsonb,
  creado  timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

-- Usuarios: el registro en auth.users lo crea Supabase (invitación por correo); aquí se asigna municipio y rol.
create table if not exists perfiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  municipio_id uuid not null references municipios (id) on delete cascade,
  nombre       text,
  rol          text not null default 'lector' check (rol in ('admin', 'comunicaciones', 'alcalde', 'directivo', 'lector')),
  creado       timestamptz not null default now()
);

-- Una fila por publicación (enlace). Es compartida: la misma nota puede ser mención de varias comunas.
-- No se guarda el texto del medio: solo titular, enlace, medio y fecha.
create table if not exists notas (
  id        text primary key,           -- huella del enlace
  medio_id  int references medios (id),
  url       text not null unique,
  titulo    text not null,
  publicado timestamptz not null,
  leido     timestamptz not null default now(),
  via       text not null default 'lectura' check (via in ('lectura', 'google_news'))
);
create index if not exists notas_publicado on notas (publicado desc);

-- La nota vista desde un municipio: si de verdad trata de la comuna, tono, resumen propio, palabras clave y hecho al que pertenece.
create table if not exists menciones (
  nota_id      text not null references notas (id) on delete cascade,
  municipio_id uuid not null references municipios (id) on delete cascade,
  rel          boolean not null default true,
  tono         text check (tono in ('cri', 'neu', 'pos')),
  resumen      text,
  palabras     text,
  grupo        text,
  ia           boolean not null default false,
  clasificado  timestamptz not null default now(),
  primary key (nota_id, municipio_id)
);
create index if not exists menciones_muni on menciones (municipio_id, clasificado desc);
create index if not exists menciones_grupo on menciones (municipio_id, grupo);

-- Publicaciones de Facebook u otras redes ingresadas a mano (captura asistida).
create table if not exists capturas (
  id           text primary key,
  municipio_id uuid not null references municipios (id) on delete cascade,
  medio_id     int references medios (id),
  medio_nombre text not null,
  medio_ambito text not null default 'local' check (medio_ambito in ('nacional', 'regional', 'local')),
  url          text,
  titulo       text not null,
  resumen      text,
  palabras     text,
  tono         text check (tono in ('cri', 'neu', 'pos')),
  grupo        text,
  publicado    timestamptz not null,
  indice       text,                       -- palabras normalizadas para asignar tema; no es el texto del post
  autor        uuid references auth.users (id) on delete set null default auth.uid(),
  creado       timestamptz not null default now()
);
create index if not exists capturas_muni on capturas (municipio_id, publicado desc);

-- Marcas del equipo sobre un hecho: "no corresponde" (falso positivo) o "respondida".
create table if not exists marcas (
  municipio_id uuid not null references municipios (id) on delete cascade,
  grupo        text not null,
  tipo         text not null check (tipo in ('no_corresponde', 'respondida')),
  autor        uuid references auth.users (id) on delete set null default auth.uid(),
  creado       timestamptz not null default now(),
  primary key (municipio_id, grupo, tipo)
);

-- Respuestas aprobadas (comunicados, declaraciones, cartas).
create table if not exists comunicados (
  id           uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references municipios (id) on delete cascade,
  grupo        text,
  pieza        text not null,
  origen       text,
  texto        text not null,
  autor        uuid references auth.users (id) on delete set null default auth.uid(),
  creado       timestamptz not null default now()
);
create index if not exists comunicados_muni on comunicados (municipio_id, creado desc);

-- Notas que llegan de cuentas de Instagram o Facebook (bases creadas antes: ampliar el origen permitido).
alter table notas drop constraint if exists notas_via_check;
alter table notas add constraint notas_via_check check (via in ('lectura', 'google_news', 'instagram', 'facebook'));

-- Registro de cada lectura programada de medios.
create table if not exists lecturas (
  id            bigint generated always as identity primary key,
  inicio        timestamptz not null default now(),
  fin           timestamptz,
  fuentes_ok    int,
  fuentes_total int,
  errores       text[],
  candidatas    int,
  nuevas        int,
  clasificadas  int,
  detalle       jsonb
);

-- Registro de actividad: quién hizo qué y cuándo.
create table if not exists actividad (
  id           bigint generated always as identity primary key,
  municipio_id uuid references municipios (id) on delete cascade,
  usuario      uuid references auth.users (id) on delete set null default auth.uid(),
  accion       text not null,
  detalle      jsonb,
  creado       timestamptz not null default now()
);
create index if not exists actividad_muni on actividad (municipio_id, creado desc);

-- Ayudantes para las reglas: municipio y rol del usuario conectado.
create or replace function mi_municipio() returns uuid language sql stable security definer set search_path = public as
$$ select municipio_id from perfiles where id = auth.uid() $$;
create or replace function mi_rol() returns text language sql stable security definer set search_path = public as
$$ select rol from perfiles where id = auth.uid() $$;
create or replace function puedo_editar() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select rol in ('admin', 'comunicaciones') from perfiles where id = auth.uid()), false) $$;

-- Row Level Security
alter table medios      enable row level security;
alter table municipios  enable row level security;
alter table perfiles    enable row level security;
alter table notas       enable row level security;
alter table menciones   enable row level security;
alter table capturas    enable row level security;
alter table marcas      enable row level security;
alter table comunicados enable row level security;
alter table lecturas    enable row level security;
alter table actividad   enable row level security;

drop policy if exists medios_leer on medios;
create policy medios_leer on medios for select to authenticated using (true);

drop policy if exists municipios_leer on municipios;
create policy municipios_leer on municipios for select to authenticated using (id = mi_municipio());
drop policy if exists municipios_config on municipios;
create policy municipios_config on municipios for update to authenticated using (id = mi_municipio() and puedo_editar()) with check (id = mi_municipio());

drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles for select to authenticated using (municipio_id = mi_municipio());
drop policy if exists perfiles_admin on perfiles;
create policy perfiles_admin on perfiles for update to authenticated using (municipio_id = mi_municipio() and mi_rol() = 'admin') with check (municipio_id = mi_municipio());

drop policy if exists notas_leer on notas;
create policy notas_leer on notas for select to authenticated
  using (exists (select 1 from menciones m where m.nota_id = notas.id and m.municipio_id = mi_municipio()));

drop policy if exists menciones_leer on menciones;
create policy menciones_leer on menciones for select to authenticated using (municipio_id = mi_municipio());

drop policy if exists capturas_leer on capturas;
create policy capturas_leer on capturas for select to authenticated using (municipio_id = mi_municipio());
drop policy if exists capturas_crear on capturas;
create policy capturas_crear on capturas for insert to authenticated with check (municipio_id = mi_municipio() and puedo_editar());
drop policy if exists capturas_borrar on capturas;
create policy capturas_borrar on capturas for delete to authenticated using (municipio_id = mi_municipio() and puedo_editar());

drop policy if exists marcas_leer on marcas;
create policy marcas_leer on marcas for select to authenticated using (municipio_id = mi_municipio());
drop policy if exists marcas_crear on marcas;
create policy marcas_crear on marcas for insert to authenticated with check (municipio_id = mi_municipio() and puedo_editar());
drop policy if exists marcas_borrar on marcas;
create policy marcas_borrar on marcas for delete to authenticated using (municipio_id = mi_municipio() and puedo_editar());

drop policy if exists comunicados_leer on comunicados;
create policy comunicados_leer on comunicados for select to authenticated using (municipio_id = mi_municipio());
drop policy if exists comunicados_crear on comunicados;
create policy comunicados_crear on comunicados for insert to authenticated with check (municipio_id = mi_municipio() and puedo_editar());

drop policy if exists lecturas_leer on lecturas;
create policy lecturas_leer on lecturas for select to authenticated using (true);

drop policy if exists actividad_leer on actividad;
create policy actividad_leer on actividad for select to authenticated using (municipio_id = mi_municipio());
drop policy if exists actividad_crear on actividad;
create policy actividad_crear on actividad for insert to authenticated with check (municipio_id = mi_municipio() and usuario = auth.uid());

-- Inscribir y retirar cuentas de redes: solo administradores y comunicaciones, por funciones que validan todo en la base.
-- Si la cuenta ya está inscrita (por cualquier municipio) devuelve la existente en vez de duplicarla.
create or replace function inscribir_red(p_red text, p_usuario text, p_nombre text, p_ambito text, p_comunas text)
returns medios language plpgsql security definer set search_path = public as $$
declare fila medios; u text := trim(p_usuario);
begin
  if not puedo_editar() then raise exception 'Solo administración y comunicaciones pueden inscribir cuentas'; end if;
  if p_red not in ('instagram', 'facebook') then raise exception 'Red no válida'; end if;
  if p_ambito not in ('nacional', 'regional', 'local') then raise exception 'Alcance no válido'; end if;
  if (p_red = 'instagram' and u !~ '^[A-Za-z0-9._]{1,30}$') or (p_red = 'facebook' and u !~ '^[A-Za-z0-9.-]{5,80}$') then raise exception 'Usuario no válido'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 2 then raise exception 'Falta el nombre del medio'; end if;
  if p_red = 'instagram' then u := lower(u); end if;
  select * into fila from medios where metodo = p_red and lower(usuario_red) = lower(u) and estado <> 'retirado';
  if found then return fila; end if;
  insert into medios (id, nombre, ambito, comunas, tipo, nivel, metodo, url_lectura, estado, observacion, usuario_red, inscrito_muni, inscrito_por, inscrito)
  values (nextval('medios_redes_id'), left(trim(p_nombre), 120), p_ambito, nullif(left(trim(coalesce(p_comunas, '')), 600), ''),
    case p_red when 'instagram' then 'Instagram' else 'Facebook' end, 'C', p_red,
    case when p_red = 'instagram' then 'https://www.instagram.com/' || u || '/'
         when u ~ '^[0-9]+$' then 'https://www.facebook.com/profile.php?id=' || u else 'https://www.facebook.com/' || u end,
    'inscrita', 'Inscrita desde la aplicación', u, mi_municipio(), auth.uid(), now())
  returning * into fila;
  insert into actividad (municipio_id, usuario, accion, detalle) values (mi_municipio(), auth.uid(), 'medios.inscribir', jsonb_build_object('id', fila.id, 'red', p_red, 'usuario', u, 'nombre', fila.nombre));
  return fila;
end $$;
create or replace function retirar_red(p_id int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not puedo_editar() then raise exception 'Solo administración y comunicaciones pueden retirar cuentas'; end if;
  update medios set estado = 'retirado' where id = p_id and inscrito_muni = mi_municipio() and estado <> 'retirado';
  if not found then raise exception 'Solo se pueden retirar cuentas que inscribió este municipio'; end if;
  insert into actividad (municipio_id, usuario, accion, detalle) values (mi_municipio(), auth.uid(), 'medios.retirar', jsonb_build_object('id', p_id));
end $$;
revoke execute on function inscribir_red(text, text, text, text, text) from public;
revoke execute on function retirar_red(int) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function inscribir_red(text, text, text, text, text) from anon';
    execute 'revoke execute on function retirar_red(int) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function inscribir_red(text, text, text, text, text) to authenticated';
    execute 'grant execute on function retirar_red(int) to authenticated';
  end if;
end $$;

-- Municipios del piloto (litoral central). La configuración la completa la aplicación la primera vez que entra un editor.
insert into municipios (comuna, nombre) values
  ('Casablanca', 'Municipalidad de Casablanca'),
  ('San Antonio', 'Municipalidad de San Antonio'),
  ('Cartagena', 'Municipalidad de Cartagena'),
  ('El Quisco', 'Municipalidad de El Quisco'),
  ('El Tabo', 'Municipalidad de El Tabo'),
  ('Algarrobo', 'Municipalidad de Algarrobo')
on conflict (comuna) do nothing;

-- Registro automático de actividad (no depende de la aplicación): quién marcó, aprobó, agregó o cambió la configuración.
create or replace function registrar_actividad() returns trigger language plpgsql security definer set search_path = public as $$
declare fila jsonb; muni uuid; detalle jsonb;
begin
  fila := to_jsonb(coalesce(new, old));
  muni := coalesce((fila ->> 'municipio_id')::uuid, case when tg_table_name = 'municipios' then (fila ->> 'id')::uuid end);
  detalle := case tg_table_name
    when 'marcas' then jsonb_build_object('grupo', fila ->> 'grupo', 'tipo', fila ->> 'tipo')
    when 'comunicados' then jsonb_build_object('grupo', fila ->> 'grupo', 'pieza', fila ->> 'pieza', 'origen', fila ->> 'origen')
    when 'capturas' then jsonb_build_object('id', fila ->> 'id', 'medio', fila ->> 'medio_nombre', 'titulo', fila ->> 'titulo', 'url', fila ->> 'url')
    else jsonb_build_object('cambio', 'configuración de temas') end;
  insert into actividad (municipio_id, usuario, accion, detalle) values (muni, auth.uid(), tg_table_name || '.' || lower(tg_op), detalle);
  return coalesce(new, old);
end $$;
drop trigger if exists act_marcas on marcas;
create trigger act_marcas after insert or delete on marcas for each row execute function registrar_actividad();
drop trigger if exists act_comunicados on comunicados;
create trigger act_comunicados after insert on comunicados for each row execute function registrar_actividad();
drop trigger if exists act_capturas on capturas;
create trigger act_capturas after insert or delete on capturas for each row execute function registrar_actividad();
drop trigger if exists act_config on municipios;
create trigger act_config after update of config on municipios for each row when (old.config is distinct from new.config) execute function registrar_actividad();

-- Avisos (alertas): lo que la lectura programada detectó, las preferencias de cada persona y sus celulares suscritos.
-- Una fila por aviso emitido; la clave (hecho + regla + nivel) evita avisar dos veces lo mismo.
create table if not exists alertas (
  id           bigserial primary key,
  municipio_id uuid not null references municipios (id) on delete cascade,
  clave        text not null,
  grupo        text not null,
  tipo         text not null check (tipo in ('critica', 'escala', 'rafaga', 'positiva')),
  nivel        text not null check (nivel in ('urgente', 'importante', 'info')),
  titulo       text not null,
  titular      text,
  medio        text,
  url          text,
  creada       timestamptz not null default now(),
  unique (municipio_id, clave)
);
create index if not exists alertas_muni_creada on alertas (municipio_id, creada desc);
-- Qué quiere recibir cada persona: nivel mínimo, silencio nocturno (23:00 a 7:00, salvo lo urgente) y si también por correo.
create table if not exists avisos (
  usuario      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  municipio_id uuid not null references municipios (id) on delete cascade,
  nivel        text not null default 'importante' check (nivel in ('urgente', 'importante', 'todo', 'nada')),
  silencio     boolean not null default true,
  correo       boolean not null default true,
  actualizado  timestamptz not null default now()
);
-- Celulares y computadores suscritos a notificaciones (Web Push). Las llaves son del navegador, no secretos del municipio.
create table if not exists suscripciones (
  endpoint     text primary key,
  usuario      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  municipio_id uuid not null references municipios (id) on delete cascade,
  p256dh       text not null,
  auth         text not null,
  dispositivo  text,
  creada       timestamptz not null default now()
);
alter table alertas       enable row level security;
alter table avisos        enable row level security;
alter table suscripciones enable row level security;
drop policy if exists alertas_leer on alertas;
create policy alertas_leer on alertas for select to authenticated using (municipio_id = mi_municipio());
drop policy if exists avisos_propios on avisos;
create policy avisos_propios on avisos for all to authenticated using (usuario = auth.uid()) with check (usuario = auth.uid() and municipio_id = mi_municipio());
drop policy if exists suscripciones_propias on suscripciones;
create policy suscripciones_propias on suscripciones for all to authenticated using (usuario = auth.uid()) with check (usuario = auth.uid() and municipio_id = mi_municipio());
-- Destinatarios de un municipio con su correo y preferencias. Solo la usa el servidor (lectura programada).
-- Sin preferencia guardada: el alcalde y los directivos reciben solo lo urgente; el resto, lo crítico.
create or replace function destinatarios_avisos(muni uuid)
returns table (usuario uuid, correo text, nivel text, silencio boolean, por_correo boolean)
language sql stable security definer set search_path = public, auth as $$
  select p.id, u.email::text,
         coalesce(a.nivel, case when p.rol in ('alcalde', 'directivo') then 'urgente' else 'importante' end),
         coalesce(a.silencio, true), coalesce(a.correo, true)
  from perfiles p join auth.users u on u.id = p.id left join avisos a on a.usuario = p.id
  where p.municipio_id = muni
    -- Segundo resguardo, además de los permisos: nunca responde a una sesión de usuario ni a una visita anónima.
    and auth.uid() is null
    and coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'anon' $$;
revoke execute on function destinatarios_avisos(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke execute on function destinatarios_avisos(uuid) from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke execute on function destinatarios_avisos(uuid) from authenticated'; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function destinatarios_avisos(uuid) to service_role'; end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cumplimiento (Ley 19.628 reformada por Ley 21.719): registro de aceptación de
-- Términos y Política de privacidad. Quién aceptó, qué versión y cuándo.
-- Las filas no se editan ni se borran desde la aplicación: solo se agregan con
-- aceptar_documentos(), que toma el usuario de la sesión (no del navegador).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists aceptaciones (
  id           bigint generated always as identity primary key,
  usuario      uuid not null references auth.users (id) on delete cascade,
  municipio_id uuid references municipios (id) on delete set null,
  documento    text not null check (documento in ('terminos', 'privacidad')),
  version      text not null,
  aceptado_en  timestamptz not null default now(),
  agente       text
);
create index if not exists aceptaciones_usuario on aceptaciones (usuario, version);
alter table aceptaciones enable row level security;
drop policy if exists aceptaciones_leer on aceptaciones;
create policy aceptaciones_leer on aceptaciones for select to authenticated
  using (usuario = auth.uid() or (municipio_id = mi_municipio() and mi_rol() = 'admin'));

create or replace function aceptar_documentos(p_version text, p_agente text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Se requiere una sesión iniciada'; end if;
  if coalesce(trim(p_version), '') = '' then raise exception 'Falta la versión de los documentos'; end if;
  insert into aceptaciones (usuario, municipio_id, documento, version, agente)
  select auth.uid(), mi_municipio(), d, left(trim(p_version), 20), left(p_agente, 300)
  from unnest(array['terminos', 'privacidad']) as d;
end $$;
revoke execute on function aceptar_documentos(text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke execute on function aceptar_documentos(text, text) from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'grant execute on function aceptar_documentos(text, text) to authenticated'; end if;
end $$;
