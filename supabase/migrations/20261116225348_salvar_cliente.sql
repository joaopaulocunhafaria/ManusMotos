-- =============================================================
-- Grava cliente + motos numa única transação.
-- Antes, o front gravava o cliente e depois as motos: se uma moto falhasse (placa repetida,
-- moto com OS removida), o cliente ficava salvo pela metade.
-- =============================================================

-- p_id: cliente a atualizar (null = novo)
-- p_client: { name, phone, document, address }
-- p_motorcycles: [{ id?, model, color, plate }]  (sem id = nova)
-- p_removed_motorcycles: ids de motos do cliente a excluir
create or replace function public.save_client(
  p_id uuid,
  p_client jsonb,
  p_motorcycles jsonb,
  p_removed_motorcycles uuid[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id    uuid := p_id;
  v_moto  jsonb;
begin
  if p_motorcycles is null or jsonb_typeof(p_motorcycles) <> 'array' or jsonb_array_length(p_motorcycles) = 0 then
    raise exception 'Cadastre ao menos uma moto.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.clients (name, phone, document, address)
    values (
      btrim(p_client ->> 'name'),
      p_client ->> 'phone',
      p_client ->> 'document',
      nullif(btrim(p_client ->> 'address'), '')
    )
    returning id into v_id;
  else
    update public.clients set
      name     = btrim(p_client ->> 'name'),
      phone    = p_client ->> 'phone',
      document = p_client ->> 'document',
      address  = nullif(btrim(p_client ->> 'address'), '')
    where id = v_id;

    if not found then
      raise exception 'Cliente não encontrado.' using errcode = 'P0002';
    end if;

    -- Exclui antes de gravar as demais (libera a placa de uma moto removida).
    delete from public.motorcycles
    where client_id = v_id and id = any (coalesce(p_removed_motorcycles, '{}'));
  end if;

  for v_moto in select value from jsonb_array_elements(p_motorcycles) loop
    if nullif(v_moto ->> 'id', '') is null then
      insert into public.motorcycles (client_id, model, color, plate)
      values (v_id, btrim(v_moto ->> 'model'), btrim(v_moto ->> 'color'), v_moto ->> 'plate');
    else
      update public.motorcycles set
        model = btrim(v_moto ->> 'model'),
        color = btrim(v_moto ->> 'color'),
        plate = v_moto ->> 'plate'
      where id = (v_moto ->> 'id')::uuid and client_id = v_id;

      if not found then
        raise exception 'Moto não encontrada para este cliente.' using errcode = 'P0002';
      end if;
    end if;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.save_client(uuid, jsonb, jsonb, uuid[]) from public;
grant execute on function public.save_client(uuid, jsonb, jsonb, uuid[]) to anon, authenticated;
