-- Catálogo de serviços, ordens de serviço e a função save_service_order (papel anon, como o app).
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- Cenário (como postgres): dois clientes com uma moto cada, dois serviços.
insert into public.clients (id, name, phone, document) values
  ('20000000-0000-4000-8000-000000000001', 'Cliente OS DB', '31999991111', '80000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Outro Cliente DB', '31999992222', '80000000002');
insert into public.motorcycles (id, client_id, model, color, plate) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'YYA1A11'),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Biz', 'Branca', 'YYA1A12');
insert into public.services (id, name) values
  ('22000000-0000-4000-8000-000000000001', 'Serviço DB Um'),
  ('22000000-0000-4000-8000-000000000002', 'Serviço DB Dois');

create temp table os_teste (rotulo text primary key, id uuid);
grant all on os_teste to anon;

set local role anon;

-- ---------- Catálogo ----------
select throws_ok($$ insert into public.services (name) values ('  serviço db um ') $$, '23505', null, 'nome de serviço duplicado (caixa/espaços) é recusado');
select throws_ok($$ insert into public.services (name) values ('   ') $$, '23514', null, 'nome de serviço vazio é recusado');
select throws_ok($$ delete from public.services where id = '22000000-0000-4000-8000-000000000001' $$, '42501', null, 'anon não exclui serviço (só desativa)');
select lives_ok($$ update public.services set active = false where id = '22000000-0000-4000-8000-000000000002' $$, 'anon desativa serviço');

-- ---------- save_service_order: caminho feliz ----------
select lives_ok($$ insert into os_teste select 'parcelada', public.save_service_order(
    '{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001",
      "mileage":1000,"payment_method":"installments","installments":3,"down_payment":0.10,"notes":"  ","customer_notes":" ok "}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":0.1},{"service_id":"22000000-0000-4000-8000-000000000002","price":0.2}]') $$,
  'cria OS parcelada (serviço inativo continua válido em OS)');
select results_eq(
  $$ select total, down_payment, status, notes, customer_notes, order_date from public.service_orders where id = (select id from os_teste where rotulo = 'parcelada') $$,
  $$ values (0.30::numeric(10,2), 0.10::numeric(10,2), 'draft'::text, null::text, 'ok'::text, current_date) $$,
  'total somado sem erro de arredondamento, rascunho, textos aparados, data de hoje');
select results_eq(
  $$ select service_name, price, position from public.service_order_items where service_order_id = (select id from os_teste where rotulo = 'parcelada') order by position $$,
  $$ values ('Serviço DB Um'::text, 0.10::numeric(10,2), 0::smallint), ('Serviço DB Dois'::text, 0.20::numeric(10,2), 1::smallint) $$,
  'itens com nome copiado do catálogo, preço e ordem');

select lives_ok($$ insert into os_teste select 'entrada-igual', public.save_service_order(
    '{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"cash","down_payment":50}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":50}]') $$,
  'entrada igual ao total é aceita');
select lives_ok($$ insert into os_teste select 'gratis', public.save_service_order(
    '{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":0}]') $$,
  'serviço de preço zero é aceito');
select ok((select number from public.service_orders where id = (select id from os_teste where rotulo = 'gratis'))
        > (select number from public.service_orders where id = (select id from os_teste where rotulo = 'parcelada')),
  'número da OS é sequencial');

-- ---------- save_service_order: casos de erro ----------
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}', '[]') $$,
  '22023', 'Adicione ao menos um serviço à ordem de serviço.', 'OS sem itens é recusada');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}', null) $$,
  '22023', 'Adicione ao menos um serviço à ordem de serviço.', 'itens nulos são recusados');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000002","payment_method":"pix"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '22023', 'A moto selecionada não pertence ao cliente.', 'moto de outro cliente é recusada');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}',
    '[{"service_id":"22000000-0000-4000-8000-0000000000ff","price":10}]') $$,
  '22023', 'Serviço não encontrado no catálogo.', 'serviço inexistente é recusado');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix","down_payment":10.01}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '22023', 'A entrada não pode ser maior que o valor total.', 'entrada maior que o total é recusada');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"installments"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '23514', null, 'parcelado sem nº de parcelas é recusado');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"installments","installments":1}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '23514', null, 'parcelado em 1x é recusado');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"installments","installments":25}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '23514', null, 'mais de 24 parcelas é recusado');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix","installments":3}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '23514', null, 'parcelas com forma Pix é recusado');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"boleto"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '23514', null, 'forma de pagamento desconhecida é recusada');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":-1}]') $$,
  '22023', 'Informe um preço válido (zero ou mais) para cada serviço.', 'preço negativo é recusado com mensagem própria');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001"}]') $$,
  '22023', 'Informe um preço válido (zero ou mais) para cada serviço.', 'item sem preço é recusado');
select throws_ok($$ select public.save_service_order('{"client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix","mileage":-5}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  '23514', null, 'KM negativo é recusado');

-- ---------- Edição ----------
select lives_ok($$ select public.save_service_order(
    jsonb_build_object('id', (select id from os_teste where rotulo = 'parcelada'),
      'client_id','20000000-0000-4000-8000-000000000001','motorcycle_id','21000000-0000-4000-8000-000000000001','payment_method','pix'),
    '[{"service_id":"22000000-0000-4000-8000-000000000002","price":99.99}]') $$,
  'edita a OS e substitui os itens');
select results_eq($$ select total, installments, down_payment from public.service_orders where id = (select id from os_teste where rotulo = 'parcelada') $$,
  $$ values (99.99::numeric(10,2), null::smallint, 0::numeric(10,2)) $$, 'total recalculado e parcelas zeradas');
select is((select count(*)::int from public.service_order_items where service_order_id = (select id from os_teste where rotulo = 'parcelada')), 1,
  'itens antigos removidos');
select throws_ok($$ select public.save_service_order('{"id":"23000000-0000-4000-8000-0000000000ff","client_id":"20000000-0000-4000-8000-000000000001","motorcycle_id":"21000000-0000-4000-8000-000000000001","payment_method":"pix"}',
    '[{"service_id":"22000000-0000-4000-8000-000000000001","price":10}]') $$,
  'P0002', 'Ordem de serviço não encontrada.', 'editar OS inexistente é erro');

-- ---------- Permissões diretas nas tabelas ----------
select throws_ok($$ insert into public.service_orders (client_id, motorcycle_id) values ('20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'anon não insere OS direto (só pela função)');
select throws_ok($$ update public.service_orders set total = 1 $$, '42501', null, 'anon não altera o total direto');
select throws_ok($$ insert into public.service_order_items (service_order_id, service_id, service_name, price) values ((select id from os_teste limit 1), '22000000-0000-4000-8000-000000000001', 'x', 1) $$,
  '42501', null, 'anon não insere item direto');
select lives_ok($$ update public.service_orders set status = 'approved' where id = (select id from os_teste where rotulo = 'gratis') $$, 'anon troca o status');
select throws_ok($$ update public.service_orders set status = 'pago' where id = (select id from os_teste where rotulo = 'gratis') $$, '23514', null, 'status desconhecido é recusado');

-- ---------- Exclusão ----------
select throws_ok($$ delete from public.clients where id = '20000000-0000-4000-8000-000000000001' $$, '23503', null, 'cliente com OS não pode ser excluído');
select lives_ok($$ delete from public.service_orders where id = (select id from os_teste where rotulo = 'gratis') $$, 'anon exclui OS');
select is((select count(*)::int from public.service_order_items where service_order_id = (select id from os_teste where rotulo = 'gratis')), 0, 'itens da OS excluída vão junto');

select * from finish();
rollback;
