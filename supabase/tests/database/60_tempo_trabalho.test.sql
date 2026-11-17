-- Tempo de trabalho da OS (estimativa interna + cronômetro) e logo/Instagram da oficina (papel anon, como o app).
-- Dentro da transação now() é fixo: para simular tempo passando, o cenário recua work_started_at como postgres.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

insert into public.clients (id, name, phone, document) values
  ('60000000-0000-4000-8000-000000000001', 'Cliente Tempo DB', '31999996001', '86000000001');
insert into public.motorcycles (id, client_id, model, color, plate) values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'CG', 'Preta', 'TMP6A01');
insert into public.services (id, name) values ('62000000-0000-4000-8000-000000000001', 'Serviço Tempo DB');

create temp table os_teste (rotulo text primary key, id uuid);
grant all on os_teste to anon;

-- Recua o início do cronômetro (como postgres) para simular segundos já corridos.
create function pg_temp.recuar(p_rotulo text, p_segundos integer) returns void language sql as $$
  update public.service_orders set work_started_at = now() - make_interval(secs => p_segundos)
  where id = (select id from os_teste where rotulo = p_rotulo);
$$;
create function pg_temp.os(p_rotulo text) returns uuid language sql as $$ select id from os_teste where rotulo = p_rotulo $$;
grant execute on function pg_temp.os(text) to anon;

set local role anon;

-- ---------- Estimativa de trabalho (save_service_order) ----------
select lives_ok($$ insert into os_teste select 'os', public.save_service_order(
    '{"client_id":"60000000-0000-4000-8000-000000000001","motorcycle_id":"61000000-0000-4000-8000-000000000001","payment_method":"pix",
      "estimated_time":"amanhã","work_estimate_minutes":30}',
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":100}]') $$,
  'cria OS com previsão para o cliente e estimativa interna de 30 min');
select results_eq(
  $$ select estimated_time, work_estimate_minutes, work_seconds, work_started_at from public.service_orders where id = pg_temp.os('os') $$,
  $$ values ('amanhã'::text, 30, 0, null::timestamptz) $$,
  'OS nova: as duas estimativas gravadas, cronômetro zerado e pausado');

select lives_ok($$ insert into os_teste select 'sem-estimativa', public.save_service_order(
    '{"client_id":"60000000-0000-4000-8000-000000000001","motorcycle_id":"61000000-0000-4000-8000-000000000001","payment_method":"pix"}',
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":10}]') $$,
  'estimativa de trabalho é opcional');
select is((select work_estimate_minutes from public.service_orders where id = pg_temp.os('sem-estimativa')), null, 'sem estimativa fica nula');

select throws_ok($$ select public.save_service_order(
    '{"client_id":"60000000-0000-4000-8000-000000000001","motorcycle_id":"61000000-0000-4000-8000-000000000001","payment_method":"pix","work_estimate_minutes":0}',
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":10}]') $$, '23514', null, 'estimativa de 0 min é recusada');
select throws_ok($$ select public.save_service_order(
    '{"client_id":"60000000-0000-4000-8000-000000000001","motorcycle_id":"61000000-0000-4000-8000-000000000001","payment_method":"pix","work_estimate_minutes":-5}',
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":10}]') $$, '23514', null, 'estimativa negativa é recusada');
select throws_ok($$ select public.save_service_order(
    '{"client_id":"60000000-0000-4000-8000-000000000001","motorcycle_id":"61000000-0000-4000-8000-000000000001","payment_method":"pix","work_estimate_minutes":6001}',
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":10}]') $$, '23514', null, 'estimativa acima de 100 h é recusada');
select lives_ok($$ select public.save_service_order(
    '{"client_id":"60000000-0000-4000-8000-000000000001","motorcycle_id":"61000000-0000-4000-8000-000000000001","payment_method":"pix","work_estimate_minutes":6000}',
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":10}]') $$, 'estimativa de exatamente 100 h é aceita');

-- ---------- Cronômetro ----------
select is((select work_started_at from public.start_service_order_timer(pg_temp.os('os'))), now(), 'iniciar grava o horário do banco');
reset role;
select pg_temp.recuar('os', 90);
set local role anon;
select is((select work_started_at from public.start_service_order_timer(pg_temp.os('os'))), now() - interval '90 seconds',
  'iniciar de novo com o cronômetro ligado não reinicia a contagem');

select results_eq($$ select work_seconds, work_started_at from public.pause_service_order_timer(pg_temp.os('os')) $$,
  $$ values (90, null::timestamptz) $$, 'pausar soma o trecho em andamento (90 s) e desliga');
select results_eq($$ select work_seconds, work_started_at from public.pause_service_order_timer(pg_temp.os('os')) $$,
  $$ values (90, null::timestamptz) $$, 'pausar de novo não muda nada');

select lives_ok($$ select public.start_service_order_timer(pg_temp.os('os')) $$, 'continua depois de pausar');
reset role;
select pg_temp.recuar('os', 30);
set local role anon;
select is((select work_seconds from public.pause_service_order_timer(pg_temp.os('os'))), 120, 'continuar acumula sobre o tempo anterior (90 + 30)');

select lives_ok($$ select public.save_service_order(
    jsonb_build_object('id', pg_temp.os('os'), 'client_id', '60000000-0000-4000-8000-000000000001', 'motorcycle_id', '61000000-0000-4000-8000-000000000001',
                       'payment_method', 'pix', 'work_estimate_minutes', 45),
    '[{"service_id":"62000000-0000-4000-8000-000000000001","price":100}]') $$, 'editar a OS muda a estimativa');
select results_eq($$ select work_estimate_minutes, work_seconds from public.service_orders where id = pg_temp.os('os') $$,
  $$ values (45, 120) $$, 'editar a OS não zera o tempo gasto');

-- ---------- Ajuste manual ----------
select results_eq($$ select work_seconds, work_started_at from public.set_service_order_work_time(pg_temp.os('os'), 1800) $$,
  $$ values (1800, null::timestamptz) $$, 'ajuste manual com o cronômetro pausado mantém pausado');
select lives_ok($$ select public.start_service_order_timer(pg_temp.os('os')) $$, 'liga para ajustar rodando');
reset role;
select pg_temp.recuar('os', 600);
set local role anon;
select results_eq($$ select work_seconds, work_started_at from public.set_service_order_work_time(pg_temp.os('os'), 60) $$,
  $$ values (60, now()) $$, 'ajuste com o cronômetro ligado descarta o trecho em andamento e continua a partir do valor');
select is((select work_seconds from public.set_service_order_work_time(pg_temp.os('os'), 0)), 0, 'ajuste para zero é aceito');
select lives_ok($$ select public.set_service_order_work_time(pg_temp.os('os'), 3600000) $$, 'ajuste de exatamente 1000 h é aceito');
select throws_ok($$ select public.set_service_order_work_time(pg_temp.os('os'), -1) $$, '22023', 'Informe um tempo entre 0 e 1000 horas.', 'tempo negativo é recusado');
select throws_ok($$ select public.set_service_order_work_time(pg_temp.os('os'), 3600001) $$, '22023', 'Informe um tempo entre 0 e 1000 horas.', 'tempo acima de 1000 h é recusado');
select throws_ok($$ select public.set_service_order_work_time(pg_temp.os('os'), null) $$, '22023', 'Informe um tempo entre 0 e 1000 horas.', 'tempo nulo é recusado');

reset role;
select pg_temp.recuar('os', 7200);
set local role anon;
select is((select work_seconds from public.pause_service_order_timer(pg_temp.os('os'))), 3600000, 'acumulado nunca passa do limite de 1000 h');

-- ---------- OS inexistente ----------
select throws_ok($$ select public.start_service_order_timer('00000000-0000-4000-8000-000000000666') $$, 'P0002', 'Ordem de serviço não encontrada.', 'iniciar: OS inexistente');
select throws_ok($$ select public.pause_service_order_timer('00000000-0000-4000-8000-000000000666') $$, 'P0002', 'Ordem de serviço não encontrada.', 'pausar: OS inexistente');
select throws_ok($$ select public.set_service_order_work_time('00000000-0000-4000-8000-000000000666', 10) $$, 'P0002', 'Ordem de serviço não encontrada.', 'ajustar: OS inexistente');

-- ---------- Status final pausa e bloqueia o cronômetro ----------
select lives_ok($$ select public.set_service_order_work_time(pg_temp.os('os'), 100) $$, 'zera para o cenário de status');
select lives_ok($$ select public.start_service_order_timer(pg_temp.os('os')) $$, 'cronômetro ligado antes de concluir');
reset role;
select pg_temp.recuar('os', 50);
set local role anon;
update public.service_orders set status = 'completed' where id = pg_temp.os('os');
select results_eq($$ select status, work_seconds, work_started_at from public.service_orders where id = pg_temp.os('os') $$,
  $$ values ('completed'::text, 150, null::timestamptz) $$, 'concluir a OS pausa o cronômetro e guarda o tempo');
select throws_ok($$ select public.start_service_order_timer(pg_temp.os('os')) $$, '22023',
  'Não é possível iniciar o cronômetro de uma OS concluída, recusada ou cancelada.', 'não inicia em OS concluída');
update public.service_orders set status = 'canceled' where id = pg_temp.os('sem-estimativa');
select throws_ok($$ select public.start_service_order_timer(pg_temp.os('sem-estimativa')) $$, '22023', null, 'não inicia em OS cancelada');
select is((select work_seconds from public.set_service_order_work_time(pg_temp.os('os'), 200)), 200, 'OS concluída ainda aceita ajuste manual');

-- ---------- Permissões ----------
select throws_ok($$ update public.service_orders set work_seconds = 999 where id = pg_temp.os('os') $$, '42501', null,
  'anon não altera o tempo direto na tabela (só pelas funções)');

-- ---------- Logo e Instagram ----------
select lives_ok($$ update public.design_settings set logo = 'data:image/png;base64,iVBORw0KGgo=', instagram = 'manus.motos_oficial' where id = 1 $$,
  'anon grava logo (data URL) e Instagram');
select throws_ok($$ update public.design_settings set logo = 'data:image/svg+xml;base64,PHN2Zy8+' where id = 1 $$, '23514', null, 'logo SVG é recusado');
select throws_ok($$ update public.design_settings set logo = 'https://exemplo.com/logo.png' where id = 1 $$, '23514', null, 'logo que não é data URL é recusado');
select throws_ok($$ update public.design_settings set logo = 'data:image/png;base64,' || repeat('A', 500000) where id = 1 $$, '23514', null, 'logo acima do limite é recusado');
select throws_ok($$ update public.design_settings set instagram = '@manus motos' where id = 1 $$, '23514', null, 'Instagram com @ ou espaço é recusado');

select * from finish();
rollback;
