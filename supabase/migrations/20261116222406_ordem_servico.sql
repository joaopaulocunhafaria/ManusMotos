-- =============================================================
-- Ordem de serviço: clientes, motos, catálogo de serviços e OS.
-- O app ainda não tem login: o papel `anon` (chave pública) lê e grava.
-- Quando houver autenticação, troque `anon, authenticated` por `authenticated`
-- e restrinja as policies/funções por papel.
-- =============================================================

-- -------------------------------------------------------------
-- Clientes
-- -------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  phone       text not null check (phone ~ '^[0-9]{10,11}$'),
  document    text not null unique check (document ~ '^([0-9]{11}|[0-9]{14})$'),
  address     text check (char_length(address) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.clients is 'Clientes da mecânica.';
comment on column public.clients.phone is 'Telefone só com dígitos (DDD + número, 10 ou 11 dígitos).';
comment on column public.clients.document is 'CPF (11) ou CNPJ (14), só dígitos.';

create index clients_name_idx on public.clients (lower(name));

-- -------------------------------------------------------------
-- Motos (um cliente pode ter várias)
-- -------------------------------------------------------------
create table public.motorcycles (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  model       text not null check (char_length(btrim(model)) between 1 and 80),
  color       text not null check (char_length(btrim(color)) between 1 and 40),
  plate       text not null unique check (plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.motorcycles is 'Motos dos clientes.';
comment on column public.motorcycles.plate is 'Placa em maiúsculas, sem hífen (AAA9999 ou Mercosul AAA9A99).';

create index motorcycles_client_id_idx on public.motorcycles (client_id);

-- -------------------------------------------------------------
-- Catálogo de serviços (só o nome; o preço é definido em cada OS)
-- -------------------------------------------------------------
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 100),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.services is 'Catálogo de serviços. Desative (active = false) em vez de excluir quando já usado em OS.';

create unique index services_name_unique_idx on public.services (lower(btrim(name)));

-- -------------------------------------------------------------
-- Ordens de serviço
-- -------------------------------------------------------------
create table public.service_orders (
  id              uuid primary key default gen_random_uuid(),
  number          bigint generated always as identity unique,
  client_id       uuid not null references public.clients (id) on delete restrict,
  motorcycle_id   uuid not null references public.motorcycles (id) on delete restrict,
  mileage         integer check (mileage >= 0),
  status          text not null default 'draft'
                    check (status in ('draft', 'awaiting_approval', 'approved', 'rejected', 'in_progress', 'completed', 'canceled')),
  payment_method  text not null default 'pix' check (payment_method in ('pix', 'cash', 'installments')),
  installments    smallint,
  down_payment    numeric(10, 2) not null default 0 check (down_payment >= 0),
  total           numeric(10, 2) not null default 0 check (total >= 0),
  order_date      date not null default current_date,
  estimated_time  text check (char_length(estimated_time) <= 80),
  notes           text check (char_length(notes) <= 2000),
  customer_notes  text check (char_length(customer_notes) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint service_orders_installments_check check (
    (payment_method = 'installments' and installments between 2 and 24)
    or (payment_method <> 'installments' and installments is null)
  ),
  constraint service_orders_down_payment_total_check check (down_payment <= total)
);

comment on table public.service_orders is 'Ordens de serviço. Gravação (insert/update de dados e itens) via public.save_service_order.';
comment on column public.service_orders.number is 'Número sequencial exibido ao usuário (OS #12).';
comment on column public.service_orders.mileage is 'KM da moto na entrada.';
comment on column public.service_orders.total is 'Soma dos preços dos itens, calculada por public.save_service_order.';
comment on column public.service_orders.notes is 'Observação interna (não aparece na versão do cliente).';
comment on column public.service_orders.customer_notes is 'Observação exibida na versão enviada ao cliente.';

create index service_orders_client_id_idx on public.service_orders (client_id);
create index service_orders_motorcycle_id_idx on public.service_orders (motorcycle_id);
create index service_orders_status_idx on public.service_orders (status);
create index service_orders_created_at_idx on public.service_orders (created_at desc);

create table public.service_order_items (
  id                uuid primary key default gen_random_uuid(),
  service_order_id  uuid not null references public.service_orders (id) on delete cascade,
  service_id        uuid not null references public.services (id) on delete restrict,
  service_name      text not null check (char_length(btrim(service_name)) between 1 and 100),
  price             numeric(10, 2) not null check (price >= 0),
  position          smallint not null default 0,
  created_at        timestamptz not null default now()
);

comment on table public.service_order_items is 'Serviços de uma OS com o preço combinado. service_name guarda o nome no momento da OS.';

create index service_order_items_order_idx on public.service_order_items (service_order_id, position);
create index service_order_items_service_idx on public.service_order_items (service_id);

-- -------------------------------------------------------------
-- updated_at automático (reusa public.set_updated_at)
-- -------------------------------------------------------------
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger motorcycles_set_updated_at before update on public.motorcycles
  for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger service_orders_set_updated_at before update on public.service_orders
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- Permissões e RLS
-- -------------------------------------------------------------
revoke all on public.clients, public.motorcycles, public.services, public.service_orders, public.service_order_items
  from anon, authenticated;

grant select, insert, update, delete on public.clients to anon, authenticated;
grant select, insert, update, delete on public.motorcycles to anon, authenticated;
grant select, insert, update on public.services to anon, authenticated;
-- OS: leitura, troca de status e exclusão direto; dados e itens só pela função save_service_order.
grant select, delete on public.service_orders to anon, authenticated;
grant update (status) on public.service_orders to anon, authenticated;
grant select on public.service_order_items to anon, authenticated;

alter table public.clients enable row level security;
alter table public.motorcycles enable row level security;
alter table public.services enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;

create policy "clients: todos acessam" on public.clients for all
  to anon, authenticated using (true) with check (true);

create policy "motorcycles: todos acessam" on public.motorcycles for all
  to anon, authenticated using (true) with check (true);

create policy "services: todos leem" on public.services for select
  to anon, authenticated using (true);
create policy "services: todos criam" on public.services for insert
  to anon, authenticated with check (true);
create policy "services: todos atualizam" on public.services for update
  to anon, authenticated using (true) with check (true);

create policy "service_orders: todos leem" on public.service_orders for select
  to anon, authenticated using (true);
create policy "service_orders: todos atualizam status" on public.service_orders for update
  to anon, authenticated using (true) with check (true);
create policy "service_orders: todos excluem" on public.service_orders for delete
  to anon, authenticated using (true);

create policy "service_order_items: todos leem" on public.service_order_items for select
  to anon, authenticated using (true);

-- -------------------------------------------------------------
-- Busca de clientes por nome, telefone, CPF/CNPJ ou placa.
-- Retorna linhas de clients: o front embute motorcycles(*) e pagina com .range().
-- -------------------------------------------------------------
create or replace function public.search_clients(p_term text default null)
returns setof public.clients
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.clients c
  where coalesce(btrim(p_term), '') = ''
     or c.name ilike '%' || btrim(p_term) || '%'
     or (regexp_replace(p_term, '\D', '', 'g') <> ''
         and (c.phone like '%' || regexp_replace(p_term, '\D', '', 'g') || '%'
              or c.document like '%' || regexp_replace(p_term, '\D', '', 'g') || '%'))
     or exists (
          select 1 from public.motorcycles m
          where m.client_id = c.id
            and m.plate like '%' || upper(regexp_replace(p_term, '[^a-zA-Z0-9]', '', 'g')) || '%'
            and regexp_replace(p_term, '[^a-zA-Z0-9]', '', 'g') <> ''
        )
  order by lower(c.name);
$$;

-- -------------------------------------------------------------
-- Busca de OS por número, nome do cliente ou placa, com filtro de status.
-- -------------------------------------------------------------
create or replace function public.search_service_orders(p_term text default null, p_status text default null)
returns setof public.service_orders
language sql
stable
security invoker
set search_path = ''
as $$
  select o.*
  from public.service_orders o
  join public.clients c on c.id = o.client_id
  join public.motorcycles m on m.id = o.motorcycle_id
  where (p_status is null or o.status = p_status)
    and (
      coalesce(btrim(p_term), '') = ''
      or o.number::text = regexp_replace(p_term, '\D', '', 'g')
      or c.name ilike '%' || btrim(p_term) || '%'
      or (regexp_replace(p_term, '[^a-zA-Z0-9]', '', 'g') <> ''
          and m.plate like '%' || upper(regexp_replace(p_term, '[^a-zA-Z0-9]', '', 'g')) || '%')
    )
  order by o.created_at desc;
$$;

grant execute on function public.search_clients(text) to anon, authenticated;
grant execute on function public.search_service_orders(text, text) to anon, authenticated;

-- -------------------------------------------------------------
-- Grava a OS (cria ou atualiza) e substitui os itens numa única transação.
-- p_order: { id?, client_id, motorcycle_id, mileage, payment_method, installments,
--            down_payment, order_date, estimated_time, notes, customer_notes, status? }
-- p_items: [{ service_id, price }]  (o nome é copiado do catálogo)
-- security definer: as tabelas de OS não têm insert/update liberado; toda gravação passa por aqui.
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

revoke all on function public.save_service_order(jsonb, jsonb) from public;
grant execute on function public.save_service_order(jsonb, jsonb) to anon, authenticated;
