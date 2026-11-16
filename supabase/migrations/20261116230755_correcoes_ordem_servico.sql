-- =============================================================
-- Correções encontradas pelos testes do banco (supabase/tests/database):
--   1. "Parcelado" sem nº de parcelas passava: com installments nulo a CHECK resultava
--      em NULL, e o Postgres aceita CHECK nula. Agora a regra trata o nulo explicitamente.
--   2. Preço negativo/vazio no item gerava a mensagem enganosa "entrada maior que o total".
--      A função agora valida os preços antes, com mensagem própria.
-- =============================================================

alter table public.service_orders drop constraint service_orders_installments_check;
alter table public.service_orders add constraint service_orders_installments_check check (
  case
    when payment_method = 'installments' then installments is not null and installments between 2 and 24
    else installments is null
  end
);

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
      down_payment, total, order_date, estimated_time, notes, customer_notes
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
      nullif(btrim(p_order ->> 'notes'), ''),
      nullif(btrim(p_order ->> 'customer_notes'), '')
    )
    returning id into v_id;
  else
    update public.service_orders set
      client_id      = v_client,
      motorcycle_id  = v_moto,
      mileage        = (p_order ->> 'mileage')::integer,
      payment_method = p_order ->> 'payment_method',
      installments   = (p_order ->> 'installments')::smallint,
      down_payment   = coalesce((p_order ->> 'down_payment')::numeric(10, 2), 0),
      total          = v_total,
      order_date     = coalesce((p_order ->> 'order_date')::date, order_date),
      estimated_time = nullif(btrim(p_order ->> 'estimated_time'), ''),
      notes          = nullif(btrim(p_order ->> 'notes'), ''),
      customer_notes = nullif(btrim(p_order ->> 'customer_notes'), '')
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
