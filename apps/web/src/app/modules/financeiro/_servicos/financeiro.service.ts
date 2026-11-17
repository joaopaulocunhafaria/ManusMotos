import { Injectable } from '@angular/core';
import type { ConfiguracaoCaixa } from '@manus/shared';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { intervaloPagina } from '../../../utils/_constantes/paginacao';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { Pagina } from '../../../utils/_models/pagina';
import { ItemExtrato, ResumoFinanceiro } from '../_modelos/resumo-financeiro.model';

/** Balanço, extrato e início do caixa. Datas `YYYY-MM-DD` inclusivas. */
@Injectable({
	providedIn: 'root',
})
export class FinanceiroService {
	constructor(private supabaseService: SupabaseService) {}

	/** Totais do período e caixa (função `financial_summary`). */
	public resumo(de: string, ate: string): Observable<ResumoFinanceiro> {
		return deSupabase(
			this.supabaseService.client
				.rpc('financial_summary', { p_start: de, p_end: ate })
				.then(({ data, error }) => ({ data: data as unknown as ResumoFinanceiro, error })),
		);
	}

	/** Extrato do período, do mais recente para o mais antigo (função `financial_statement`). */
	public extrato(de: string, ate: string, pagina: number): Observable<Pagina<ItemExtrato>> {
		const [inicio, fim] = intervaloPagina(pagina);
		return deSupabase(
			this.supabaseService.client
				.rpc('financial_statement', { p_start: de, p_end: ate }, { count: 'exact' })
				.select('*')
				.range(inicio, fim)
				.then(({ data, error, count }) => ({ data: { itens: (data ?? []) as ItemExtrato[], total: count ?? 0 }, error })),
		);
	}

	public buscarCaixa(): Observable<ConfiguracaoCaixa> {
		return deSupabase(this.supabaseService.client.from('cash_settings').select('*').eq('id', 1).single());
	}

	/** Valor e data a partir da qual o caixa é calculado. */
	public salvarCaixa(valorInicial: number, dataInicial: string): Observable<ConfiguracaoCaixa> {
		return deSupabase(
			this.supabaseService.client
				.from('cash_settings')
				.update({ opening_balance: valorInicial, opening_date: dataInicial })
				.eq('id', 1)
				.select()
				.single(),
		);
	}
}
