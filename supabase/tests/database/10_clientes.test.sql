-- Clientes, motos e a função save_client (papel anon, como o app).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

set local role anon;

-- ---------- Constraints ----------
select throws_ok($$ insert into public.clients (name, phone, document) values ('   ', '31999990000', '90000000001') $$,
  '23514', null, 'nome só com espaços é recusado');
select throws_ok($$ insert into public.clients (name, phone, document) values ('A', '319999900', '90000000001') $$,
  '23514', null, 'telefone com 9 dígitos é recusado');
select throws_ok($$ insert into public.clients (name, phone, document) values ('A', '(31)99999-0000', '90000000001') $$,
  '23514', null, 'telefone com máscara é recusado (gravar só dígitos)');
select throws_ok($$ insert into public.clients (name, phone, document) values ('A', '31999990000', '900000000012') $$,
  '23514', null, 'documento com 12 dígitos é recusado');
select lives_ok($$ insert into public.clients (id, name, phone, document) values ('10000000-0000-4000-8000-000000000001', 'Teste DB', '3133334444', '90000000001') $$,
  'telefone fixo (10 dígitos) e CPF (11) são aceitos');
select throws_ok($$ insert into public.clients (name, phone, document) values ('Outro', '31999990000', '90000000001') $$,
  '23505', null, 'CPF/CNPJ duplicado é recusado');

select throws_ok($$ insert into public.motorcycles (client_id, model, color, plate) values ('10000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'abc1d23') $$,
  '23514', null, 'placa minúscula é recusada (gravar normalizada)');
select throws_ok($$ insert into public.motorcycles (client_id, model, color, plate) values ('10000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'ABC-1234') $$,
  '23514', null, 'placa com hífen é recusada');
select lives_ok($$ insert into public.motorcycles (client_id, model, color, plate) values ('10000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'ZZT1234') $$,
  'placa no formato antigo é aceita');

-- ---------- save_client ----------
select throws_ok($$ select public.save_client(null, '{"name":"Sem moto","phone":"31999990001","document":"90000000002"}', '[]') $$,
  '22023', 'Cadastre ao menos uma moto.', 'cliente sem moto é recusado');

select throws_ok($$ select public.save_client(null,
    '{"name":"Placa repetida","phone":"31999990002","document":"90000000003"}',
    '[{"model":"CG","color":"Azul","plate":"ZZT1234"}]') $$,
  '23505', null, 'placa repetida falha...');
select is((select count(*)::int from public.clients where document = '90000000003'), 0, '...e não deixa o cliente salvo pela metade');

select lives_ok($$ select public.save_client(null,
    '{"name":"  Novo DB  ","phone":"31999990004","document":"90000000004","address":"   "}',
    '[{"model":"Biz","color":"Branca","plate":"ZZQ1A11"},{"model":"Fan","color":"Preta","plate":"ZZQ1A12"}]') $$,
  'cria cliente com duas motos');
select results_eq($$ select name, address from public.clients where document = '90000000004' $$,
  $$ values ('Novo DB'::text, null::text) $$, 'nome aparado e endereço em branco vira nulo');

-- Atualiza: remove uma moto, edita a outra e adiciona uma nova (a placa da removida pode ser reutilizada).
select lives_ok(format($$ select public.save_client(%L,
    '{"name":"Novo DB","phone":"31999990004","document":"90000000004"}',
    %L, %L) $$,
    (select id from public.clients where document = '90000000004'),
    json_build_array(
      json_build_object('id', (select id from public.motorcycles where plate = 'ZZQ1A11'), 'model', 'Biz 125', 'color', 'Branca', 'plate', 'ZZQ1A11'),
      json_build_object('model', 'Nova', 'color', 'Verde', 'plate', 'ZZQ1A12')
    ),
    array[(select id from public.motorcycles where plate = 'ZZQ1A12')]::uuid[]),
  'atualiza, remove e reaproveita placa na mesma transação');
select results_eq($$ select model from public.motorcycles m join public.clients c on c.id = m.client_id where c.document = '90000000004' order by model $$,
  $$ values ('Biz 125'::text), ('Nova'::text) $$, 'motos resultantes corretas');

select throws_ok($$ select public.save_client('10000000-0000-4000-8000-0000000000ff',
    '{"name":"X","phone":"31999990005","document":"90000000005"}', '[{"model":"CG","color":"Azul","plate":"ZZW1A11"}]') $$,
  'P0002', 'Cliente não encontrado.', 'atualizar cliente inexistente é erro');

select throws_ok(format($$ select public.save_client(%L,
    '{"name":"Teste DB","phone":"3133334444","document":"90000000001"}', %L) $$,
    '10000000-0000-4000-8000-000000000001',
    json_build_array(json_build_object('id', (select id from public.motorcycles where plate = 'ZZQ1A11'), 'model', 'Roubo', 'color', 'X', 'plate', 'ZZQ1A11'))),
  'P0002', 'Moto não encontrada para este cliente.', 'não edita moto de outro cliente');

-- ---------- Exclusão ----------
select lives_ok($$ delete from public.clients where id = '10000000-0000-4000-8000-000000000001' $$, 'cliente sem OS pode ser excluído');

select * from finish();
rollback;
