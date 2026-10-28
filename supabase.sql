-- =====================================================
--  Lista de acompañantes — tabla para Supabase
--  Pegalo en: Supabase → SQL Editor → New query → Run
-- =====================================================

create table if not exists public.turnos (
  id          uuid primary key default gen_random_uuid(),
  semana      date    not null,                      -- lunes de la semana (YYYY-MM-DD)
  dia         smallint not null check (dia between 0 and 6), -- 0 = lunes ... 6 = domingo
  hora        text    not null,                      -- "08:00"
  nombre      text    not null check (char_length(nombre) between 1 and 40),
  telefono    text    check (telefono is null or char_length(telefono) <= 25),
  dispositivo text    not null,                      -- id anónimo del celular (para poder quitarse)
  created_at  timestamptz not null default now()
);

-- Un mismo dispositivo no puede anotarse dos veces en el mismo horario.
create unique index if not exists turnos_unico
  on public.turnos (semana, dia, hora, dispositivo);

create index if not exists turnos_semana_idx on public.turnos (semana);

-- Seguridad a nivel de fila
alter table public.turnos enable row level security;

drop policy if exists "leer turnos"   on public.turnos;
drop policy if exists "crear turnos"  on public.turnos;
drop policy if exists "borrar turnos" on public.turnos;

create policy "leer turnos"   on public.turnos for select to anon using (true);
create policy "crear turnos"  on public.turnos for insert to anon with check (true);
create policy "borrar turnos" on public.turnos for delete to anon using (true);

-- (Opcional) Limpiar automáticamente turnos de más de 8 semanas.
-- Descomentá si no querés guardar historial:
-- delete from public.turnos where semana < (current_date - interval '56 days');
