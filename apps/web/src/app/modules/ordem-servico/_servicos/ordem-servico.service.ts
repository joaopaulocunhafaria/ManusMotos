import { Injectable } from '@angular/core';
import type { Json, StatusOrdemServico } from '@manus/shared';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';
import { DadosOrdemServico, OrdemServicoDetalhada, OrdemServicoResumo } from '../_modelos/ordem-servico.model';

const SELECT_RESUMO = '*, clients(name, phone), motorcycles(model, plate)';
const SELECT_DETALHE = '*, clients(*), motorcycles(*), service_order_items(*)';

/** Ordens de serviço (`service_orders` + `service_order_items`). */
@Injectable({
	providedIn: 'root',
})
export class OrdemServicoService {
	constructor(private supabaseService: SupabaseService) {}

	/** Busca por nº, cliente ou placa (função `search_service_orders`), mais recentes primeiro. */
	public buscarPaginado(pagina: number, busca = '', status: StatusOrdemServico | null = null): Observable<Pagina<OrdemServicoResumo>> {
		const [de, ate] = intervaloPagina(pagina);
		return deSupabase(
			this.supabaseService.client
				.rpc('search_service_orders', { p_term: busca.trim(), ...(status ? { p_status: status } : {}) }, { count: 'exact' })
				.select(SELECT_RESUMO)
				.range(de, ate)
				.then(({ data, error, count }) => ({
					data: { itens: (data ?? []) as unknown as OrdemServicoResumo[], total: count ?? 0 },
					error,
				})),
		);
	}

	public buscarPorId(id: string): Observable<OrdemServicoDetalhada> {
		return deSupabase<OrdemServicoDetalhada>(
			this.supabaseService.client
				.from('service_orders')
				.select(SELECT_DETALHE)
				.eq('id', id)
				.order('position', { referencedTable: 'service_order_items' })
				.single<OrdemServicoDetalhada>(),
		);
	}

	/** Cria (id nulo) ou atualiza a OS e substitui os itens numa transação. Retorna o id. */
	public salvar(id: string | null, dados: DadosOrdemServico, itens: { service_id: string; price: number }[]): Observable<string> {
		const ordem = { ...dados, ...(id ? { id } : {}) } as unknown as Json;
		return deSupabase<string>(
			this.supabaseService.client.rpc('save_service_order', { p_order: ordem, p_items: itens as unknown as Json }),
		);
	}

	public atualizarStatus(id: string, status: StatusOrdemServico): Observable<null> {
		return deSupabase(this.supabaseService.client.from('service_orders').update({ status }).eq('id', id));
	}

	public excluir(id: string): Observable<null> {
		return deSupabase(this.supabaseService.client.from('service_orders').delete().eq('id', id));
	}
}
