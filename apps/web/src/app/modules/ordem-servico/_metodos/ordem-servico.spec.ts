import { calcularTotal, hojeIso, saldoRestante, valorParcela } from './ordem-servico';

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
});
