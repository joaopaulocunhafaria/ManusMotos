import { adicionarDias, deDataIso, formatarDataIso, inicioDaSemana, paraDataIso } from '../../../utils/_metodos/datas';
import { Periodo, TipoPeriodo } from '../_modelos/resumo-financeiro.model';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TIPOS: TipoPeriodo[] = ['semana', 'mes', 'ano', 'personalizado'];

/** Período do tipo que contém a data de referência (semana de segunda a domingo). Personalizado começa no mês da referência. */
export function periodoQueContem(tipo: TipoPeriodo, referencia: Date): Periodo {
	if (tipo === 'semana') {
		const inicio = inicioDaSemana(referencia);
		return { tipo, de: paraDataIso(inicio), ate: paraDataIso(adicionarDias(inicio, 6)) };
	}
	if (tipo === 'ano') {
		const ano = referencia.getFullYear();
		return { tipo, de: `${ano}-01-01`, ate: `${ano}-12-31` };
	}
	const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
	const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
	return { tipo, de: paraDataIso(inicio), ate: paraDataIso(fim) };
}

/** Período anterior (`passo` −1) ou seguinte (+1). Personalizado desloca pela própria duração. */
export function deslocarPeriodo(periodo: Periodo, passo: number): Periodo {
	const de = deDataIso(periodo.de)!;
	if (periodo.tipo === 'semana') return periodoQueContem('semana', adicionarDias(de, 7 * passo));
	if (periodo.tipo === 'mes') return periodoQueContem('mes', new Date(de.getFullYear(), de.getMonth() + passo, 1));
	if (periodo.tipo === 'ano') return periodoQueContem('ano', new Date(de.getFullYear() + passo, 0, 1));
	const dias = Math.round((deDataIso(periodo.ate)!.getTime() - de.getTime()) / 86_400_000) + 1;
	return {
		tipo: 'personalizado',
		de: paraDataIso(adicionarDias(de, dias * passo)),
		ate: paraDataIso(adicionarDias(deDataIso(periodo.ate)!, dias * passo)),
	};
}

/** Resultado da leitura da URL: `valido = false` quando algum parâmetro foi ignorado. */
export interface PeriodoDaUrl {
	periodo: Periodo;
	valido: boolean;
}

/**
 * Lê `?periodo=semana|mes|ano|personalizado&de=AAAA-MM-DD&ate=AAAA-MM-DD`.
 * Sem parâmetros: mês atual. Semana/mês/ano usam `de` como referência (ou hoje).
 * Personalizado exige `de` e `ate` válidos com `de <= ate`. Qualquer valor inválido cai no mês atual.
 */
export function periodoDaUrl(parametros: { periodo?: string | null; de?: string | null; ate?: string | null }, hoje: Date): PeriodoDaUrl {
	const mesAtual = { periodo: periodoQueContem('mes', hoje), valido: false };
	const tipo = parametros.periodo || null;
	if (!tipo) return parametros.de || parametros.ate ? mesAtual : { ...mesAtual, valido: true };
	if (!TIPOS.includes(tipo as TipoPeriodo)) return mesAtual;

	const de = parametros.de ? deDataIso(parametros.de) : null;
	if (parametros.de && !de) return mesAtual;

	if (tipo === 'personalizado') {
		const ate = deDataIso(parametros.ate);
		if (!de || !ate || de > ate) return mesAtual;
		return { periodo: { tipo, de: paraDataIso(de), ate: paraDataIso(ate) }, valido: true };
	}
	return { periodo: periodoQueContem(tipo as TipoPeriodo, de ?? hoje), valido: true };
}

/** Parâmetros de URL que representam o período (inverso de `periodoDaUrl`). */
export function parametrosDoPeriodo(periodo: Periodo): { periodo: TipoPeriodo; de: string; ate: string | null } {
	return { periodo: periodo.tipo, de: periodo.de, ate: periodo.tipo === 'personalizado' ? periodo.ate : null };
}

/** Texto do período: "16 – 22 nov 2026", "Novembro de 2026", "2026", "01/11/2026 a 15/11/2026". */
export function rotuloPeriodo(periodo: Periodo): string {
	const de = deDataIso(periodo.de)!;
	const ate = deDataIso(periodo.ate)!;
	if (periodo.tipo === 'ano') return String(de.getFullYear());
	if (periodo.tipo === 'mes') {
		const mes = MESES[de.getMonth()];
		return `${mes[0].toUpperCase()}${mes.slice(1)} de ${de.getFullYear()}`;
	}
	if (periodo.tipo === 'semana') {
		const fim = `${ate.getDate()} ${MESES_CURTOS[ate.getMonth()]} ${ate.getFullYear()}`;
		if (de.getFullYear() !== ate.getFullYear()) return `${de.getDate()} ${MESES_CURTOS[de.getMonth()]} ${de.getFullYear()} – ${fim}`;
		if (de.getMonth() !== ate.getMonth()) return `${de.getDate()} ${MESES_CURTOS[de.getMonth()]} – ${fim}`;
		return `${de.getDate()} – ${fim}`;
	}
	return periodo.de === periodo.ate ? formatarDataIso(periodo.de) : `${formatarDataIso(periodo.de)} a ${formatarDataIso(periodo.ate)}`;
}
