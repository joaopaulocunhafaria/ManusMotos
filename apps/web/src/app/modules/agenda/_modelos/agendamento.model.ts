import type { Agendamento } from '@manus/shared';

/** Agendamento posicionado na coluna do dia (px a partir do topo da grade, % da largura da coluna). */
export interface BlocoAgendamento {
	agendamento: Agendamento;
	topo: number;
	altura: number;
	esquerda: number;
	largura: number;
	/** `HH:MM` de início e fim, para exibição. */
	inicio: string;
	fim: string;
}

/** Coluna de um dia na grade semanal. */
export interface DiaGrade {
	data: Date;
	iso: string;
	hoje: boolean;
	blocos: BlocoAgendamento[];
}

/** O que abrir no formulário: um agendamento existente ou um novo com dia/hora sugeridos. */
export interface ContextoFormulario {
	agendamento: Agendamento | null;
	data: string;
	horario: string;
}
