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

create or replace function public.lanzar_lectura_medios()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  pase text := encode(extensions.gen_random_bytes(24), 'hex');
  id_solicitud bigint;
begin
  delete from public.disparos_lectura where creado < now() - interval '1 hour';
  insert into public.disparos_lectura (token) values (pase);
  select net.http_get(
    url := 'https://pregonia.vercel.app/api/ingesta',
    headers := jsonb_build_object('X-Disparo', pase),
    timeout_milliseconds := 90000
  ) into id_solicitud;
  return id_solicitud;
end;
$$;
revoke all on function public.lanzar_lectura_medios() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'pregonia-lectura-medios';
select cron.schedule('pregonia-lectura-medios', '7,37 * * * *', 'select public.lanzar_lectura_medios()');
