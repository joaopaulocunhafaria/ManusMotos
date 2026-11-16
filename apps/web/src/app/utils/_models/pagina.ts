/** Resultado de uma busca paginada (`.range()` + `{ count: 'exact' }`). */
export interface Pagina<T> {
	itens: T[];
	total: number;
}
