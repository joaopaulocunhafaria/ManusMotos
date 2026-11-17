-- =============================================================
-- Gestão financeira
--   1. Estoque com data: data de entrada da peça e movimentações datadas (compra, venda, ajuste).
--      Toda mudança de quantidade passa a gerar uma movimentação; a coluna quantity não é mais
--      alterada direto pelo app, só pelas funções abaixo.
--   2. OS: data de conclusão (completed_at), preenchida pelo banco ao mudar o status.
--   3. Caixa: valor/data inicial (linha única) e lançamentos manuais de entrada/saída.
--   4. Balanço por período e extrato unificado.
-- Datas "de hoje" usam o fuso da oficina (America/Sao_Paulo), nunca o UTC do servidor.
-- =============================================================

-- -------------------------------------------------------------
-- Data local da oficina
-- -------------------------------------------------------------
create or replace function public.local_today()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

revoke all on function public.local_today() from public;
grant execute on function public.local_today() to anon, authenticated;

-- -------------------------------------------------------------
-- 1. Estoque
-- -------------------------------------------------------------
alter table public.parts add column purchase_date date;
update public.parts set purchase_date = (created_at at time zone 'America/Sao_Paulo')::date;
alter table public.parts
  alter column purchase_date set not null,
  alter column purchase_date set default public.local_today();

comment on column public.parts.purchase_date is 'Data de entrada (compra) da peça no estoque.';

create table public.part_movements (
  id             uuid primary key default gen_random_uuid(),
  part_id        uuid references public.parts (id) on delete set null,
  part_name      text not null check (char_length(btrim(part_name)) between 1 and 120),
  kind           text not null check (kind in ('purchase', 'sale', 'adjustment')),
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(10, 2) not null check (unit_price >= 0),
  unit_cost      numeric(10, 2) not null default 0 check (unit_cost >= 0),
  total          numeric(12, 2) generated always as (quantity * unit_price) stored,
  movement_date  date not null default public.local_today(),
  notes          text check (char_length(notes) <= 300),
  created_at     timestamptz not null default now()
);

comment on table public.part_movements is 'Movimentações de estoque. Gravação só pelas funções (trigger de cadastro, adjust_part_quantity, sell_part).';
comment on column public.part_movements.part_id is 'Peça (nulo se a peça foi excluída: o histórico financeiro permanece).';
comment on column public.part_movements.part_name is 'Nome da peça no momento do movimento.';
comment on column public.part_movements.kind is 'purchase = entrada (sai do caixa); sale = venda (entra no caixa); adjustment = saída sem venda (perda/correção).';
comment on column public.part_movements.unit_price is 'Preço unitário: de venda (sale) ou de compra (purchase/adjustment).';
comment on column public.part_movements.unit_cost is 'Custo unitário da peça no momento (lucro da venda = total − quantity × unit_cost).';

create index part_movements_date_idx on public.part_movements (movement_date);
create index part_movements_part_idx on public.part_movements (part_id, movement_date desc);
create index part_movements_kind_date_idx on public.part_movements (kind, movement_date);

-- Cadastro com quantidade > 0 = compra na data de entrada.
create or replace function public.register_part_purchase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quantity > 0 then
    insert into public.part_movements (part_id, part_name, kind, quantity, unit_price, unit_cost, movement_date)
    values (new.id, new.name, 'purchase', new.quantity, new.purchase_price, new.purchase_price, new.purchase_date);
  end if;
  return new;
end;
$$;

create trigger parts_register_purchase after insert on public.parts
  for each row execute function public.register_part_purchase();

-- Entrada (+) vira compra de hoje; saída (−) vira ajuste. Agora security definer: anon não altera quantity direto.
create or replace function public.adjust_part_quantity(p_id uuid, p_delta integer)
returns public.parts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peca public.parts;
begin
  select * into v_peca from public.parts where id = p_id for update;
  if not found then
    raise exception 'Peça não encontrada.' using errcode = 'P0002';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Informe uma quantidade diferente de zero.' using errcode = '22023';
  end if;
  if v_peca.quantity + p_delta < 0 then
    raise exception 'Estoque insuficiente.' using errcode = '22023';
  end if;

  insert into public.part_movements (part_id, part_name, kind, quantity, unit_price, unit_cost, movement_date)
  values (
    v_peca.id, v_peca.name, case when p_delta > 0 then 'purchase' else 'adjustment' end,
    abs(p_delta), v_peca.purchase_price, v_peca.purchase_price, public.local_today()
  );

  update public.parts set quantity = quantity + p_delta where id = p_id returning * into v_peca;
  return v_peca;
end;
$$;

-- Venda de peça: grava a venda e baixa o estoque na mesma transação.
create or replace function public.sell_part(
  p_part_id uuid,
  p_quantity integer,
  p_unit_price numeric,
  p_date date,
  p_notes text default null
)
returns public.part_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peca  public.parts;
  v_venda public.part_movements;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Informe uma quantidade de pelo menos 1.' using errcode = '22023';
  end if;
  if p_unit_price is null or p_unit_price < 0 or p_unit_price > 99999999.99 then
    raise exception 'Informe um preço de venda válido.' using errcode = '22023';
  end if;
  if p_date is null then
    raise exception 'Informe a data da venda.' using errcode = '22023';
  end if;
  if char_length(p_notes) > 300 then
    raise exception 'A observação pode ter no máximo 300 caracteres.' using errcode = '22023';
  end if;

  select * into v_peca from public.parts where id = p_part_id for update;
  if not found then
    raise exception 'Peça não encontrada.' using errcode = 'P0002';
  end if;
  if v_peca.quantity < p_quantity then
    raise exception 'Estoque insuficiente.' using errcode = '22023';
  end if;

  insert into public.part_movements (part_id, part_name, kind, quantity, unit_price, unit_cost, movement_date, notes)
  values (v_peca.id, v_peca.name, 'sale', p_quantity, round(p_unit_price, 2), v_peca.purchase_price, p_date, nullif(btrim(p_notes), ''))
  returning * into v_venda;

  update public.parts set quantity = quantity - p_quantity where id = p_part_id;
  return v_venda;
end;
$$;

-- Estorno de venda: devolve as unidades (se a peça ainda existe) e apaga a venda.
create or replace function public.cancel_part_sale(p_movement_id uuid)
returns public.parts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mov  public.part_movements;
  v_peca public.parts;
begin
  select * into v_mov from public.part_movements where id = p_movement_id for update;
  if not found then
    raise exception 'Venda não encontrada.' using errcode = 'P0002';
  end if;
  if v_mov.kind <> 'sale' then
    raise exception 'Só vendas podem ser estornadas.' using errcode = '22023';
  end if;

  delete from public.part_movements where id = p_movement_id;
  if v_mov.part_id is not null then
    update public.parts set quantity = quantity + v_mov.quantity where id = v_mov.part_id returning * into v_peca;
  end if;
  return v_peca;
end;
$$;

-- Permissões do estoque: quantity só muda pelas funções.
revoke all on public.parts from anon, authenticated;
grant select, insert, delete on public.parts to anon, authenticated;
grant update (name, motorcycle_model, year_start, year_end, purchase_price, sale_price, purchase_date) on public.parts to anon, authenticated;

revoke all on public.part_movements from anon, authenticated;
grant select on public.part_movements to anon, authenticated;
alter table public.part_movements enable row level security;
create policy "part_movements: todos leem" on public.part_movements for select
  to anon, authenticated using (true);

revoke all on function public.register_part_purchase() from public, anon, authenticated;
revoke all on function public.adjust_part_quantity(uuid, integer) from public;
grant execute on function public.adjust_part_quantity(uuid, integer) to anon, authenticated;
revoke all on function public.sell_part(uuid, integer, numeric, date, text) from public;
grant execute on function public.sell_part(uuid, integer, numeric, date, text) to anon, authenticated;
revoke all on function public.cancel_part_sale(uuid) from public;
grant execute on function public.cancel_part_sale(uuid) to anon, authenticated;

-- -------------------------------------------------------------
-- 2. OS: data de conclusão
-- -------------------------------------------------------------
alter table public.service_orders add column completed_at timestamptz;
update public.service_orders set completed_at = updated_at where status = 'completed';

comment on column public.service_orders.completed_at is 'Quando a OS foi concluída (preenchido pelo banco). Base da receita no financeiro.';

create or replace function public.set_service_order_completed_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      new.completed_at = now();
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger service_orders_set_completed_at before insert or update of status on public.service_orders
  for each row execute function public.set_service_order_completed_at();

create index service_orders_completed_at_idx on public.service_orders (completed_at) where status = 'completed';

-- -------------------------------------------------------------
-- 3. Caixa
-- -------------------------------------------------------------
create table public.cash_settings (
  id               smallint primary key default 1 check (id = 1),
  opening_balance  numeric(12, 2) not null default 0 check (opening_balance between -9999999999.99 and 9999999999.99),
  opening_date     date not null default public.local_today(),
  updated_at       timestamptz not null default now()
);

comment on table public.cash_settings is 'Início do caixa (linha única id = 1): valor e data a partir da qual o caixa é calculado.';
comment on column public.cash_settings.opening_balance is 'Valor em caixa na data inicial (pode ser negativo).';

insert into public.cash_settings (id) values (1);

create trigger cash_settings_set_updated_at before update on public.cash_settings
  for each row execute function public.set_updated_at();

revoke all on public.cash_settings from anon, authenticated;
grant select on public.cash_settings to anon, authenticated;
grant update (opening_balance, opening_date) on public.cash_settings to anon, authenticated;
alter table public.cash_settings enable row level security;
create policy "cash_settings: todos leem" on public.cash_settings for select
  to anon, authenticated using (true);
create policy "cash_settings: todos atualizam" on public.cash_settings for update
  to anon, authenticated using (true) with check (true);

create table public.cash_entries (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('income', 'expense')),
  description  text not null check (char_length(btrim(description)) between 1 and 120),
  amount       numeric(10, 2) not null check (amount > 0),
  entry_date   date not null default public.local_today(),
  notes        text check (char_length(notes) <= 300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.cash_entries is 'Lançamentos manuais do caixa: income = entrada avulsa, expense = despesa/retirada.';

create index cash_entries_date_idx on public.cash_entries (entry_date);

create trigger cash_entries_set_updated_at before update on public.cash_entries
  for each row execute function public.set_updated_at();

revoke all on public.cash_entries from anon, authenticated;
grant select, insert, update, delete on public.cash_entries to anon, authenticated;
alter table public.cash_entries enable row level security;
create policy "cash_entries: todos acessam" on public.cash_entries for all
  to anon, authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- 4. Fluxos, balanço e extrato
-- -------------------------------------------------------------

-- Todos os fluxos de caixa num período (datas inclusivas). amount com sinal: + entra, − sai.
-- Ajustes de estoque (perda/correção) não movimentam o caixa e ficam de fora.
create or replace function public.cash_flows(p_start date, p_end date)
returns table (
  entry_date  date,
  source      text,
  ref_id      uuid,
  part_id     uuid,
  description text,
  quantity    integer,
  amount      numeric,
  cost        numeric,
  created_at  timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select (o.completed_at at time zone 'America/Sao_Paulo')::date, 'os', o.id, null::uuid,
         'OS #' || o.number || ' · ' || c.name, null::integer, o.total, 0::numeric, o.completed_at
    from public.service_orders o
    join public.clients c on c.id = o.client_id
   where o.status = 'completed'
     and o.completed_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
     and o.completed_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
  union all
  select m.movement_date, case m.kind when 'sale' then 'sale' else 'purchase' end, m.id, m.part_id,
         m.quantity || '× ' || m.part_name, m.quantity,
         case m.kind when 'sale' then m.total else -m.total end,
         m.quantity * m.unit_cost, m.created_at
    from public.part_movements m
   where m.kind in ('sale', 'purchase')
     and m.movement_date between p_start and p_end
  union all
  select e.entry_date, e.kind, e.id, null::uuid, e.description, null::integer,
         case e.kind when 'income' then e.amount else -e.amount end, 0::numeric, e.created_at
    from public.cash_entries e
   where e.entry_date between p_start and p_end;
$$;

-- Caixa ao fim do dia p_date: valor inicial + fluxos de opening_date até p_date.
create or replace function public.cash_balance_at(p_date date)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select s.opening_balance + coalesce((
           select sum(f.amount) from public.cash_flows(s.opening_date, p_date) f
         ), 0)
    from public.cash_settings s
   where s.id = 1;
$$;

create or replace function public.financial_summary(p_start date, p_end date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if p_start is null or p_end is null then
    raise exception 'Informe o período.' using errcode = '22023';
  end if;
  if p_start > p_end then
    raise exception 'A data inicial não pode ser depois da final.' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'os_total',        coalesce(sum(f.amount) filter (where f.source = 'os'), 0),
    'os_count',        count(*) filter (where f.source = 'os'),
    'sales_total',     coalesce(sum(f.amount) filter (where f.source = 'sale'), 0),
    'sales_cost',      coalesce(sum(f.cost) filter (where f.source = 'sale'), 0),
    'sales_profit',    coalesce(sum(f.amount - f.cost) filter (where f.source = 'sale'), 0),
    'sales_count',     count(*) filter (where f.source = 'sale'),
    'sales_units',     coalesce(sum(f.quantity) filter (where f.source = 'sale'), 0),
    'purchases_total', coalesce(-sum(f.amount) filter (where f.source = 'purchase'), 0),
    'purchases_units', coalesce(sum(f.quantity) filter (where f.source = 'purchase'), 0),
    'income_total',    coalesce(sum(f.amount) filter (where f.source = 'income'), 0),
    'expense_total',   coalesce(-sum(f.amount) filter (where f.source = 'expense'), 0),
    'period_in',       coalesce(sum(f.amount) filter (where f.amount > 0), 0),
    'period_out',      coalesce(-sum(f.amount) filter (where f.amount < 0), 0),
    'period_net',      coalesce(sum(f.amount), 0),
    'cash_start',      public.cash_balance_at(p_start - 1),
    'cash_end',        public.cash_balance_at(p_end),
    'cash_now',        public.cash_balance_at(public.local_today()),
    'opening_balance', (select s.opening_balance from public.cash_settings s where s.id = 1),
    'opening_date',    (select s.opening_date from public.cash_settings s where s.id = 1)
  )
  into v_resultado
  from public.cash_flows(p_start, p_end) f;

  return v_resultado;
end;
$$;

-- Extrato do período (o front pagina com .range()).
create or replace function public.financial_statement(p_start date, p_end date)
returns table (
  entry_date  date,
  source      text,
  ref_id      uuid,
  part_id     uuid,
  description text,
  amount      numeric,
  created_at  timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_start is null or p_end is null or p_start > p_end then
    raise exception 'Período inválido.' using errcode = '22023';
  end if;
  return query
    select f.entry_date, f.source, f.ref_id, f.part_id, f.description, f.amount, f.created_at
      from public.cash_flows(p_start, p_end) f
     order by f.entry_date desc, f.created_at desc, f.ref_id;
end;
$$;

revoke all on function public.cash_flows(date, date) from public;
revoke all on function public.cash_balance_at(date) from public;
revoke all on function public.financial_summary(date, date) from public;
revoke all on function public.financial_statement(date, date) from public;
grant execute on function public.cash_flows(date, date) to anon, authenticated;
grant execute on function public.cash_balance_at(date) to anon, authenticated;
grant execute on function public.financial_summary(date, date) to anon, authenticated;
grant execute on function public.financial_statement(date, date) to anon, authenticated;
