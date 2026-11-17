import { Injectable } from '@angular/core';
import type { MovimentoPeca, Peca } from '@manus/shared';
import { map, Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';
import { PecaEdicao, PecaFormulario, VendaPeca } from '../_modelos/peca.model';

/** Peças do estoque (`parts`). */
@Injectable({
	providedIn: 'root',
})
export class EstoqueService {
	constructor(private supabaseService: SupabaseService) {}

	/** Busca por nome, modelo da moto ou ano (função `search_parts`). */
	public buscarPaginado(pagina: number, busca = ''): Observable<Pagina<Peca>> {
		const [de, ate] = intervaloPagina(pagina);
		return deSupabase(
			this.supabaseService.client
				.rpc('search_parts', { p_term: busca.trim() }, { count: 'exact' })
				.select('*')
				.range(de, ate)
				.then(({ data, error, count }) => ({ data: { itens: (data ?? []) as Peca[], total: count ?? 0 }, error })),
		);
	}

	public buscarPorId(id: string): Observable<Peca> {
		return deSupabase(this.supabaseService.client.from('parts').select('*').eq('id', id).single());
	}

	public criar(peca: PecaFormulario): Observable<Peca> {
		return deSupabase(this.supabaseService.client.from('parts').insert(peca).select().single());
	}

	public atualizar(id: string, peca: PecaEdicao): Observable<Peca> {
		return deSupabase(this.supabaseService.client.from('parts').update(peca).eq('id', id).select().single());
	}

	public excluir(id: string): Observable<null> {
		return deSupabase(this.supabaseService.client.from('parts').delete().eq('id', id));
	}

	/** Soma `delta` à quantidade no próprio banco (RPC `adjust_part_quantity`); recusa estoque negativo. */
	public ajustarQuantidade(id: string, delta: number): Observable<Peca> {
		return deSupabase(this.supabaseService.client.rpc('adjust_part_quantity', { p_id: id, p_delta: delta }));
	}

	/** Vende unidades da peça e baixa o estoque na mesma transação (RPC `sell_part`). */
	public vender(pecaId: string, venda: VendaPeca): Observable<MovimentoPeca> {
		return deSupabase(
			this.supabaseService.client.rpc('sell_part', {
				p_part_id: pecaId,
				p_quantity: venda.quantidade,
				p_unit_price: venda.precoUnitario,
				p_date: venda.data,
				...(venda.observacao ? { p_notes: venda.observacao } : {}),
			}),
		);
	}

	/** Estorna uma venda: devolve as unidades ao estoque e apaga a venda (RPC `cancel_part_sale`). */
	public estornarVenda(movimentoId: string): Observable<Peca | null> {
		return deSupabase(this.supabaseService.client.rpc('cancel_part_sale', { p_movement_id: movimentoId })).pipe(
			map((peca) => (peca && (peca as Peca).id ? (peca as Peca) : null)),
		);
	}

	/** Histórico de movimentações da peça, do mais recente para o mais antigo. */
	public buscarMovimentos(pecaId: string, pagina: number): Observable<Pagina<MovimentoPeca>> {
		const [de, ate] = intervaloPagina(pagina);
		return deSupabase(
			this.supabaseService.client
				.from('part_movements')
				.select('*', { count: 'exact' })
				.eq('part_id', pecaId)
				.order('movement_date', { ascending: false })
				.order('created_at', { ascending: false })
				.range(de, ate)
				.then(({ data, error, count }) => ({ data: { itens: data ?? [], total: count ?? 0 }, error })),
		);
	}
}
