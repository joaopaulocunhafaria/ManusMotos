import { MAXIMO_CARACTERES_LOGO, medidasReduzidas, reduzirImagem } from './imagem';

/** PNG gerado no próprio navegador do teste. */
function gerarPng(largura: number, altura: number): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = largura;
	canvas.height = altura;
	const contexto = canvas.getContext('2d')!;
	contexto.fillStyle = '#c00';
	contexto.fillRect(0, 0, largura / 2, altura);
	return new Promise((resolver) => canvas.toBlob((blob) => resolver(blob!), 'image/png'));
}

describe('métodos de imagem', () => {
	it('medidasReduzidas mantém a proporção e não amplia', () => {
		expect(medidasReduzidas(1200, 600, 600, 300)).toEqual({ largura: 600, altura: 300 });
		expect(medidasReduzidas(1000, 1000, 600, 300)).toEqual({ largura: 300, altura: 300 });
		expect(medidasReduzidas(200, 100, 600, 300)).toEqual({ largura: 200, altura: 100 });
	});

	it('reduzirImagem devolve PNG reduzido dentro do limite do banco', async () => {
		const dataUrl = await reduzirImagem(await gerarPng(2000, 1000));
		expect(dataUrl.startsWith('data:image/png;base64,')).toBeTrue();
		expect(dataUrl.length).toBeLessThanOrEqual(MAXIMO_CARACTERES_LOGO);
		const imagem = new Image();
		await new Promise((resolver) => {
			imagem.onload = resolver;
			imagem.src = dataUrl;
		});
		expect([imagem.naturalWidth, imagem.naturalHeight]).toEqual([600, 300]);
	});

	it('reduzirImagem recusa tipo que não é imagem aceita', async () => {
		await expectAsync(reduzirImagem(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).toBeRejectedWithError(/PNG, JPG ou WebP/);
	});

	it('reduzirImagem recusa arquivo corrompido', async () => {
		await expectAsync(reduzirImagem(new Blob(['nada'], { type: 'image/png' }))).toBeRejectedWithError(/abrir a imagem/);
	});
});
