-- Estoque de peças (parts, search_parts, adjust_part_quantity), papel anon.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

set local role anon;

-- Cadastro e constraints
select lives_ok($$ insert into public.parts (id, name, motorcycle_model, year_start, year_end, purchase_price, sale_price, quantity)
  values ('50000000-0000-4000-8000-000000000001', 'Pastilha Estoque DB', 'CG 160', 2015, 2020, 100, 150, 3) $$, 'cria peça completa');
select lives_ok($$ insert into public.parts (id, name) values ('50000000-0000-4000-8000-000000000002', 'Óleo Estoque DB') $$,
  'cria peça só com nome (sem moto nem anos)');
select is((select quantity from public.parts where id = '50000000-0000-4000-8000-000000000002'), 0, 'quantidade padrão 0');
select lives_ok($$ insert into public.parts (name, year_start, year_end) values ('Ano igual DB', 2018, 2018) $$, 'ano final igual ao inicial é válido');
select lives_ok($$ insert into public.parts (name, year_start, year_end) values ('Limites DB', 1950, 2100) $$, 'anos nos limites (1950 e 2100)');
select lives_ok($$ insert into public.parts (name) values (repeat('a', 120)) $$, 'nome com 120 caracteres é válido');

select throws_ok($$ insert into public.parts (name) values ('   ') $$, '23514', null, 'nome só com espaços é recusado');
select throws_ok($$ insert into public.parts (name) values ('') $$, '23514', null, 'nome vazio é recusado');
select throws_ok($$ insert into public.parts (name) values (null) $$, '23502', null, 'nome nulo é recusado');
select throws_ok($$ insert into public.parts (name) values (repeat('a', 121)) $$, '23514', null, 'nome com 121 caracteres é recusado');
select throws_ok($$ insert into public.parts (name, motorcycle_model) values ('X', repeat('m', 81)) $$, '23514', null, 'modelo com 81 caracteres é recusado');
select throws_ok($$ insert into public.parts (name, purchase_price) values ('X', -0.01) $$, '23514', null, 'valor de compra negativo é recusado');
select throws_ok($$ insert into public.parts (name, sale_price) values ('X', -1) $$, '23514', null, 'valor de venda negativo é recusado');
select throws_ok($$ insert into public.parts (name, quantity) values ('X', -1) $$, '23514', null, 'quantidade negativa é recusada');
select throws_ok($$ insert into public.parts (name, year_start) values ('X', 1949) $$, '23514', null, 'ano antes de 1950 é recusado');
select throws_ok($$ insert into public.parts (name, year_start) values ('X', 2101) $$, '23514', null, 'ano depois de 2100 é recusado');
select throws_ok($$ insert into public.parts (name, year_start, year_end) values ('X', 2020, 2019) $$, '23514', null, 'ano final antes do inicial é recusado');
select throws_ok($$ insert into public.parts (name, year_end) values ('X', 2020) $$, '23514', null, 'ano final sem ano inicial é recusado');
select throws_ok($$ insert into public.parts (name, profit_margin) values ('X', 10) $$, '428C9', null, 'margem não pode ser gravada à mão');

-- Duplicidade
select throws_ok($$ insert into public.parts (name, motorcycle_model, year_start, year_end) values ('  PASTILHA estoque db ', ' cg 160 ', 2015, 2020) $$,
  '23505', null, 'mesma peça/moto/anos (ignorando maiúsculas e espaços) é recusada');
select lives_ok($$ insert into public.parts (name, motorcycle_model, year_start, year_end) values ('Pastilha Estoque DB', 'CG 160', 2021, null) $$,
  'mesma peça para outro ano é permitida');

-- Margem de lucro sobre a venda
select is((select profit_margin from public.parts where id = '50000000-0000-4000-8000-000000000001'), 33.33, 'compra 100 e venda 150 = 33,33%');
select is((select profit_margin from public.parts where id = '50000000-0000-4000-8000-000000000002'), null, 'sem valor de venda a margem é nula');
update public.parts set purchase_price = 80, sale_price = 50 where id = '50000000-0000-4000-8000-000000000002';
select is((select profit_margin from public.parts where id = '50000000-0000-4000-8000-000000000002'), -60.00, 'venda abaixo da compra dá margem negativa');
update public.parts set purchase_price = 0, sale_price = 50 where id = '50000000-0000-4000-8000-000000000002';
select is((select profit_margin from public.parts where id = '50000000-0000-4000-8000-000000000002'), 100.00, 'compra zero dá margem de 100%');

-- Busca
insert into public.parts (name) values ('Filtro 100% DB'), ('Filtro 100 DB'), ('Junta_A DB'), ('JuntaBA DB');
select is((select count(*) from public.search_parts('pastilha estoque')), 2::bigint, 'busca parcial sem diferenciar maiúsculas');
select is((select count(*) from public.search_parts('cg 1')), 2::bigint, 'busca pelo modelo da moto');
select is((select count(*) from public.search_parts('2017') where name = 'Pastilha Estoque DB'), 1::bigint, 'ano dentro do intervalo encontra a peça');
select is((select count(*) from public.search_parts('2021') where name = 'Pastilha Estoque DB'), 1::bigint, 'ano único (sem ano final) encontra a peça');
select is((select count(*) from public.search_parts('2022') where name = 'Pastilha Estoque DB'), 0::bigint, 'ano depois do ano único não encontra');
select is((select count(*) from public.search_parts('2014') where name = 'Pastilha Estoque DB'), 0::bigint, 'ano fora do intervalo não encontra a peça');
select is((select count(*) from public.search_parts('100%')), 1::bigint, '% digitado é tratado como texto');
select is((select count(*) from public.search_parts('Junta_')), 1::bigint, '_ digitado é tratado como texto');
select ok((select count(*) from public.search_parts(null)) >= 8, 'sem termo traz tudo');

-- Ajuste de quantidade
select is((select quantity from public.adjust_part_quantity('50000000-0000-4000-8000-000000000001', 2)), 5, 'entrada soma no estoque');
select is((select quantity from public.adjust_part_quantity('50000000-0000-4000-8000-000000000001', -5)), 0, 'saída até zerar é válida');
select throws_ok($$ select public.adjust_part_quantity('50000000-0000-4000-8000-000000000001', -1) $$, '22023', 'Estoque insuficiente.',
  'saída acima do estoque é recusada');
select throws_ok($$ select public.adjust_part_quantity('50000000-0000-4000-8000-0000000000ff', 1) $$, 'P0002', 'Peça não encontrada.',
  'peça inexistente');

-- Edição e exclusão pelo app
select lives_ok($$ update public.parts set name = 'Pastilha Estoque DB editada' where id = '50000000-0000-4000-8000-000000000001' $$, 'anon edita peça');
select lives_ok($$ delete from public.parts where id = '50000000-0000-4000-8000-000000000001' $$, 'anon exclui peça');
select is((select count(*) from public.parts where id = '50000000-0000-4000-8000-000000000001'), 0::bigint, 'peça excluída some');

select * from finish();
rollback;
