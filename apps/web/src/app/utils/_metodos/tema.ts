import type { DesignSettings } from '@manus/shared';

/** Campos editáveis da identidade visual (linha de `design_settings` sem chave/auditoria). */
export type IdentidadeVisual = Omit<DesignSettings, 'id' | 'updated_at'>;

export type FonteTema = 'system' | 'inter' | 'roboto' | 'poppins' | 'montserrat';
export type RaioTema = 'none' | 'small' | 'medium' | 'large';

export interface OpcaoFonte {
	label: string;
	valor: FonteTema;
	/** Valor de `font-family` no CSS. */
	css: string;
	/** Nome da família no Google Fonts (`null` = fonte do sistema, nada é baixado). */
	google: string | null;
}

const PILHA_SISTEMA = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const FONTES: OpcaoFonte[] = [
	{ label: 'Padrão do aparelho', valor: 'system', css: PILHA_SISTEMA, google: null },
	{ label: 'Inter', valor: 'inter', css: `'Inter', ${PILHA_SISTEMA}`, google: 'Inter' },
	{ label: 'Roboto', valor: 'roboto', css: `'Roboto', ${PILHA_SISTEMA}`, google: 'Roboto' },
	{ label: 'Poppins', valor: 'poppins', css: `'Poppins', ${PILHA_SISTEMA}`, google: 'Poppins' },
	{ label: 'Montserrat', valor: 'montserrat', css: `'Montserrat', ${PILHA_SISTEMA}`, google: 'Montserrat' },
];

export const RAIOS: { label: string; valor: RaioTema }[] = [
	{ label: 'Reto', valor: 'none' },
	{ label: 'Pequeno', valor: 'small' },
	{ label: 'Médio', valor: 'medium' },
	{ label: 'Grande', valor: 'large' },
];

/** Escala de raio do PrimeNG (`primitive.borderRadius`) para cada opção. `medium` = padrão do Aura. */
const ESCALAS_RAIO: Record<RaioTema, Record<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', string>> = {
	none: { none: '0', xs: '0', sm: '0', md: '0', lg: '0', xl: '0' },
	small: { none: '0', xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '6px' },
	medium: { none: '0', xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
	large: { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px' },
};

/** Valores padrão (iguais aos defaults da migration). */
export const IDENTIDADE_PADRAO: IdentidadeVisual = {
	shop_name: 'ManusMotos',
	subtitle: null,
	phone: null,
	whatsapp: null,
	instagram: null,
	logo: null,
	primary_color: '#3B5334',
	secondary_color: '#1f2937',
	background_color: '#f7f7fc',
	surface_color: '#ffffff',
	text_color: '#1f2937',
	border_color: '#e5e7eb',
	font_family: 'system',
	border_radius: 'medium',
};

export function fontePorValor(valor: string): OpcaoFonte {
	return FONTES.find((f) => f.valor === valor) ?? FONTES[0];
}

export function escalaRaio(raio: string): Record<string, string> {
	return ESCALAS_RAIO[raio as RaioTema] ?? ESCALAS_RAIO.medium;
}

/** Raio "md" em px, usado na pré-visualização. */
export function raioParaPx(raio: string): string {
	return escalaRaio(raio)['md'];
}

/** URL do Google Fonts para a fonte (só pesos usados no app), ou `null` para fonte do sistema. */
export function urlGoogleFonts(fonte: OpcaoFonte): string | null {
	if (!fonte.google) return null;
	return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonte.google)}:wght@400;500;600;700&display=swap`;
}

/** Variáveis CSS globais (`:root`) correspondentes à identidade visual. */
export function variaveisCss(config: IdentidadeVisual): Record<string, string> {
	return {
		'--cor-primaria': config.primary_color,
		'--cor-secundaria': config.secondary_color,
		'--cor-fundo': config.background_color,
		'--cor-superficie': config.surface_color,
		'--cor-texto': config.text_color,
		'--cor-borda': config.border_color,
		'--p-font-family': fontePorValor(config.font_family).css,
	};
}

export function aplicarVariaveisCss(config: IdentidadeVisual, elemento: HTMLElement = document.documentElement): void {
	for (const [nome, valor] of Object.entries(variaveisCss(config))) elemento.style.setProperty(nome, valor);
}

/** Luminância relativa (WCAG 2.1) de uma cor `#rrggbb`. */
function luminancia(hex: string): number {
	const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores `#rrggbb` (1 a 21). */
export function contrasteWcag(hexA: string, hexB: string): number {
	const a = luminancia(hexA);
	const b = luminancia(hexB);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
