import { Injectable } from '@angular/core';
import type { Json } from '@manus/shared';
import { map, Observable, switchMap } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';
import { ClienteComMotos, ClienteFormulario, MotoFormulario } from '../_modelos/cliente.model';

const SELECT_CLIENTE = '*, motorcycles(*)';

/** Clientes (`clients`) com suas motos. */
@Injectable({
	providedIn: 'root',
})
export class ClientesService {
	constructor(private supabaseService: SupabaseService) {}

	/** Busca por nome, telefone, CPF/CNPJ ou placa (função `search_clients`). */
	public buscarPaginado(pagina: number, busca = ''): Observable<Pagina<ClienteComMotos>> {
		const [de, ate] = intervaloPagina(pagina);
		return deSupabase(
			this.supabaseService.client
				.rpc('search_clients', { p_term: busca.trim() }, { count: 'exact' })
				.select(SELECT_CLIENTE)
				.range(de, ate)
				.then(({ data, error, count }) => ({
					data: { itens: (data ?? []) as unknown as ClienteComMotos[], total: count ?? 0 },
					error,
				})),
		);
	}

	/** Primeiros resultados da busca (autocomplete da OS). */
	public buscar(termo: string, limite = 10): Observable<ClienteComMotos[]> {
		return deSupabase(
			this.supabaseService.client.rpc('search_clients', { p_term: termo.trim() }).select(SELECT_CLIENTE).limit(limite),
		).pipe(map((dados) => (dados ?? []) as unknown as ClienteComMotos[]));
	}

	public buscarPorId(id: string): Observable<ClienteComMotos> {
		return deSupabase<ClienteComMotos>(
			this.supabaseService.client
				.from('clients')
				.select(SELECT_CLIENTE)
				.eq('id', id)
				.order('created_at', { referencedTable: 'motorcycles' })
				.single<ClienteComMotos>(),
		);
	}

	/**
	 * Cria/atualiza o cliente, remove as motos tiradas do formulário e grava as demais, tudo numa
	 * transação (RPC `save_client`): se algo falhar, nada é gravado. Retorna o cliente recarregado.
	 */
	public salvar(
		id: string | null,
		cliente: ClienteFormulario,
		motos: MotoFormulario[],
		motosRemovidas: string[] = [],
	): Observable<ClienteComMotos> {
		return deSupabase<string>(
			this.supabaseService.client.rpc('save_client', {
				p_id: id as string,
				p_client: cliente as unknown as Json,
				p_motorcycles: motos.map(({ id: idMoto, ...moto }) => (idMoto ? { id: idMoto, ...moto } : moto)) as unknown as Json,
				p_removed_motorcycles: motosRemovidas,
			}),
		).pipe(switchMap((clienteId) => this.buscarPorId(clienteId)));
	}
}
