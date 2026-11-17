/** Tamanho máximo do logo gravado no banco (data URL, igual à CHECK de `design_settings.logo`). */
export const MAXIMO_CARACTERES_LOGO = 500_000;

export const TIPOS_IMAGEM_LOGO = ['image/png', 'image/jpeg', 'image/webp'];

/** Medidas finais para caber em `largura × altura` sem distorcer e sem ampliar. */
export function medidasReduzidas(
	largura: number,
	altura: number,
	larguraMaxima: number,
	alturaMaxima: number,
): { largura: number; altura: number } {
	const escala = Math.min(1, larguraMaxima / largura, alturaMaxima / altura);
	return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) };
}

/**
 * Reduz a imagem no próprio aparelho e devolve um data URL pequeno para gravar no banco.
 * PNG/WebP viram PNG (mantém a transparência); se ainda ficar grande, cai para JPEG com fundo branco.
 */
export async function reduzirImagem(arquivo: Blob, larguraMaxima = 600, alturaMaxima = 300): Promise<string> {
	if (!TIPOS_IMAGEM_LOGO.includes(arquivo.type)) throw new Error('Use uma imagem PNG, JPG ou WebP.');
	const imagem = await carregarImagem(arquivo);
	const { largura, altura } = medidasReduzidas(imagem.naturalWidth, imagem.naturalHeight, larguraMaxima, alturaMaxima);
	const canvas = document.createElement('canvas');
	canvas.width = largura;
	canvas.height = altura;
	const contexto = canvas.getContext('2d');
	if (!contexto) throw new Error('Não foi possível processar a imagem.');

	if (arquivo.type !== 'image/jpeg') {
		contexto.drawImage(imagem, 0, 0, largura, altura);
		const png = canvas.toDataURL('image/png');
		if (png.length <= MAXIMO_CARACTERES_LOGO) return png;
		contexto.clearRect(0, 0, largura, altura);
	}
	contexto.fillStyle = '#ffffff';
	contexto.fillRect(0, 0, largura, altura);
	contexto.drawImage(imagem, 0, 0, largura, altura);
	for (const qualidade of [0.9, 0.75, 0.6]) {
		const jpeg = canvas.toDataURL('image/jpeg', qualidade);
		if (jpeg.length <= MAXIMO_CARACTERES_LOGO) return jpeg;
	}
	throw new Error('A imagem é grande demais. Use um arquivo menor.');
}

function carregarImagem(arquivo: Blob): Promise<HTMLImageElement> {
	return new Promise((resolver, rejeitar) => {
		const url = URL.createObjectURL(arquivo);
		const imagem = new Image();
		imagem.onload = () => {
			URL.revokeObjectURL(url);
			resolver(imagem);
		};
		imagem.onerror = () => {
			URL.revokeObjectURL(url);
			rejeitar(new Error('Não foi possível abrir a imagem.'));
		};
		imagem.src = url;
	});
}
