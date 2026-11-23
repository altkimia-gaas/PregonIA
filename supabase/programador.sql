-- Programador de la lectura de medios (Supabase pg_cron + pg_net). Se ejecuta después de esquema.sql.
-- Cada 30 minutos (minutos 7 y 37) genera un pase de un solo uso y llama a /api/ingesta con él en la cabecera X-Disparo.
-- La función de Vercel lo valida y lo borra con la clave de servicio que ya tiene: ningún secreto nuevo que copiar.
-- Reemplaza al cron de GitHub Actions, que GitHub posterga horas en este repositorio.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.disparos_lectura (
  token  text primary key,
  creado timestamptz not null default now()
);
alter table public.disparos_lectura enable row level security;  -- sin políticas: solo la clave de servicio la lee
revoke all on public.disparos_lectura from anon, authenticated;

-- Un turno por región (src/regiones.js): la misma función de Vercel con ?region=. Turnos desfasados 10 minutos
-- (Valparaíso a los 7 y 37; Antofagasta a los 17 y 47) para que no compitan por Google News ni por la base.
-- Una región se programa solo cuando está activa en src/regiones.js y su catálogo y nómina están cargados.
drop function if exists public.lanzar_lectura_medios();
create or replace function public.lanzar_lectura_medios(region text default 'V')
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  pase text := encode(extensions.gen_random_bytes(24), 'hex');
  id_solicitud bigint;
begin
  if region !~ '^[A-Z]{1,4}$' then raise exception 'región no válida: %', region; end if;
  delete from public.disparos_lectura where creado < now() - interval '1 hour';
  insert into public.disparos_lectura (token) values (pase);
  select net.http_get(
    url := 'https://pregonia.vercel.app/api/ingesta?region=' || region,
    headers := jsonb_build_object('X-Disparo', pase),
    timeout_milliseconds := 90000
  ) into id_solicitud;
  return id_solicitud;
end;
$$;
revoke all on function public.lanzar_lectura_medios(text) from public, anon, authenticated;

-- Región de Valparaíso (V).
select cron.unschedule(jobid) from cron.job where jobname = 'pregonia-lectura-medios';
select cron.schedule('pregonia-lectura-medios', '7,37 * * * *', $$select public.lanzar_lectura_medios('V')$$);
-- Región de Antofagasta (II), abierta el 23 nov 2026.
select cron.unschedule(jobid) from cron.job where jobname = 'pregonia-lectura-II';
select cron.schedule('pregonia-lectura-II', '17,47 * * * *', $$select public.lanzar_lectura_medios('II')$$);
