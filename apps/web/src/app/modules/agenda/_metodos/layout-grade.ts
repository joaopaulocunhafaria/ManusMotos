import type { Agendamento } from '@manus/shared';
import { ALTURA_MINIMA_BLOCO_PX, HORA_FIM, HORA_INICIO } from '../_constantes/agenda';
import { BlocoAgendamento } from '../_modelos/agendamento.model';
import { horarioDeMinutos, minutosDoHorario } from './datas';

const MINUTOS_DIA = 24 * 60;

interface Intervalo {
	agendamento: Agendamento;
	inicio: number;
	fim: number;
}

function intervalo(agendamento: Agendamento): Intervalo {
	const inicio = minutosDoHorario(agendamento.start_time);
	return { agendamento, inicio, fim: Math.min(inicio + Math.max(agendamento.duration_minutes, 1), MINUTOS_DIA) };
}

/** Faixa de horas da grade: padrão HORA_INICIO–HORA_FIM, ampliada para caber todos os agendamentos. */
export function faixaHoras(agendamentos: Agendamento[]): [number, number] {
	let inicio = HORA_INICIO;
	let fim = HORA_FIM;
	for (const item of agendamentos.map(intervalo)) {
		inicio = Math.min(inicio, Math.floor(item.inicio / 60));
		fim = Math.max(fim, Math.ceil(item.fim / 60));
	}
	return [inicio, fim];
}

/**
 * Posiciona os agendamentos de um dia. Os que se sobrepõem ficam lado a lado,
 * dividindo a largura da coluna em raias (como no Google Agenda).
 */
export function montarBlocosDoDia(agendamentos: Agendamento[], horaInicio: number, alturaHora: number): BlocoAgendamento[] {
	const intervalos = agendamentos.map(intervalo).sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
	const blocos: BlocoAgendamento[] = [];
	let grupo: { item: Intervalo; raia: number }[] = [];
	let fimRaias: number[] = [];
	let fimGrupo = -1;

	const fecharGrupo = (): void => {
		const total = fimRaias.length;
		for (const { item, raia } of grupo) {
			blocos.push({
				agendamento: item.agendamento,
				topo: ((item.inicio - horaInicio * 60) / 60) * alturaHora,
				altura: Math.max(((item.fim - item.inicio) / 60) * alturaHora, ALTURA_MINIMA_BLOCO_PX),
				esquerda: (raia / total) * 100,
				largura: 100 / total,
				inicio: horarioDeMinutos(item.inicio),
				fim: horarioDeMinutos(item.fim),
			});
		}
		grupo = [];
		fimRaias = [];
	};

	for (const item of intervalos) {
		if (item.inicio >= fimGrupo) fecharGrupo();
		let raia = fimRaias.findIndex((fim) => fim <= item.inicio);
		if (raia === -1) {
			raia = fimRaias.length;
			fimRaias.push(item.fim);
		} else {
			fimRaias[raia] = item.fim;
		}
		grupo.push({ item, raia });
		fimGrupo = Math.max(fimGrupo, item.fim);
	}
	fecharGrupo();
	return blocos;
}
