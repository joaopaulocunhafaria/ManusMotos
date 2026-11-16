/** Arredonda para centavos evitando erro de ponto flutuante (0.1 + 0.2). */
export function arredondarCentavos(valor: number): number {
	return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Soma dos preços dos itens (itens sem preço contam como 0). */
export function calcularTotal(itens: { price: number | null | undefined }[]): number {
	const centavos = itens.reduce((soma, item) => soma + Math.round((Number(item.price) || 0) * 100), 0);
	return centavos / 100;
}

/** Quanto falta pagar depois da entrada (nunca negativo). */
export function saldoRestante(total: number, entrada: number | null | undefined): number {
	return Math.max(0, arredondarCentavos(total - (Number(entrada) || 0)));
}

/** Valor de cada parcela sobre o saldo (depois da entrada). */
export function valorParcela(total: number, entrada: number | null | undefined, parcelas: number | null | undefined): number {
	if (!parcelas || parcelas < 1) return 0;
	return arredondarCentavos(saldoRestante(total, entrada) / parcelas);
}

/** Data de hoje no fuso local, no formato `yyyy-mm-dd` (input date / coluna `date`). */
export function hojeIso(agora = new Date()): string {
	const mes = String(agora.getMonth() + 1).padStart(2, '0');
	const dia = String(agora.getDate()).padStart(2, '0');
	return `${agora.getFullYear()}-${mes}-${dia}`;
}
