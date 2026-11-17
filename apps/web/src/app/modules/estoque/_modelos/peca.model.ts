/** Dados do formulário de peça, já convertidos para gravar (`parts`). */
export interface PecaFormulario {
	name: string;
	motorcycle_model: string | null;
	year_start: number | null;
	year_end: number | null;
	purchase_price: number;
	sale_price: number;
	purchase_date: string;
	quantity: number;
}

/** Na edição a quantidade não vai junto: ela só muda por movimentação (+/−, venda). */
export type PecaEdicao = Omit<PecaFormulario, 'quantity'>;

/** Venda de uma peça (RPC `sell_part`). */
export interface VendaPeca {
	quantidade: number;
	precoUnitario: number;
	/** `YYYY-MM-DD`. */
	data: string;
	observacao: string | null;
}
