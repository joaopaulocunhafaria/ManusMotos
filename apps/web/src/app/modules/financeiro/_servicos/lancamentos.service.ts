import { Injectable } from '@angular/core';
import type { LancamentoCaixa } from '@manus/shared';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { LancamentoFormulario } from '../_modelos/resumo-financeiro.model';

/** Lançamentos manuais do caixa (`cash_entries`). */
@Injectable({
	providedIn: 'root',
})
export class LancamentosService {
	constructor(private supabaseService: SupabaseService) {}

	public buscarPorId(id: string): Observable<LancamentoCaixa> {
		return deSupabase(this.supabaseService.client.from('cash_entries').select('*').eq('id', id).single());
	}

	public criar(lancamento: LancamentoFormulario): Observable<LancamentoCaixa> {
		return deSupabase(this.supabaseService.client.from('cash_entries').insert(lancamento).select().single());
	}

	public atualizar(id: string, lancamento: LancamentoFormulario): Observable<LancamentoCaixa> {
		return deSupabase(this.supabaseService.client.from('cash_entries').update(lancamento).eq('id', id).select().single());
	}

	public excluir(id: string): Observable<null> {
		return deSupabase(this.supabaseService.client.from('cash_entries').delete().eq('id', id));
	}
}
