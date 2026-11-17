import { horarioDeMinutos, minutosDoHorario, proximaHoraCheia, rotuloSemana } from './datas';

describe('datas da agenda', () => {
	it('converte horários e minutos', () => {
		expect(minutosDoHorario('08:30')).toBe(510);
		expect(minutosDoHorario('08:30:00')).toBe(510);
		expect(horarioDeMinutos(510)).toBe('08:30');
		expect(horarioDeMinutos(0)).toBe('00:00');
		expect(proximaHoraCheia(new Date(2026, 10, 16, 14, 20))).toBe('15:00');
		expect(proximaHoraCheia(new Date(2026, 10, 16, 23, 10))).toBe('23:00');
	});

	it('rotuloSemana descreve o período', () => {
		expect(rotuloSemana(new Date(2026, 10, 16))).toBe('16 – 22 nov');
		expect(rotuloSemana(new Date(2026, 10, 30))).toBe('30 nov – 6 dez');
		expect(rotuloSemana(new Date(2026, 11, 28))).toBe('28 dez 2026 – 3 jan 2027');
	});
});
