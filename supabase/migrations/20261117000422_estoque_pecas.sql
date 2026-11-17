-- =============================================================
-- Estoque de peças: nome, moto (modelo e anos), valores de compra/venda e quantidade.
-- A margem de lucro é calculada sobre a venda: (venda − compra) ÷ venda × 100.
-- O app ainda não tem login: o papel `anon` (chave pública) lê e grava.
-- =============================================================

create table public.parts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  motorcycle_model  text check (char_length(motorcycle_model) <= 80),
  year_start        smallint check (year_start between 1950 and 2100),
  year_end          smallint check (year_end between 1950 and 2100),
  purchase_price    numeric(10, 2) not null default 0 check (purchase_price >= 0),
  sale_price        numeric(10, 2) not null default 0 check (sale_price >= 0),
  quantity          integer not null default 0 check (quantity >= 0),
  profit_margin     numeric(7, 2) generated always as (
                      case when sale_price > 0 then round((sale_price - purchase_price) / sale_price * 100, 2) end
                    ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint parts_years_check check (year_end is null or (year_start is not null and year_end >= year_start))
);

comment on table public.parts is 'Estoque de peças.';
comment on column public.parts.motorcycle_model is 'Modelo da moto em que a peça serve (vazio = qualquer moto).';
comment on column public.parts.year_start is 'Primeiro ano da moto em que a peça serve.';
comment on column public.parts.year_end is 'Último ano da moto em que a peça serve (vazio = só o ano inicial).';
comment on column public.parts.purchase_price is 'Valor pago pela peça (unidade).';
comment on column public.parts.sale_price is 'Valor de venda da peça (unidade).';
comment on column public.parts.quantity is 'Unidades em estoque.';
comment on column public.parts.profit_margin is 'Margem de lucro sobre a venda, em %. Nula quando não há valor de venda.';

-- Mesma peça para a mesma moto/anos só uma vez (ignora maiúsculas e espaços nas pontas).
create unique index parts_unique_idx on public.parts (
  lower(btrim(name)), lower(coalesce(btrim(motorcycle_model), '')), coalesce(year_start, 0), coalesce(year_end, 0)
);
create index parts_name_idx on public.parts (lower(name));

create trigger parts_set_updated_at before update on public.parts
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- Busca: nome ou modelo (parcial, sem diferenciar maiúsculas) ou ano da moto (4 dígitos).
-- Curingas do LIKE (% e _) digitados pelo usuário são tratados como texto.
-- -------------------------------------------------------------
create or replace function public.search_parts(p_term text default null)
returns setof public.parts
language sql
stable
security invoker
set search_path = ''
as $$
  with termo as (
    select
      replace(replace(replace(btrim(coalesce(p_term, '')), '\', '\\'), '%', '\%'), '_', '\_') as texto,
      (substring(coalesce(p_term, '') from '^\s*(\d{4})\s*$'))::int as ano
  )
  select p.*
  from public.parts p, termo t
  where t.texto = ''
     or p.name ilike '%' || t.texto || '%'
     or p.motorcycle_model ilike '%' || t.texto || '%'
     or (t.ano is not null and p.year_start <= t.ano and coalesce(p.year_end, p.year_start) >= t.ano)
  order by lower(p.name), p.created_at;
$$;

-- -------------------------------------------------------------
-- Entrada/saída de unidades sem condição de corrida (soma no próprio banco).
-- -------------------------------------------------------------
create or replace function public.adjust_part_quantity(p_id uuid, p_delta integer)
returns public.parts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_peca public.parts;
begin
  select * into v_peca from public.parts where id = p_id for update;
  if not found then
    raise exception 'Peça não encontrada.' using errcode = 'P0002';
  end if;
  if v_peca.quantity + p_delta < 0 then
    raise exception 'Estoque insuficiente.' using errcode = '22023';
  end if;
  update public.parts set quantity = quantity + p_delta where id = p_id returning * into v_peca;
  return v_peca;
end;
$$;

-- -------------------------------------------------------------
-- Permissões e RLS
-- -------------------------------------------------------------
revoke all on public.parts from anon, authenticated;
grant select, insert, update, delete on public.parts to anon, authenticated;

alter table public.parts enable row level security;

create policy "parts: todos acessam" on public.parts for all
  to anon, authenticated using (true) with check (true);

revoke all on function public.search_parts(text) from public;
grant execute on function public.search_parts(text) to anon, authenticated;
revoke all on function public.adjust_part_quantity(uuid, integer) from public;
grant execute on function public.adjust_part_quantity(uuid, integer) to anon, authenticated;
