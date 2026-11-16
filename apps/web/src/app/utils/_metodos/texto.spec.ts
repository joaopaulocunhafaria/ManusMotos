import { formatarDocumento, formatarPlaca, formatarTelefone, linkWhatsapp, normalizarPlaca, somenteDigitos } from './texto';

describe('texto', () => {
	it('somenteDigitos', () => {
		expect(somenteDigitos('(31) 98765-4321')).toBe('31987654321');
		expect(somenteDigitos(null)).toBe('');
	});

	it('normalizarPlaca', () => {
		expect(normalizarPlaca('abc-1d23')).toBe('ABC1D23');
	});

	it('formatarDocumento', () => {
		expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
		expect(formatarDocumento('11444777000161')).toBe('11.444.777/0001-61');
	});

	it('formatarTelefone', () => {
		expect(formatarTelefone('31987654321')).toBe('(31) 98765-4321');
		expect(formatarTelefone('3133334444')).toBe('(31) 3333-4444');
	});

	it('formatarPlaca', () => {
		expect(formatarPlaca('HGT4521')).toBe('HGT-4521');
		expect(formatarPlaca('abc1d23')).toBe('ABC1D23');
	});

	it('linkWhatsapp', () => {
		expect(linkWhatsapp('(31) 98765-4321', 'Olá')).toBe('https://wa.me/5531987654321?text=Ol%C3%A1');
	});
});
