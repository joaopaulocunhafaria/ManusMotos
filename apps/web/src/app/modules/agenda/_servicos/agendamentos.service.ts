import { Injectable } from '@angular/core';
import type { Agendamento, AgendamentoInsert } from '@manus/shared';
import { map, Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { LIMITE_AGENDAMENTOS_SEMANA } from '../_constantes/agenda';

/** Agendamentos da agenda (`appointments`). */
@Injectable({
	providedIn: 'root',
})
export class AgendamentosService {
	constructor(private supabaseService: SupabaseService) {}

	/** Agendamentos entre `inicio` e `fim` (inclusive, `YYYY-MM-DD`), ordenados por dia e hora. */
	public buscarPorPeriodo(inicio: string, fim: string): Observable<Agendamento[]> {
		return deSupabase(
			this.supabaseService.client
				.from('appointments')
				.select('*')
				.gte('scheduled_date', inicio)
				.lte('scheduled_date', fim)
				.order('scheduled_date')
				.order('start_time')
				.limit(LIMITE_AGENDAMENTOS_SEMANA),
		).pipe(map((dados) => dados ?? []));
	}

	public criar(agendamento: AgendamentoInsert): Observable<Agendamento> {
		return deSupabase(this.supabaseService.client.from('appointments').insert(agendamento).select().single());
	}

	public atualizar(id: string, agendamento: AgendamentoInsert): Observable<Agendamento> {
		return deSupabase(this.supabaseService.client.from('appointments').update(agendamento).eq('id', id).select().single());
	}

	public excluir(id: string): Observable<null> {
		return deSupabase(this.supabaseService.client.from('appointments').delete().eq('id', id));
	}
}
