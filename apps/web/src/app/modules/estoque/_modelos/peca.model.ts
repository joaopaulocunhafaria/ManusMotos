/** Dados do formulário de peça, já convertidos para gravar (`parts`). */
export interface PecaFormulario {
	name: string;
	motorcycle_model: string | null;
	year_start: number | null;
	year_end: number | null;
	purchase_price: number;
	sale_price: number;
	quantity: number;
}
