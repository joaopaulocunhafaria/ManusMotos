const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

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

/** Minutos desde 00:00 de um horário `HH:MM` ou `HH:MM:SS`. */
export function minutosDoHorario(horario: string): number {
	const [horas, minutos] = horario.split(':').map(Number);
	return (horas || 0) * 60 + (minutos || 0);
}

/** `HH:MM` a partir dos minutos desde 00:00. */
export function horarioDeMinutos(minutos: number): string {
	const horas = Math.floor(minutos / 60);
	return `${String(horas).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Rótulo da semana: "16 – 22 nov", "30 nov – 6 dez", "29 dez 2025 – 4 jan 2026". */
export function rotuloSemana(inicio: Date): string {
	const fim = adicionarDias(inicio, 6);
	const mesInicio = MESES[inicio.getMonth()];
	const mesFim = MESES[fim.getMonth()];
	if (inicio.getFullYear() !== fim.getFullYear()) {
		return `${inicio.getDate()} ${mesInicio} ${inicio.getFullYear()} – ${fim.getDate()} ${mesFim} ${fim.getFullYear()}`;
	}
	if (inicio.getMonth() !== fim.getMonth()) return `${inicio.getDate()} ${mesInicio} – ${fim.getDate()} ${mesFim}`;
	return `${inicio.getDate()} – ${fim.getDate()} ${mesFim}`;
}

/** Próximo horário cheio a partir de agora (ex.: 14:20 → 15:00), limitado a 23:00. */
export function proximaHoraCheia(agora: Date): string {
	return horarioDeMinutos(Math.min(agora.getHours() + 1, 23) * 60);
}
