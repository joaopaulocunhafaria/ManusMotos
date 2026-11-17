import { deslocarPeriodo, parametrosDoPeriodo, periodoDaUrl, periodoQueContem, rotuloPeriodo } from './periodos';

const HOJE = new Date(2026, 10, 17, 15, 30); // terça, 17/11/2026

describe('períodos do financeiro', () => {
	it('semana vai de segunda a domingo, inclusive na virada de ano', () => {
		expect(periodoQueContem('semana', HOJE)).toEqual({ tipo: 'semana', de: '2026-11-16', ate: '2026-11-22' });
		expect(periodoQueContem('semana', new Date(2026, 10, 22))).toEqual({ tipo: 'semana', de: '2026-11-16', ate: '2026-11-22' });
		expect(periodoQueContem('semana', new Date(2027, 0, 1))).toEqual({ tipo: 'semana', de: '2026-12-28', ate: '2027-01-03' });
	});

	it('mês vai do dia 1 ao último dia, com fevereiro bissexto', () => {
		expect(periodoQueContem('mes', HOJE)).toEqual({ tipo: 'mes', de: '2026-11-01', ate: '2026-11-30' });
		expect(periodoQueContem('mes', new Date(2028, 1, 10))).toEqual({ tipo: 'mes', de: '2028-02-01', ate: '2028-02-29' });
		expect(periodoQueContem('mes', new Date(2027, 1, 10))).toEqual({ tipo: 'mes', de: '2027-02-01', ate: '2027-02-28' });
		expect(periodoQueContem('mes', new Date(2026, 11, 31))).toEqual({ tipo: 'mes', de: '2026-12-01', ate: '2026-12-31' });
	});

	it('ano vai de 1º de janeiro a 31 de dezembro', () => {
		expect(periodoQueContem('ano', HOJE)).toEqual({ tipo: 'ano', de: '2026-01-01', ate: '2026-12-31' });
	});

	it('desloca para o período anterior e o seguinte', () => {
		expect(deslocarPeriodo(periodoQueContem('semana', HOJE), -1)).toEqual({ tipo: 'semana', de: '2026-11-09', ate: '2026-11-15' });
		expect(deslocarPeriodo(periodoQueContem('semana', new Date(2026, 11, 28)), 1)).toEqual({
			tipo: 'semana',
			de: '2027-01-04',
			ate: '2027-01-10',
		});
		expect(deslocarPeriodo(periodoQueContem('mes', new Date(2026, 0, 31)), -1)).toEqual({
			tipo: 'mes',
			de: '2025-12-01',
			ate: '2025-12-31',
		});
		expect(deslocarPeriodo(periodoQueContem('mes', new Date(2026, 0, 31)), 1)).toEqual({
			tipo: 'mes',
			de: '2026-02-01',
			ate: '2026-02-28',
		});
		expect(deslocarPeriodo(periodoQueContem('ano', HOJE), 1)).toEqual({ tipo: 'ano', de: '2027-01-01', ate: '2027-12-31' });
		expect(deslocarPeriodo({ tipo: 'personalizado', de: '2026-11-01', ate: '2026-11-10' }, 1)).toEqual({
			tipo: 'personalizado',
			de: '2026-11-11',
			ate: '2026-11-20',
		});
	});

	describe('periodoDaUrl', () => {
		it('sem parâmetros usa o mês atual', () => {
			expect(periodoDaUrl({}, HOJE)).toEqual({ periodo: { tipo: 'mes', de: '2026-11-01', ate: '2026-11-30' }, valido: true });
		});

		it('semana/mês/ano usam `de` como referência ou hoje', () => {
			expect(periodoDaUrl({ periodo: 'semana' }, HOJE).periodo).toEqual({ tipo: 'semana', de: '2026-11-16', ate: '2026-11-22' });
			expect(periodoDaUrl({ periodo: 'semana', de: '2026-11-04' }, HOJE).periodo).toEqual({
				tipo: 'semana',
				de: '2026-11-02',
				ate: '2026-11-08',
			});
			expect(periodoDaUrl({ periodo: 'mes', de: '2026-02-15' }, HOJE).periodo).toEqual({
				tipo: 'mes',
				de: '2026-02-01',
				ate: '2026-02-28',
			});
			expect(periodoDaUrl({ periodo: 'ano', de: '2025-06-01' }, HOJE).periodo).toEqual({
				tipo: 'ano',
				de: '2025-01-01',
				ate: '2025-12-31',
			});
		});

		it('personalizado com datas válidas, inclusive um dia só', () => {
			expect(periodoDaUrl({ periodo: 'personalizado', de: '2026-11-05', ate: '2026-11-09' }, HOJE)).toEqual({
				periodo: { tipo: 'personalizado', de: '2026-11-05', ate: '2026-11-09' },
				valido: true,
			});
			expect(periodoDaUrl({ periodo: 'personalizado', de: '2026-11-05', ate: '2026-11-05' }, HOJE).valido).toBeTrue();
		});

		it('valores inválidos caem no mês atual', () => {
			const invalidos = [
				{ periodo: 'trimestre' },
				{ periodo: 'semana', de: '2026-02-30' },
				{ periodo: 'mes', de: '17/11/2026' },
				{ periodo: 'personalizado', de: '2026-11-10', ate: '2026-11-09' },
				{ periodo: 'personalizado', de: '2026-11-10' },
				{ de: '2026-11-10' },
			];
			for (const parametros of invalidos) {
				expect(periodoDaUrl(parametros, HOJE))
					.withContext(JSON.stringify(parametros))
					.toEqual({
						periodo: { tipo: 'mes', de: '2026-11-01', ate: '2026-11-30' },
						valido: false,
					});
			}
		});

		it('ida e volta pela URL preserva o período', () => {
			for (const periodo of [
				periodoQueContem('semana', HOJE),
				periodoQueContem('ano', HOJE),
				{ tipo: 'personalizado' as const, de: '2026-01-02', ate: '2026-03-04' },
			]) {
				expect(periodoDaUrl(parametrosDoPeriodo(periodo), HOJE).periodo).toEqual(periodo);
			}
		});
	});

	it('rótulos', () => {
		expect(rotuloPeriodo(periodoQueContem('semana', HOJE))).toBe('16 – 22 nov 2026');
		expect(rotuloPeriodo(periodoQueContem('semana', new Date(2026, 10, 30)))).toBe('30 nov – 6 dez 2026');
		expect(rotuloPeriodo(periodoQueContem('semana', new Date(2026, 11, 28)))).toBe('28 dez 2026 – 3 jan 2027');
		expect(rotuloPeriodo(periodoQueContem('mes', HOJE))).toBe('Novembro de 2026');
		expect(rotuloPeriodo(periodoQueContem('ano', HOJE))).toBe('2026');
		expect(rotuloPeriodo({ tipo: 'personalizado', de: '2026-11-01', ate: '2026-11-15' })).toBe('01/11/2026 a 15/11/2026');
		expect(rotuloPeriodo({ tipo: 'personalizado', de: '2026-11-01', ate: '2026-11-01' })).toBe('01/11/2026');
	});
});
