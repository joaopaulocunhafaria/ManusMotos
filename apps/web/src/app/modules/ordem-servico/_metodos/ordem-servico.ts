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

// ---------- Tempo de trabalho ----------

/** Limites do banco: estimativa em minutos (1 a 6000) e tempo gasto em segundos (até 1000 h). */
export const MAXIMO_ESTIMATIVA_MINUTOS = 6000;
export const MAXIMO_TEMPO_GASTO_SEGUNDOS = 3_600_000;

/** Tempo de trabalho gasto: o acumulado mais o trecho em andamento (cronômetro ligado). */
export function tempoGastoSegundos(ordem: { work_seconds: number; work_started_at: string | null }, agoraMs: number = Date.now()): number {
	if (!ordem.work_started_at) return ordem.work_seconds;
	const emAndamento = Math.max(0, Math.floor((agoraMs - new Date(ordem.work_started_at).getTime()) / 1000));
	return Math.min(MAXIMO_TEMPO_GASTO_SEGUNDOS, ordem.work_seconds + emAndamento);
}

/** Cronômetro `H:MM:SS` (ex.: `0:30:05`, `12:00:00`). */
export function formatarCronometro(segundos: number): string {
	const total = Math.max(0, Math.floor(segundos));
	const horas = Math.floor(total / 3600);
	const minutos = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
	const resto = String(total % 60).padStart(2, '0');
	return `${horas}:${minutos}:${resto}`;
}

/** Duração legível a partir de minutos: `30 min`, `1 h`, `1 h 05 min`. */
export function formatarMinutos(minutos: number | null | undefined): string {
	if (minutos === null || minutos === undefined) return '';
	const total = Math.max(0, Math.floor(minutos));
	const horas = Math.floor(total / 60);
	const resto = total % 60;
	if (!horas) return `${resto} min`;
	return resto ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${horas} h`;
}

/** Separa minutos em horas e minutos (para os campos do formulário). */
export function separarHorasMinutos(minutos: number | null | undefined): { horas: number | null; minutos: number | null } {
	if (minutos === null || minutos === undefined) return { horas: null, minutos: null };
	return { horas: Math.floor(minutos / 60), minutos: minutos % 60 };
}

/** Junta horas e minutos em minutos; `null` se os dois estiverem vazios. */
export function juntarHorasMinutos(horas: number | null | undefined, minutos: number | null | undefined): number | null {
	const vazio = (valor: unknown) => valor === null || valor === undefined || (valor as unknown) === '';
	if (vazio(horas) && vazio(minutos)) return null;
	return (Number(horas) || 0) * 60 + (Number(minutos) || 0);
}

/** Percentual do tempo gasto sobre o estimado (pode passar de 100). `null` sem estimativa. */
export function progressoTrabalho(gastoSegundos: number, estimativaMinutos: number | null | undefined): number | null {
	if (!estimativaMinutos) return null;
	return Math.round((gastoSegundos / (estimativaMinutos * 60)) * 100);
}

/** Número da OS com zeros à esquerda para o documento formal (`000123`). */
export function numeroDocumento(numero: number): string {
	return String(numero).padStart(6, '0');
}
