-- Dados de desenvolvimento, carregados em `npm run db:reset`.
-- A linha padrão de design_settings já é criada pela migration.

-- Catálogo de serviços
insert into public.services (id, name) values
  ('00000000-0000-4000-a000-000000000001', 'Troca de óleo'),
  ('00000000-0000-4000-a000-000000000002', 'Revisão completa'),
  ('00000000-0000-4000-a000-000000000003', 'Troca de relação (kit)'),
  ('00000000-0000-4000-a000-000000000004', 'Troca de pastilha de freio'),
  ('00000000-0000-4000-a000-000000000005', 'Regulagem de carburador'),
  ('00000000-0000-4000-a000-000000000006', 'Troca de pneu'),
  ('00000000-0000-4000-a000-000000000007', 'Limpeza de bicos injetores');

-- Clientes e motos
insert into public.clients (id, name, phone, document, address) values
  ('00000000-0000-4000-b000-000000000001', 'Carlos Henrique Souza', '31987654321', '52998224725', 'Rua das Flores, 120 - Centro'),
  ('00000000-0000-4000-b000-000000000002', 'Mariana Lopes', '31991234567', '11444777000161', null);

insert into public.motorcycles (id, client_id, model, color, plate) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'Honda CG 160 Fan', 'Vermelha', 'ABC1D23'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 'Yamaha Factor 150', 'Preta', 'HGT4521'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002', 'Honda Biz 125', 'Branca', 'QWE2R34');

-- Ordens de serviço (pela função, que calcula o total)
select public.save_service_order(
  '{"client_id":"00000000-0000-4000-b000-000000000001","motorcycle_id":"00000000-0000-4000-c000-000000000001","mileage":23500,"payment_method":"installments","installments":3,"down_payment":100,"estimated_time":"2 dias","notes":"Cliente reclamou de barulho na corrente.","customer_notes":"Peças inclusas no valor."}',
  '[{"service_id":"00000000-0000-4000-a000-000000000001","price":60},{"service_id":"00000000-0000-4000-a000-000000000003","price":250},{"service_id":"00000000-0000-4000-a000-000000000004","price":90}]'
);

select public.save_service_order(
  '{"client_id":"00000000-0000-4000-b000-000000000002","motorcycle_id":"00000000-0000-4000-c000-000000000003","mileage":8900,"payment_method":"pix","status":"awaiting_approval","estimated_time":"Até sexta"}',
  '[{"service_id":"00000000-0000-4000-a000-000000000002","price":180}]'
);
