-- Gestão financeira: movimentações de estoque, venda/estorno, conclusão da OS, caixa, lançamentos,
-- balanço (financial_summary) e extrato (financial_statement). Papel anon, como o app.
-- Os fluxos usam datas de 2001 para não misturar com dados do seed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

-- Cenário (como postgres): cliente, moto e serviço para as OS.
insert into public.clients (id, name, phone, document) values
  ('70000000-0000-4000-8000-000000000001', 'Cliente Financeiro DB', '31999997777', '70000000001');
insert into public.motorcycles (id, client_id, model, color, plate) values
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'FIN1A11');
insert into public.services (id, name) values ('72000000-0000-4000-8000-000000000001', 'Serviço Financeiro DB');

create temp table ids_teste (rotulo text primary key, id uuid);
grant all on ids_teste to anon;

set local role anon;

-- ---------- Movimentações automáticas do estoque ----------
insert into public.parts (id, name, purchase_price, sale_price, quantity, purchase_date)
  values ('73000000-0000-4000-8000-000000000001', 'Pastilha Fin DB', 40, 70, 5, '2001-03-10');
select results_eq(
  $$ select kind, quantity, unit_price, unit_cost, total, movement_date, part_name from public.part_movements
      where part_id = '73000000-0000-4000-8000-000000000001' $$,
  $$ values ('purchase'::text, 5, 40.00::numeric(10,2), 40.00::numeric(10,2), 200.00::numeric(12,2), '2001-03-10'::date, 'Pastilha Fin DB'::text) $$,
  'cadastro com quantidade gera compra na data de entrada');

insert into public.parts (id, name, purchase_price, quantity) values ('73000000-0000-4000-8000-000000000002', 'Óleo Fin DB', 30, 0);
select is((select count(*) from public.part_movements where part_id = '73000000-0000-4000-8000-000000000002'), 0::bigint,
  'cadastro com quantidade zero não gera movimentação');

select is((select quantity from public.adjust_part_quantity('73000000-0000-4000-8000-000000000002', 3)), 3, '+3 soma no estoque');
select results_eq(
  $$ select kind, quantity, total, movement_date from public.part_movements where part_id = '73000000-0000-4000-8000-000000000002' $$,
  $$ values ('purchase'::text, 3, 90.00::numeric(12,2), public.local_today()) $$,
  'entrada pelo + vira compra de hoje pelo valor de compra');
select is((select quantity from public.adjust_part_quantity('73000000-0000-4000-8000-000000000002', -1)), 2, '−1 tira do estoque');
select is((select count(*) from public.part_movements where part_id = '73000000-0000-4000-8000-000000000002' and kind = 'adjustment' and quantity = 1),
  1::bigint, 'saída pelo − vira ajuste (sem efeito no caixa)');
select throws_ok($$ select public.adjust_part_quantity('73000000-0000-4000-8000-000000000002', 0) $$, '22023',
  'Informe uma quantidade diferente de zero.', 'ajuste zero é recusado');

-- Escrita direta nas movimentações é bloqueada
select throws_ok($$ insert into public.part_movements (part_name, kind, quantity, unit_price) values ('X', 'sale', 1, 1) $$, '42501', null,
  'anon não insere movimentação direto');
select throws_ok($$ update public.part_movements set quantity = 99 $$, '42501', null, 'anon não altera movimentação');
select throws_ok($$ delete from public.part_movements $$, '42501', null, 'anon não apaga movimentação direto');

-- ---------- Venda ----------
select lives_ok($$ insert into ids_teste select 'venda', id from public.sell_part('73000000-0000-4000-8000-000000000001', 2, 75.5, '2001-03-12', '  Balcão  ') $$,
  'vende 2 unidades');
select results_eq(
  $$ select kind, quantity, unit_price, unit_cost, total, movement_date, notes from public.part_movements where id = (select id from ids_teste where rotulo = 'venda') $$,
  $$ values ('sale'::text, 2, 75.50::numeric(10,2), 40.00::numeric(10,2), 151.00::numeric(12,2), '2001-03-12'::date, 'Balcão'::text) $$,
  'venda grava preço, custo atual, total, data e observação aparada');
select is((select quantity from public.parts where id = '73000000-0000-4000-8000-000000000001'), 3, 'venda baixa o estoque');
select lives_ok($$ insert into ids_teste select 'venda-tudo', id from public.sell_part('73000000-0000-4000-8000-000000000002', 2, 0, '2001-03-12') $$,
  'vender exatamente o estoque (e com preço zero) é válido');
select is((select quantity from public.parts where id = '73000000-0000-4000-8000-000000000002'), 0, 'estoque zerado');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000002', 1, 10, '2001-03-12') $$, '22023', 'Estoque insuficiente.',
  'vender sem estoque é recusado');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 4, 10, '2001-03-12') $$, '22023', 'Estoque insuficiente.',
  'vender um a mais que o estoque é recusado');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 0, 10, '2001-03-12') $$, '22023',
  'Informe uma quantidade de pelo menos 1.', 'quantidade zero é recusada');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', -1, 10, '2001-03-12') $$, '22023',
  'Informe uma quantidade de pelo menos 1.', 'quantidade negativa é recusada');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 1, -0.01, '2001-03-12') $$, '22023',
  'Informe um preço de venda válido.', 'preço negativo é recusado');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 1, null, '2001-03-12') $$, '22023',
  'Informe um preço de venda válido.', 'preço vazio é recusado');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 1, 100000000, '2001-03-12') $$, '22023',
  'Informe um preço de venda válido.', 'preço acima do limite é recusado');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 1, 10, null) $$, '22023',
  'Informe a data da venda.', 'venda sem data é recusada');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-000000000001', 1, 10, '2001-03-12', repeat('a', 301)) $$, '22023',
  'A observação pode ter no máximo 300 caracteres.', 'observação acima de 300 caracteres é recusada');
select throws_ok($$ select public.sell_part('73000000-0000-4000-8000-0000000000ff', 1, 10, '2001-03-12') $$, 'P0002',
  'Peça não encontrada.', 'venda de peça inexistente');
select is((select quantity from public.parts where id = '73000000-0000-4000-8000-000000000001'), 3, 'vendas recusadas não mexem no estoque');

-- ---------- Estorno ----------
select is((select quantity from public.cancel_part_sale((select id from ids_teste where rotulo = 'venda-tudo'))), 2, 'estorno devolve as unidades');
select is((select count(*) from public.part_movements where id = (select id from ids_teste where rotulo = 'venda-tudo')), 0::bigint, 'estorno apaga a venda');
select throws_ok($$ select public.cancel_part_sale((select id from public.part_movements where kind = 'purchase' and part_id = '73000000-0000-4000-8000-000000000001')) $$,
  '22023', 'Só vendas podem ser estornadas.', 'compra não pode ser estornada');
select throws_ok($$ select public.cancel_part_sale('73000000-0000-4000-8000-0000000000ff') $$, 'P0002', 'Venda não encontrada.', 'estorno de venda inexistente');

-- Excluir a peça mantém o histórico
insert into public.parts (id, name, purchase_price, sale_price, quantity, purchase_date)
  values ('73000000-0000-4000-8000-000000000003', 'Corrente Fin DB', 10, 20, 2, '2001-03-11');
insert into ids_teste select 'venda-excluida', id from public.sell_part('73000000-0000-4000-8000-000000000003', 1, 20, '2001-03-11');
select lives_ok($$ delete from public.parts where id = '73000000-0000-4000-8000-000000000003' $$, 'exclui peça com movimentações');
select is((select count(*) from public.part_movements where part_name = 'Corrente Fin DB' and part_id is null), 2::bigint,
  'movimentações da peça excluída ficam com part_id nulo');
select is((select public.cancel_part_sale((select id from ids_teste where rotulo = 'venda-excluida'))), null,
  'estorno de venda de peça excluída só apaga a venda');

-- ---------- OS: completed_at ----------
insert into ids_teste select 'os', public.save_service_order(
  '{"client_id":"70000000-0000-4000-8000-000000000001","motorcycle_id":"71000000-0000-4000-8000-000000000001","payment_method":"pix"}',
  '[{"service_id":"72000000-0000-4000-8000-000000000001","price":300}]');
select is((select completed_at from public.service_orders where id = (select id from ids_teste where rotulo = 'os')), null, 'OS nova não tem data de conclusão');
update public.service_orders set status = 'completed' where id = (select id from ids_teste where rotulo = 'os');
select isnt((select completed_at from public.service_orders where id = (select id from ids_teste where rotulo = 'os')), null, 'concluir preenche completed_at');
select throws_ok($$ update public.service_orders set completed_at = now() $$, '42501', null, 'anon não grava completed_at direto');
update public.service_orders set status = 'in_progress' where id = (select id from ids_teste where rotulo = 'os');
select is((select completed_at from public.service_orders where id = (select id from ids_teste where rotulo = 'os')), null, 'reabrir limpa completed_at');
update public.service_orders set status = 'completed' where id = (select id from ids_teste where rotulo = 'os');

-- Fixa a conclusão em 2001-03-12 às 23:30 (horário da oficina) para testar o fuso. Como postgres: anon não grava a coluna.
reset role;
update public.service_orders set completed_at = '2001-03-12 23:30:00 America/Sao_Paulo' where id = (select id from ids_teste where rotulo = 'os');
set local role anon;
update public.service_orders set status = 'completed' where id = (select id from ids_teste where rotulo = 'os');
select is((select completed_at from public.service_orders where id = (select id from ids_teste where rotulo = 'os')),
  '2001-03-12 23:30:00 America/Sao_Paulo'::timestamptz, 'update sem troca real de status mantém completed_at');

-- OS não concluída (não entra no balanço)
insert into ids_teste select 'os-aberta', public.save_service_order(
  '{"client_id":"70000000-0000-4000-8000-000000000001","motorcycle_id":"71000000-0000-4000-8000-000000000001","payment_method":"pix"}',
  '[{"service_id":"72000000-0000-4000-8000-000000000001","price":999}]');

-- ---------- Caixa ----------
select throws_ok($$ insert into public.cash_settings (id) values (2) $$, '42501', null, 'anon não cria outra linha de caixa');
select lives_ok($$ update public.cash_settings set opening_balance = -50.25, opening_date = '2001-03-11' where id = 1 $$, 'define caixa inicial (aceita negativo)');

-- ---------- Lançamentos ----------
select throws_ok($$ insert into public.cash_entries (kind, description, amount) values ('expense', '   ', 10) $$, '23514', null, 'descrição só com espaços é recusada');
select throws_ok($$ insert into public.cash_entries (kind, description, amount) values ('expense', repeat('a', 121), 10) $$, '23514', null, 'descrição com 121 caracteres é recusada');
select throws_ok($$ insert into public.cash_entries (kind, description, amount) values ('expense', 'Luz', 0) $$, '23514', null, 'valor zero é recusado');
select throws_ok($$ insert into public.cash_entries (kind, description, amount) values ('expense', 'Luz', -1) $$, '23514', null, 'valor negativo é recusado');
select throws_ok($$ insert into public.cash_entries (kind, description, amount) values ('outro', 'Luz', 1) $$, '23514', null, 'tipo inválido é recusado');
select throws_ok($$ insert into public.cash_entries (kind, description, amount, notes) values ('income', 'X', 1, repeat('a', 301)) $$, '23514', null, 'observação com 301 caracteres é recusada');
select lives_ok($$ insert into public.cash_entries (kind, description, amount, entry_date) values
    ('expense', 'Aluguel Fin DB', 100, '2001-03-12'),
    ('income', 'Aporte Fin DB', 20, '2001-03-13'),
    ('expense', 'Antes do caixa Fin DB', 7, '2001-03-10') $$, 'cria lançamentos de entrada e saída');

-- ---------- Balanço ----------
-- Fluxos de 2001 (caixa inicial −50,25 em 11/03):
--   10/03: compra 200 (5× pastilha) e saída 7
--   11/03: compra 20 (corrente excluída; a venda dela foi estornada)
--   12/03: venda 151 (custo 80) + OS 300 (concluída às 23:30) + aluguel 100 (a venda do óleo foi estornada)
--   13/03: aporte 20
create temp table resumo as select public.financial_summary('2001-03-12', '2001-03-12') as r;
select results_eq(
  $$ select (r->>'os_total')::numeric, (r->>'os_count')::int, (r->>'sales_total')::numeric, (r->>'sales_cost')::numeric,
            (r->>'sales_profit')::numeric, (r->>'sales_units')::int, (r->>'expense_total')::numeric, (r->>'period_net')::numeric from resumo $$,
  $$ values (300::numeric, 1, 151::numeric, 80::numeric, 71::numeric, 2, 100::numeric, 351::numeric) $$,
  'balanço do dia: OS concluída no fuso local, venda com custo/lucro, despesa e saldo');
select results_eq(
  $$ select (r->>'cash_start')::numeric, (r->>'cash_end')::numeric from resumo $$,
  $$ values (-70.25::numeric, 280.75::numeric) $$,
  'caixa no início (inicial − compra do dia 11) e no fim do período');

select results_eq(
  $$ select (r->>'purchases_total')::numeric, (r->>'expense_total')::numeric, (r->>'period_out')::numeric
       from (select public.financial_summary('2001-03-10', '2001-03-10') as r) x $$,
  $$ values (200::numeric, 7::numeric, 207::numeric) $$,
  'movimentos antes da data inicial do caixa entram no balanço do período');
select is((select (public.financial_summary('2001-03-10', '2001-03-10')->>'cash_end')::numeric), -50.25::numeric,
  '...mas não entram no caixa');
select is((select (public.financial_summary('2001-03-13', '2001-03-13')->>'income_total')::numeric), 20::numeric, 'entrada manual no balanço');
select is((select (public.financial_summary('2001-03-13', '2001-03-13')->>'os_total')::numeric), 0::numeric,
  'OS concluída às 23:30 do dia 12 (02:30 UTC do dia 13) conta no dia 12');
select is((select (public.financial_summary('2001-03-11', '2001-03-13')->>'period_net')::numeric), 351::numeric - 20 + 20,
  'período com limites inclusivos soma todos os dias');
select is((select (public.financial_summary('2001-03-14', '2001-03-20')->>'period_net')::numeric), 0::numeric, 'período sem movimento dá zero');
select is((select (public.financial_summary('2001-03-12', '2001-03-12')->>'os_count')::int), 1, 'OS não concluída não entra');
select throws_ok($$ select public.financial_summary('2001-03-13', '2001-03-12') $$, '22023', 'A data inicial não pode ser depois da final.',
  'data inicial depois da final é recusada');
select throws_ok($$ select public.financial_summary(null, '2001-03-12') $$, '22023', 'Informe o período.', 'período sem data é recusado');

-- ---------- Extrato ----------
select results_eq(
  $$ select source, amount from public.financial_statement('2001-03-12', '2001-03-13') order by entry_date desc, source $$,
  $$ values ('income'::text, 20::numeric), ('expense'::text, -100::numeric), ('os'::text, 300::numeric), ('sale'::text, 151::numeric) $$,
  'extrato com sinal (+ entra, − sai)');
select is((select entry_date from public.financial_statement('2001-03-10', '2001-03-13') limit 1), '2001-03-13'::date,
  'extrato começa pelo dia mais recente');
select is((select description from public.financial_statement('2001-03-12', '2001-03-12') where source = 'os'),
  'OS #' || (select number from public.service_orders where id = (select id from ids_teste where rotulo = 'os')) || ' · Cliente Financeiro DB',
  'descrição da OS com número e cliente');
select throws_ok($$ select * from public.financial_statement('2001-03-13', '2001-03-12') $$, '22023', 'Período inválido.', 'extrato com período invertido');

select * from finish();
rollback;
