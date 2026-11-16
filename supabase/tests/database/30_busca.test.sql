-- Busca de clientes e OS (search_clients / search_service_orders).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into public.clients (id, name, phone, document) values
  ('30000000-0000-4000-8000-000000000001', 'Zebedeu Buscável', '31977771234', '70000000001'),
  ('30000000-0000-4000-8000-000000000002', 'Zebedeu Outro', '21966665555', '70000000002');
insert into public.motorcycles (id, client_id, model, color, plate) values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'XQZ9K87');
insert into public.services (id, name) values ('32000000-0000-4000-8000-000000000001', 'Serviço Busca DB');

set local role anon;

create function pg_temp.nomes(termo text) returns text[] language sql as $$
  select coalesce(array_agg(name order by name), '{}') from public.search_clients(termo) where name like 'Zebedeu%'
$$;

select is(pg_temp.nomes('zebedeu b'), array['Zebedeu Buscável'], 'nome em qualquer caixa');
select is(pg_temp.nomes('(31) 97777-1'), array['Zebedeu Buscável'], 'telefone com máscara');
select is(pg_temp.nomes('700.000.000'), array['Zebedeu Buscável', 'Zebedeu Outro'], 'CPF parcial com pontos');
select is(pg_temp.nomes('xqz-9k'), array['Zebedeu Buscável'], 'placa parcial, minúscula e com hífen');
select is(pg_temp.nomes('Fulano 1234'), '{}'::text[], 'nome com números não casa com telefone');
select is(pg_temp.nomes('12'), '{}'::text[], 'menos de 3 dígitos não busca telefone/CPF');
select ok(array_length(pg_temp.nomes(''), 1) = 2 and array_length(pg_temp.nomes(null), 1) = 2, 'termo vazio ou nulo traz todos');
select is(pg_temp.nomes('%'), '{}'::text[], 'curinga do LIKE não traz tudo');

-- OS
reset role;
create temp table os_busca (id uuid);
insert into os_busca select public.save_service_order(
  '{"client_id":"30000000-0000-4000-8000-000000000001","motorcycle_id":"31000000-0000-4000-8000-000000000001","payment_method":"pix"}',
  '[{"service_id":"32000000-0000-4000-8000-000000000001","price":10}]');
grant select on os_busca to anon;
set local role anon;

create function pg_temp.os(termo text, status text default null) returns uuid[] language sql as $$
  select coalesce(array_agg(id), '{}') from public.search_service_orders(termo, status) where id in (select id from os_busca)
$$;
create function pg_temp.numero() returns text language sql as $$
  select number::text from public.service_orders where id = (select id from os_busca)
$$;

select is(pg_temp.os(pg_temp.numero()), (select array_agg(id) from os_busca), 'OS pelo número');
select is(pg_temp.os('OS #' || pg_temp.numero()), (select array_agg(id) from os_busca), 'OS por "OS #número"');
select is(pg_temp.os('zebedeu ' || pg_temp.numero()), '{}'::uuid[], 'texto com número não vira busca por nº');
select is(pg_temp.os('xqz9k'), (select array_agg(id) from os_busca), 'OS pela placa');
select is(pg_temp.os('', 'approved'), '{}'::uuid[], 'filtro de status exclui as outras');
select is(pg_temp.os('', 'draft'), (select array_agg(id) from os_busca), 'filtro de status inclui a do status');

select * from finish();
rollback;
