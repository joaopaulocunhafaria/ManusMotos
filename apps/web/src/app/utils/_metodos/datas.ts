/** Datas locais (fuso do aparelho) no formato `YYYY-MM-DD`, usadas pela agenda, estoque e financeiro. */

/** Data local à meia-noite (descarta as horas). */
export function somenteData(data: Date): Date {
	return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** Segunda-feira da semana da data (a semana vai de segunda a domingo). */
export function inicioDaSemana(data: Date): Date {
	const diaSemana = data.getDay();
	return adicionarDias(somenteData(data), diaSemana === 0 ? -6 : 1 - diaSemana);
}

export function adicionarDias(data: Date, dias: number): Date {
	return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

/** `YYYY-MM-DD` no fuso local (não usa `toISOString`, que converte para UTC). */
export function paraDataIso(data: Date): string {
	const mes = String(data.getMonth() + 1).padStart(2, '0');
	const dia = String(data.getDate()).padStart(2, '0');
	return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Converte `YYYY-MM-DD` em data local; `null` se inválida. */
export function deDataIso(valor: string | null | undefined): Date | null {
	const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor ?? '');
	if (!partes) return null;
	const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
	const data = new Date(ano, mes - 1, dia);
	return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}

/** Hoje, `YYYY-MM-DD` no fuso local. */
export function hojeIso(): string {
	return paraDataIso(new Date());
}

/** `YYYY-MM-DD` → `dd/mm/aaaa` (texto vazio se inválida). */
export function formatarDataIso(valor: string | null | undefined): string {
	const data = deDataIso(valor);
	if (!data) return '';
	return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}
