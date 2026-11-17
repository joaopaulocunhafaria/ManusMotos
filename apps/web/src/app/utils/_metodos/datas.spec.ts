import { adicionarDias, deDataIso, formatarDataIso, inicioDaSemana, paraDataIso } from './datas';

describe('datas', () => {
	it('inicioDaSemana retorna a segunda-feira', () => {
		expect(paraDataIso(inicioDaSemana(new Date(2026, 10, 16, 15)))).toBe('2026-11-16'); // segunda
		expect(paraDataIso(inicioDaSemana(new Date(2026, 10, 19)))).toBe('2026-11-16'); // quinta
		expect(paraDataIso(inicioDaSemana(new Date(2026, 10, 22, 23, 59)))).toBe('2026-11-16'); // domingo
		expect(paraDataIso(inicioDaSemana(new Date(2027, 0, 1)))).toBe('2026-12-28'); // virada de ano
	});

	it('adicionarDias atravessa mês e ano', () => {
		expect(paraDataIso(adicionarDias(new Date(2026, 10, 30), 1))).toBe('2026-12-01');
		expect(paraDataIso(adicionarDias(new Date(2026, 11, 28), 6))).toBe('2027-01-03');
		expect(paraDataIso(adicionarDias(new Date(2026, 11, 7), -7))).toBe('2026-11-30');
	});

	it('paraDataIso usa a data local, sem deslocamento de fuso', () => {
		expect(paraDataIso(new Date(2026, 10, 16, 23, 30))).toBe('2026-11-16');
		expect(paraDataIso(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
	});

	it('deDataIso valida o formato e a data', () => {
		expect(deDataIso('2026-11-16')?.getDate()).toBe(16);
		expect(deDataIso('2026-02-30')).toBeNull();
		expect(deDataIso('16/11/2026')).toBeNull();
		expect(deDataIso(null)).toBeNull();
	});

	it('formatarDataIso mostra dd/mm/aaaa', () => {
		expect(formatarDataIso('2026-01-05')).toBe('05/01/2026');
		expect(formatarDataIso('2026-02-30')).toBe('');
		expect(formatarDataIso(null)).toBe('');
	});
});
