/** Itens por página nas listagens (cards no mobile). */
export const QUANTIDADE_POR_PAGINA = 20;

/** Intervalo `[de, ate]` para `.range()` do Supabase. */
export function intervaloPagina(pagina: number, quantidade = QUANTIDADE_POR_PAGINA): [number, number] {
	return [pagina * quantidade, (pagina + 1) * quantidade - 1];
}
