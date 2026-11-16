import { Injectable } from '@angular/core';
import type { Servico } from '@manus/shared';
import { map, Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';

/** Catálogo de serviços (`services`). */
@Injectable({
	providedIn: 'root',
})
export class ServicosService {
	constructor(private supabaseService: SupabaseService) {}

	public buscarPaginado(pagina: number, busca = ''): Observable<Pagina<Servico>> {
		const [de, ate] = intervaloPagina(pagina);
		let consulta = this.supabaseService.client.from('services').select('*', { count: 'exact' });
		if (busca.trim()) consulta = consulta.ilike('name', `%${busca.trim()}%`);
		return deSupabase(
			consulta
				.order('active', { ascending: false })
				.order('name')
				.range(de, ate)
				.then(({ data, error, count }) => ({ data: { itens: data ?? [], total: count ?? 0 }, error })),
		);
	}

	/** Serviços ativos que contêm o termo (autocomplete da OS). */
	public buscarAtivos(busca = '', limite = 15): Observable<Servico[]> {
		let consulta = this.supabaseService.client.from('services').select('*').eq('active', true);
		if (busca.trim()) consulta = consulta.ilike('name', `%${busca.trim()}%`);
		return deSupabase(consulta.order('name').limit(limite)).pipe(map((dados) => dados ?? []));
	}

	public criar(nome: string): Observable<Servico> {
		return deSupabase(this.supabaseService.client.from('services').insert({ name: nome.trim() }).select().single());
	}

	public atualizar(id: string, nome: string): Observable<Servico> {
		return deSupabase(this.supabaseService.client.from('services').update({ name: nome.trim() }).eq('id', id).select().single());
	}

	public alterarAtivo(id: string, ativo: boolean): Observable<Servico> {
		return deSupabase(this.supabaseService.client.from('services').update({ active: ativo }).eq('id', id).select().single());
	}
}
