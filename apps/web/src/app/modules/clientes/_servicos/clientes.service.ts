import { Injectable } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';
import { ClienteComMotos, ClienteFormulario, MotoFormulario } from '../_modelos/cliente.model';
import { MotosService } from './motos.service';

const SELECT_CLIENTE = '*, motorcycles(*)';

/** Clientes (`clients`) com suas motos. */
@Injectable({
	providedIn: 'root',
})
export class ClientesService {
	constructor(
		private supabaseService: SupabaseService,
		private motosService: MotosService,
	) {}

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
	 * Cria/atualiza o cliente, remove as motos tiradas do formulário e grava as demais.
	 * Retorna o cliente recarregado com as motos.
	 */
	public salvar(
		id: string | null,
		cliente: ClienteFormulario,
		motos: MotoFormulario[],
		motosRemovidas: string[] = [],
	): Observable<ClienteComMotos> {
		const tabela = this.supabaseService.client.from('clients');
		const gravarCliente = id
			? deSupabase<{ id: string }>(tabela.update(cliente).eq('id', id).select('id').single())
			: deSupabase<{ id: string }>(tabela.insert(cliente).select('id').single());

		return gravarCliente.pipe(
			switchMap(({ id: clienteId }) =>
				(motosRemovidas.length ? this.motosService.excluir(motosRemovidas) : of(null)).pipe(
					switchMap(() => (motos.length ? this.motosService.salvarDoCliente(clienteId, motos) : of([]))),
					switchMap(() => this.buscarPorId(clienteId)),
				),
			),
		);
	}
}
