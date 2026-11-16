import { contrasteWcag, fontePorValor, IDENTIDADE_PADRAO, raioParaPx, urlGoogleFonts, variaveisCss } from './tema';

describe('tema', () => {
	it('contrasteWcag: preto e branco = 21, cor igual = 1', () => {
		expect(contrasteWcag('#000000', '#ffffff')).toBeCloseTo(21, 1);
		expect(contrasteWcag('#3B5334', '#3B5334')).toBeCloseTo(1, 5);
	});

	it('raioParaPx usa a escala e cai para "medium" se desconhecido', () => {
		expect(raioParaPx('none')).toBe('0');
		expect(raioParaPx('large')).toBe('12px');
		expect(raioParaPx('xyz')).toBe('6px');
	});

	it('fonte do sistema não gera URL do Google Fonts', () => {
		expect(urlGoogleFonts(fontePorValor('system'))).toBeNull();
		expect(urlGoogleFonts(fontePorValor('inter'))).toContain('family=Inter');
	});

	it('variaveisCss mapeia as cores para as variáveis globais', () => {
		const variaveis = variaveisCss({ ...IDENTIDADE_PADRAO, primary_color: '#123456' });
		expect(variaveis['--cor-primaria']).toBe('#123456');
		expect(variaveis['--cor-superficie']).toBe(IDENTIDADE_PADRAO.surface_color);
	});
});
