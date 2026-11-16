import type { Agendamento } from '@manus/shared';
import { faixaHoras, montarBlocosDoDia } from './layout-grade';

function agendamento(id: string, inicio: string, duracao = 60): Agendamento {
	return {
		id,
		client_name: `Cliente ${id}`,
		client_id: null,
		scheduled_date: '2026-11-16',
		start_time: `${inicio}:00`,
		duration_minutes: duracao,
		motorcycle_model: null,
		service: null,
		created_at: '',
		updated_at: '',
	};
}

describe('layout da grade da agenda', () => {
	it('posiciona pelo horário e pela duração', () => {
		const [bloco] = montarBlocosDoDia([agendamento('a', '09:30', 90)], 7, 48);
		expect(bloco.topo).toBe(120);
		expect(bloco.altura).toBe(72);
		expect(bloco.esquerda).toBe(0);
		expect(bloco.largura).toBe(100);
		expect(bloco.inicio).toBe('09:30');
		expect(bloco.fim).toBe('11:00');
	});

	it('respeita a altura mínima em agendamentos curtos', () => {
		const [bloco] = montarBlocosDoDia([agendamento('a', '08:00', 15)], 7, 48);
		expect(bloco.altura).toBe(18);
	});

	it('divide em raias os agendamentos sobrepostos', () => {
		const blocos = montarBlocosDoDia([agendamento('a', '08:00', 120), agendamento('b', '09:00'), agendamento('c', '10:00')], 7, 48);
		const porId = new Map(blocos.map((bloco) => [bloco.agendamento.id, bloco]));
		expect(porId.get('a')!.largura).toBe(50);
		expect(porId.get('b')!.esquerda).toBe(50);
		// "c" começa quando "a" e "b" terminam: novo grupo, largura cheia.
		expect(porId.get('c')!.largura).toBe(100);
	});

	it('reaproveita raia livre dentro do mesmo grupo', () => {
		const blocos = montarBlocosDoDia([agendamento('a', '08:00', 180), agendamento('b', '08:00'), agendamento('c', '09:00')], 7, 48);
		const porId = new Map(blocos.map((bloco) => [bloco.agendamento.id, bloco]));
		expect(porId.get('c')!.esquerda).toBe(porId.get('b')!.esquerda);
		expect(porId.get('c')!.largura).toBe(50);
	});

	it('amplia a faixa de horas para caber os agendamentos', () => {
		expect(faixaHoras([])).toEqual([7, 20]);
		expect(faixaHoras([agendamento('a', '06:30'), agendamento('b', '21:00', 90)])).toEqual([6, 23]);
		expect(faixaHoras([agendamento('a', '23:00', 120)])).toEqual([7, 24]);
	});
});
