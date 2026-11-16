-- =============================================================
-- Agenda: agendamentos de clientes exibidos na grade semanal.
-- Data e hora são locais da oficina (sem fuso), como na agenda de papel.
-- O app ainda não tem login: o papel `anon` (chave pública) lê e grava.
-- =============================================================

create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  client_name       text not null check (char_length(btrim(client_name)) between 1 and 120),
  client_id         uuid references public.clients (id) on delete set null,
  scheduled_date    date not null,
  start_time        time not null,
  duration_minutes  smallint not null default 60
                      check (duration_minutes between 15 and 600 and duration_minutes % 15 = 0),
  motorcycle_model  text check (char_length(motorcycle_model) <= 80),
  service           text check (char_length(service) <= 100),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.appointments is 'Agendamentos de clientes (agenda semanal).';
comment on column public.appointments.client_name is 'Nome do cliente digitado (pode não ter cadastro).';
comment on column public.appointments.client_id is 'Cliente cadastrado, quando escolhido pela sugestão.';
comment on column public.appointments.scheduled_date is 'Dia do agendamento (data local).';
comment on column public.appointments.start_time is 'Hora de início (hora local).';
comment on column public.appointments.duration_minutes is 'Duração prevista em minutos (múltiplo de 15).';
comment on column public.appointments.motorcycle_model is 'Modelo da moto (texto livre).';
comment on column public.appointments.service is 'Serviço previsto (texto livre).';

create index appointments_date_idx on public.appointments (scheduled_date, start_time);
create index appointments_client_id_idx on public.appointments (client_id);

create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- Permissões e RLS
-- -------------------------------------------------------------
revoke all on public.appointments from anon, authenticated;
grant select, insert, update, delete on public.appointments to anon, authenticated;

alter table public.appointments enable row level security;

create policy "appointments: todos acessam" on public.appointments for all
  to anon, authenticated using (true) with check (true);
