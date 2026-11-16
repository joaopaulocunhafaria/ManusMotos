-- Agendamentos (appointments), papel anon.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into public.clients (id, name, phone, document) values ('40000000-0000-4000-8000-000000000001', 'Cliente Agenda DB', '31955554444', '60000000001');

set local role anon;

select lives_ok($$ insert into public.appointments (id, client_name, client_id, scheduled_date, start_time, duration_minutes)
  values ('41000000-0000-4000-8000-000000000001', 'Cliente Agenda DB', '40000000-0000-4000-8000-000000000001', '2099-01-05', '09:00', 90) $$,
  'cria agendamento ligado a cliente');
select lives_ok($$ insert into public.appointments (client_name, scheduled_date, start_time) values ('Sem cadastro', '2099-01-05', '09:00') $$,
  'cria agendamento só com nome, no mesmo horário (sobreposição é permitida)');
select is((select duration_minutes from public.appointments where client_name = 'Sem cadastro'), 60::smallint, 'duração padrão de 60 min');
select throws_ok($$ insert into public.appointments (client_name, scheduled_date, start_time) values ('   ', '2099-01-05', '09:00') $$, '23514', null, 'nome vazio é recusado');
select throws_ok($$ insert into public.appointments (client_name, scheduled_date, start_time, duration_minutes) values ('X', '2099-01-05', '09:00', 20) $$, '23514', null, 'duração fora de múltiplos de 15 é recusada');
select throws_ok($$ insert into public.appointments (client_name, scheduled_date, start_time, duration_minutes) values ('X', '2099-01-05', '09:00', 0) $$, '23514', null, 'duração zero é recusada');
select throws_ok($$ insert into public.appointments (client_name, scheduled_date, start_time, duration_minutes) values ('X', '2099-01-05', '09:00', 615) $$, '23514', null, 'duração acima de 10 h é recusada');
select lives_ok($$ update public.appointments set start_time = '14:30' where id = '41000000-0000-4000-8000-000000000001' $$, 'anon edita agendamento');

reset role;
delete from public.clients where id = '40000000-0000-4000-8000-000000000001';
select is((select client_id from public.appointments where id = '41000000-0000-4000-8000-000000000001'), null, 'excluir o cliente mantém o agendamento sem vínculo');

set local role anon;
select lives_ok($$ delete from public.appointments where id = '41000000-0000-4000-8000-000000000001' $$, 'anon exclui agendamento');

select * from finish();
rollback;
