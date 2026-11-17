import { Injectable } from '@angular/core';
import type { Peca } from '@manus/shared';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';
import { PecaFormulario } from '../_modelos/peca.model';

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

	public atualizar(id: string, peca: PecaFormulario): Observable<Peca> {
		return deSupabase(this.supabaseService.client.from('parts').update(peca).eq('id', id).select().single());
	}

	public excluir(id: string): Observable<null> {
		return deSupabase(this.supabaseService.client.from('parts').delete().eq('id', id));
	}

	/** Soma `delta` à quantidade no próprio banco (RPC `adjust_part_quantity`); recusa estoque negativo. */
	public ajustarQuantidade(id: string, delta: number): Observable<Peca> {
		return deSupabase(this.supabaseService.client.rpc('adjust_part_quantity', { p_id: id, p_delta: delta }));
	}
}
