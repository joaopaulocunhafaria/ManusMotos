/**
 * Margem de lucro sobre a venda, em % com 2 casas: (venda − compra) ÷ venda × 100.
 * Mesma conta da coluna gerada `parts.profit_margin`. `null` quando não há valor de venda.
 */
export function calcularMargem(compra: number | null | undefined, venda: number | null | undefined): number | null {
	if (!venda || venda <= 0) return null;
	return Math.round((((venda - (compra ?? 0)) / venda) * 100 + Number.EPSILON) * 100) / 100;
}

/** Lucro em reais por unidade (venda − compra). */
export function calcularLucro(compra: number | null | undefined, venda: number | null | undefined): number {
	return Math.round(((venda ?? 0) - (compra ?? 0)) * 100) / 100;
}

/** Anos da moto para exibição: "2015–2020", "2018" ou "" quando não informado. */
export function formatarAnos(inicio: number | null | undefined, fim: number | null | undefined): string {
	if (!inicio) return '';
	return fim && fim !== inicio ? `${inicio}–${fim}` : String(inicio);
}
