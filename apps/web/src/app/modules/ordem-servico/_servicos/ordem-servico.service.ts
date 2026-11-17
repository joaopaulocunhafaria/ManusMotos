import { Injectable } from '@angular/core';
import type { Json, OrdemServico, StatusOrdemServico } from '@manus/shared';
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

	/** Troca o status. Devolve a data de conclusão, preenchida pelo banco ao concluir (e limpa ao sair de "Concluída"). */
	public atualizarStatus(id: string, status: StatusOrdemServico): Observable<{ completed_at: string | null }> {
		return deSupabase(this.supabaseService.client.from('service_orders').update({ status }).eq('id', id).select('completed_at').single());
	}

	// ---------- Cronômetro de trabalho (relógio do banco) ----------

	/** Liga o cronômetro (sem efeito se já estiver ligado). */
	public iniciarCronometro(id: string): Observable<OrdemServico> {
		return deSupabase<OrdemServico>(this.supabaseService.client.rpc('start_service_order_timer', { p_id: id }));
	}

	/** Pausa o cronômetro somando o trecho em andamento ao acumulado. */
	public pausarCronometro(id: string): Observable<OrdemServico> {
		return deSupabase<OrdemServico>(this.supabaseService.client.rpc('pause_service_order_timer', { p_id: id }));
	}

	/** Corrige manualmente o tempo gasto (em segundos). Se estiver rodando, continua a partir dele. */
	public ajustarTempo(id: string, segundos: number): Observable<OrdemServico> {
		return deSupabase<OrdemServico>(this.supabaseService.client.rpc('set_service_order_work_time', { p_id: id, p_seconds: segundos }));
	}

	public excluir(id: string): Observable<null> {
		return deSupabase(this.supabaseService.client.from('service_orders').delete().eq('id', id));
	}
}
