import {
	calcularTotal,
	formatarCronometro,
	formatarMinutos,
	hojeIso,
	juntarHorasMinutos,
	numeroDocumento,
	progressoTrabalho,
	saldoRestante,
	separarHorasMinutos,
	tempoGastoSegundos,
	valorParcela,
} from './ordem-servico';

describe('métodos de ordem de serviço', () => {
	it('calcularTotal soma em centavos e ignora preços vazios', () => {
		expect(calcularTotal([{ price: 0.1 }, { price: 0.2 }])).toBe(0.3);
		expect(calcularTotal([{ price: 60 }, { price: null }, { price: 250 }])).toBe(310);
		expect(calcularTotal([])).toBe(0);
	});

	it('saldoRestante desconta a entrada sem ficar negativo', () => {
		expect(saldoRestante(400, 100)).toBe(300);
		expect(saldoRestante(400, null)).toBe(400);
		expect(saldoRestante(100, 150)).toBe(0);
	});

	it('valorParcela divide o saldo pelas parcelas', () => {
		expect(valorParcela(400, 100, 3)).toBe(100);
		expect(valorParcela(100, 0, 3)).toBe(33.33);
		expect(valorParcela(100, 0, null)).toBe(0);
	});

	it('hojeIso usa a data local', () => {
		expect(hojeIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
	});

	describe('tempo de trabalho', () => {
		const inicio = '2026-11-16T10:00:00Z';
		const ms = (iso: string) => new Date(iso).getTime();

		it('tempoGastoSegundos: pausado devolve o acumulado', () => {
			expect(tempoGastoSegundos({ work_seconds: 90, work_started_at: null }, ms('2030-01-01T00:00:00Z'))).toBe(90);
		});

		it('tempoGastoSegundos: rodando soma o trecho em andamento', () => {
			expect(tempoGastoSegundos({ work_seconds: 60, work_started_at: inicio }, ms('2026-11-16T10:30:00.900Z'))).toBe(60 + 1800);
		});

		it('tempoGastoSegundos: relógio do aparelho atrasado não gera tempo negativo', () => {
			expect(tempoGastoSegundos({ work_seconds: 60, work_started_at: inicio }, ms('2026-11-16T09:00:00Z'))).toBe(60);
		});

		it('tempoGastoSegundos: não passa do limite do banco (1000 h)', () => {
			expect(tempoGastoSegundos({ work_seconds: 3_599_000, work_started_at: inicio }, ms('2026-11-20T10:00:00Z'))).toBe(3_600_000);
		});

		it('formatarCronometro', () => {
			expect(formatarCronometro(0)).toBe('0:00:00');
			expect(formatarCronometro(1805)).toBe('0:30:05');
			expect(formatarCronometro(43200)).toBe('12:00:00');
			expect(formatarCronometro(-5)).toBe('0:00:00');
		});

		it('formatarMinutos', () => {
			expect(formatarMinutos(30)).toBe('30 min');
			expect(formatarMinutos(60)).toBe('1 h');
			expect(formatarMinutos(65)).toBe('1 h 05 min');
			expect(formatarMinutos(0)).toBe('0 min');
			expect(formatarMinutos(null)).toBe('');
		});

		it('separar e juntar horas/minutos', () => {
			expect(separarHorasMinutos(150)).toEqual({ horas: 2, minutos: 30 });
			expect(separarHorasMinutos(null)).toEqual({ horas: null, minutos: null });
			expect(juntarHorasMinutos(2, 30)).toBe(150);
			expect(juntarHorasMinutos(null, 45)).toBe(45);
			expect(juntarHorasMinutos(1, null)).toBe(60);
			expect(juntarHorasMinutos(null, null)).toBeNull();
			expect(juntarHorasMinutos(0, 0)).toBe(0);
		});

		it('progressoTrabalho', () => {
			expect(progressoTrabalho(900, 30)).toBe(50);
			expect(progressoTrabalho(3600, 30)).toBe(200);
			expect(progressoTrabalho(900, null)).toBeNull();
		});
	});

	it('numeroDocumento completa com zeros', () => {
		expect(numeroDocumento(7)).toBe('000007');
		expect(numeroDocumento(1234567)).toBe('1234567');
	});
});
