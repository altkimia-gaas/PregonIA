-- PregonIA · esquema de la base de datos (etapa 2, piloto)
-- Se ejecuta completo en Supabase › SQL Editor. Es idempotente: se puede volver a correr sin perder datos.
-- Seguridad: cada usuario ve solo los datos de su municipio (Row Level Security). La lectura programada de medios
-- usa la clave secreta del servidor, que salta estas reglas, y nunca llega al navegador.


-- Catálogo de medios (se carga desde data/catalogo_medios.csv con supabase/semilla.sql)
create table if not exists medios (
  id          int primary key,
  nombre      text not null,
  ambito      text not null check (ambito in ('nacional', 'regional', 'local')),
  provincia   text,
  comunas     text,
  tipo        text,
  nivel       text,
  metodo      text,
  url_lectura text,
  estado      text,
  observacion text
);

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
