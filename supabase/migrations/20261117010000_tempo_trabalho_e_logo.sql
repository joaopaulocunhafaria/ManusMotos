-- =============================================================
-- 1. Tempo de trabalho da OS (uso interno da oficina)
--    - estimated_time (já existia) continua sendo a previsão de entrega enviada ao cliente;
--    - work_estimate_minutes: quanto tempo de mão de obra ativa o mecânico estima gastar;
--    - work_seconds + work_started_at: cronômetro com play/pause. O tempo gasto é
--      work_seconds + (now() - work_started_at) enquanto estiver rodando.
--    O relógio é sempre o do banco (now()), nunca o do aparelho.
-- 2. Logo e Instagram da oficina (cabeçalho da OS enviada ao cliente).
-- =============================================================

alter table public.service_orders
  add column work_estimate_minutes integer check (work_estimate_minutes between 1 and 6000),
  add column work_seconds integer not null default 0 check (work_seconds between 0 and 3600000),
  add column work_started_at timestamptz;

comment on column public.service_orders.estimated_time is 'Previsão de entrega informada ao cliente (texto livre, ex.: "amanhã à tarde").';
comment on column public.service_orders.work_estimate_minutes is 'Estimativa interna de trabalho ativo, em minutos (não vai para o cliente).';
comment on column public.service_orders.work_seconds is 'Tempo de trabalho já acumulado (cronômetro pausado), em segundos.';
comment on column public.service_orders.work_started_at is 'Quando o cronômetro foi iniciado; nulo = pausado.';

-- -------------------------------------------------------------
-- Ao concluir, recusar ou cancelar a OS, o cronômetro em andamento é pausado.
-- -------------------------------------------------------------
create or replace function public.pause_timer_on_final_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status in ('completed', 'rejected', 'canceled') and new.work_started_at is not null then
    new.work_seconds = least(3600000, new.work_seconds + floor(extract(epoch from (now() - new.work_started_at)))::integer);
    new.work_started_at = null;
  end if;
  return new;
end;
$$;

create trigger service_orders_pause_timer before update of status on public.service_orders
  for each row execute function public.pause_timer_on_final_status();

-- -------------------------------------------------------------
-- Cronômetro: iniciar, pausar e ajustar manualmente.
-- security definer: anon só tem update(status) direto na tabela.
-- -------------------------------------------------------------
create or replace function public.start_service_order_timer(p_id uuid)
returns public.service_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ordem public.service_orders;
begin
  select * into v_ordem from public.service_orders where id = p_id for update;
  if not found then
    raise exception 'Ordem de serviço não encontrada.' using errcode = 'P0002';
  end if;
  if v_ordem.status in ('completed', 'rejected', 'canceled') then
    raise exception 'Não é possível iniciar o cronômetro de uma OS concluída, recusada ou cancelada.' using errcode = '22023';
  end if;

  if v_ordem.work_started_at is null then
    update public.service_orders set work_started_at = now() where id = p_id returning * into v_ordem;
  end if;
  return v_ordem;
end;
$$;

create or replace function public.pause_service_order_timer(p_id uuid)
returns public.service_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ordem public.service_orders;
begin
  select * into v_ordem from public.service_orders where id = p_id for update;
  if not found then
    raise exception 'Ordem de serviço não encontrada.' using errcode = 'P0002';
  end if;

  if v_ordem.work_started_at is not null then
    update public.service_orders set
      work_seconds    = least(3600000, work_seconds + floor(extract(epoch from (now() - work_started_at)))::integer),
      work_started_at = null
    where id = p_id
    returning * into v_ordem;
  end if;
  return v_ordem;
end;
$$;

-- Define o tempo gasto (correção manual). Se o cronômetro estiver rodando, continua a partir do novo valor.
create or replace function public.set_service_order_work_time(p_id uuid, p_seconds integer)
returns public.service_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ordem public.service_orders;
begin
  if p_seconds is null or p_seconds < 0 or p_seconds > 3600000 then
    raise exception 'Informe um tempo entre 0 e 1000 horas.' using errcode = '22023';
  end if;

  update public.service_orders set
    work_seconds    = p_seconds,
    work_started_at = case when work_started_at is null then null else now() end
  where id = p_id
  returning * into v_ordem;

  if not found then
    raise exception 'Ordem de serviço não encontrada.' using errcode = 'P0002';
  end if;
  return v_ordem;
end;
$$;

revoke all on function public.start_service_order_timer(uuid) from public;
revoke all on function public.pause_service_order_timer(uuid) from public;
revoke all on function public.set_service_order_work_time(uuid, integer) from public;
grant execute on function public.start_service_order_timer(uuid) to anon, authenticated;
grant execute on function public.pause_service_order_timer(uuid) to anon, authenticated;
grant execute on function public.set_service_order_work_time(uuid, integer) to anon, authenticated;

-- -------------------------------------------------------------
-- save_service_order: passa a gravar work_estimate_minutes.
-- (o cronômetro não é alterado aqui: só pelas funções acima)
-- -------------------------------------------------------------
create or replace function public.save_service_order(p_order jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       uuid := nullif(p_order ->> 'id', '')::uuid;
  v_total    numeric(10, 2);
  v_client   uuid := (p_order ->> 'client_id')::uuid;
  v_moto     uuid := (p_order ->> 'motorcycle_id')::uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione ao menos um serviço à ordem de serviço.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.motorcycles m where m.id = v_moto and m.client_id = v_client) then
    raise exception 'A moto selecionada não pertence ao cliente.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) i
    left join public.services s on s.id = (i ->> 'service_id')::uuid
    where s.id is null
  ) then
    raise exception 'Serviço não encontrado no catálogo.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where nullif(i ->> 'price', '') is null or (i ->> 'price')::numeric < 0
  ) then
    raise exception 'Informe um preço válido (zero ou mais) para cada serviço.' using errcode = '22023';
  end if;

  select coalesce(sum((i ->> 'price')::numeric(10, 2)), 0)
    into v_total
    from jsonb_array_elements(p_items) i;

  if coalesce((p_order ->> 'down_payment')::numeric(10, 2), 0) > v_total then
    raise exception 'A entrada não pode ser maior que o valor total.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.service_orders (
      client_id, motorcycle_id, mileage, status, payment_method, installments,
      down_payment, total, order_date, estimated_time, work_estimate_minutes, notes, customer_notes
    ) values (
      v_client,
      v_moto,
      (p_order ->> 'mileage')::integer,
      coalesce(p_order ->> 'status', 'draft'),
      p_order ->> 'payment_method',
      (p_order ->> 'installments')::smallint,
      coalesce((p_order ->> 'down_payment')::numeric(10, 2), 0),
      v_total,
      coalesce((p_order ->> 'order_date')::date, current_date),
      nullif(btrim(p_order ->> 'estimated_time'), ''),
      (p_order ->> 'work_estimate_minutes')::integer,
      nullif(btrim(p_order ->> 'notes'), ''),
      nullif(btrim(p_order ->> 'customer_notes'), '')
    )
    returning id into v_id;
  else
    update public.service_orders set
      client_id             = v_client,
      motorcycle_id         = v_moto,
      mileage               = (p_order ->> 'mileage')::integer,
      payment_method        = p_order ->> 'payment_method',
      installments          = (p_order ->> 'installments')::smallint,
      down_payment          = coalesce((p_order ->> 'down_payment')::numeric(10, 2), 0),
      total                 = v_total,
      order_date            = coalesce((p_order ->> 'order_date')::date, order_date),
      estimated_time        = nullif(btrim(p_order ->> 'estimated_time'), ''),
      work_estimate_minutes = (p_order ->> 'work_estimate_minutes')::integer,
      notes                 = nullif(btrim(p_order ->> 'notes'), ''),
      customer_notes        = nullif(btrim(p_order ->> 'customer_notes'), '')
    where id = v_id;

    if not found then
      raise exception 'Ordem de serviço não encontrada.' using errcode = 'P0002';
    end if;

    delete from public.service_order_items where service_order_id = v_id;
  end if;

  insert into public.service_order_items (service_order_id, service_id, service_name, price, position)
  select v_id, s.id, s.name, (i.value ->> 'price')::numeric(10, 2), (i.ordinality - 1)::smallint
  from jsonb_array_elements(p_items) with ordinality as i(value, ordinality)
  join public.services s on s.id = (i.value ->> 'service_id')::uuid;

  return v_id;
end;
$$;

-- =============================================================
-- Logo e Instagram da oficina
-- O logo fica no próprio registro como data URL (imagem já reduzida no aparelho, até ~375 KB):
-- assim entra na captura em PNG/PDF sem depender de CORS do Storage e vai junto no cache local.
-- =============================================================
alter table public.design_settings
  add column logo text check (
    logo is null
    or (char_length(logo) <= 500000 and logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')
  ),
  add column instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');

comment on column public.design_settings.logo is 'Logo da oficina como data URL (PNG/JPEG/WebP em base64, até 500 mil caracteres).';
comment on column public.design_settings.instagram is 'Usuário do Instagram, sem @.';

grant update (logo, instagram) on public.design_settings to anon, authenticated;
