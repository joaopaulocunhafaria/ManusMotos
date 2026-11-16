-- =============================================================
-- Busca mais precisa de clientes e OS.
-- Antes, os dígitos de qualquer termo eram comparados com telefone/CPF e nº da OS:
-- "Noturno 11" trazia todo cliente com "11" no telefone e a OS #11.
-- Agora:
--   - telefone/CPF/CNPJ só quando o termo é numérico (aceita máscara) e tem 3+ dígitos;
--   - nº da OS só quando o termo é um número (aceita "12", "#12", "OS 12");
--   - placa só quando o termo, sem hífen/espaço, tem 3+ caracteres;
--   - curingas do LIKE (% e _) digitados pelo usuário são tratados como texto.
-- =============================================================

create or replace function public.search_clients(p_term text default null)
returns setof public.clients
language sql
stable
security invoker
set search_path = ''
as $$
  with termo as (
    select
      replace(replace(replace(btrim(coalesce(p_term, '')), '\', '\\'), '%', '\%'), '_', '\_') as texto,
      regexp_replace(coalesce(p_term, ''), '\D', '', 'g')                 as digitos,
      upper(regexp_replace(coalesce(p_term, ''), '[^a-zA-Z0-9]', '', 'g')) as placa,
      coalesce(p_term, '') ~ '^[\s0-9().+/-]+$'                            as numerico
  )
  select c.*
  from public.clients c, termo t
  where t.texto = ''
     or c.name ilike '%' || t.texto || '%'
     or (t.numerico and length(t.digitos) >= 3
         and (c.phone like '%' || t.digitos || '%' or c.document like '%' || t.digitos || '%'))
     or (length(t.placa) >= 3 and exists (
          select 1 from public.motorcycles m
          where m.client_id = c.id and m.plate like '%' || t.placa || '%'
        ))
  order by lower(c.name);
$$;

create or replace function public.search_service_orders(p_term text default null, p_status text default null)
returns setof public.service_orders
language sql
stable
security invoker
set search_path = ''
as $$
  with termo as (
    select
      replace(replace(replace(btrim(coalesce(p_term, '')), '\', '\\'), '%', '\%'), '_', '\_') as texto,
      upper(regexp_replace(coalesce(p_term, ''), '[^a-zA-Z0-9]', '', 'g')) as placa,
      substring(coalesce(p_term, '') from '^\s*(?:[oO][sS])?\s*#?\s*(\d+)\s*$') as numero
  )
  select o.*
  from public.service_orders o
  join public.clients c on c.id = o.client_id
  join public.motorcycles m on m.id = o.motorcycle_id
  cross join termo t
  where (p_status is null or o.status = p_status)
    and (
      t.texto = ''
      or o.number::text = t.numero
      or c.name ilike '%' || t.texto || '%'
      or (length(t.placa) >= 3 and m.plate like '%' || t.placa || '%')
    )
  order by o.created_at desc;
$$;
