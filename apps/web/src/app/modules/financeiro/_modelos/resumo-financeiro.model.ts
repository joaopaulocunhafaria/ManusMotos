/** Tipo de período do balanço. */
export type TipoPeriodo = 'semana' | 'mes' | 'ano' | 'personalizado';

/** Período do balanço, com datas `YYYY-MM-DD` inclusivas. */
export interface Periodo {
	tipo: TipoPeriodo;
	de: string;
	ate: string;
}

/** Retorno de `financial_summary` (valores em R$). */
export interface ResumoFinanceiro {
	os_total: number;
	os_count: number;
	sales_total: number;
	sales_cost: number;
	sales_profit: number;
	sales_count: number;
	sales_units: number;
	purchases_total: number;
	purchases_units: number;
	income_total: number;
	expense_total: number;
	period_in: number;
	period_out: number;
	period_net: number;
	cash_start: number;
	cash_end: number;
	cash_now: number;
	opening_balance: number;
	opening_date: string;
}

/** Origem de um item do extrato. */
export type OrigemExtrato = 'os' | 'sale' | 'purchase' | 'income' | 'expense';

/** Linha de `financial_statement` (`amount` com sinal: + entra, − sai). */
export interface ItemExtrato {
	entry_date: string;
	source: OrigemExtrato;
	ref_id: string;
	part_id: string | null;
	description: string;
	amount: number;
	created_at: string;
}

/** Dados do formulário de lançamento manual (`cash_entries`). */
export interface LancamentoFormulario {
	kind: 'income' | 'expense';
	description: string;
	amount: number;
	entry_date: string;
	notes: string | null;
}
