import { calcularLucro, calcularMargem, formatarAnos } from './margem';

describe('margem', () => {
	it('calcula a margem sobre a venda com 2 casas', () => {
		expect(calcularMargem(100, 150)).toBe(33.33);
		expect(calcularMargem(50, 100)).toBe(50);
		expect(calcularMargem(0, 80)).toBe(100);
		expect(calcularMargem(null, 80)).toBe(100);
	});

	it('margem negativa quando a venda é menor que a compra', () => {
		expect(calcularMargem(80, 50)).toBe(-60);
	});

	it('sem valor de venda não há margem', () => {
		expect(calcularMargem(100, 0)).toBeNull();
		expect(calcularMargem(100, null)).toBeNull();
		expect(calcularMargem(100, -1)).toBeNull();
	});

	it('lucro por unidade', () => {
		expect(calcularLucro(100, 150)).toBe(50);
		expect(calcularLucro(80, 50)).toBe(-30);
		expect(calcularLucro(10.1, 20.3)).toBe(10.2);
	});

	it('formata os anos da moto', () => {
		expect(formatarAnos(2015, 2020)).toBe('2015–2020');
		expect(formatarAnos(2018, null)).toBe('2018');
		expect(formatarAnos(2018, 2018)).toBe('2018');
		expect(formatarAnos(null, null)).toBe('');
	});
});
