import type { DesignSettings } from '@manus/shared';
import { Banco } from './apoio/banco';
import { esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';
import { unico } from './apoio/geradores';

/** PNG 1×1 válido. */
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

/**
 * A identidade visual é uma linha única (id = 1) compartilhada por todos os testes:
 * estes testes rodam em série e devolvem logo e Instagram ao valor original no fim.
 */
test.describe.configure({ mode: 'serial' });

async function lerIdentidade(banco: Banco): Promise<DesignSettings> {
	const { data, error } = await banco.client.from('design_settings').select('*').eq('id', 1).single();
	if (error) throw error;
	return data;
}

test.describe('Identidade visual: logo e Instagram', () => {
	let original: DesignSettings;

	test.beforeEach(async ({ banco }) => {
		original = await lerIdentidade(banco);
	});

	test.afterEach(async ({ banco }) => {
		await banco.client.from('design_settings').update({ logo: original.logo, instagram: original.instagram }).eq('id', 1);
	});

	test('envia o logo e o Instagram, grava no banco e eles aparecem na OS enviada ao cliente', async ({ page, banco }) => {
		await page.goto('/administracao/configuracoes');
		await expect(page.getByRole('heading', { name: 'Identidade visual' })).toBeVisible();
		await page.locator('#logo-arquivo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 });
		await expect(page.getByRole('img', { name: 'Logo atual' })).toBeVisible();
		await expect(page.getByRole('button', { name: /^\W*Trocar logo$/ })).toBeVisible();
		await page.locator('#instagram').fill('@Oficina.E2E_1');
		await esperarSemScrollHorizontal(page);
		await page.getByRole('button', { name: /^\W*Salvar$/ }).click();
		await expect(toast(page, 'Identidade visual salva.')).toBeVisible();

		const salva = await lerIdentidade(banco);
		expect(salva.logo).toMatch(/^data:image\/png;base64,/);
		expect(salva.instagram, 'Instagram gravado sem @').toBe('Oficina.E2E_1');

		// O documento da OS usa o logo e o Instagram.
		const cliente = await banco.criarCliente({ nome: `Cliente Logo ${unico()}` });
		const servico = await banco.criarServico(`Serviço Logo ${unico()}`);
		const ordem = await banco.criarOrdem(cliente, [{ servico, preco: 10 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		const documento = page.locator('app-os-cliente');
		await expect(documento.locator('img.doc-logo')).toHaveAttribute('src', salva.logo!);
		await expect(documento).toContainText('Instagram: @Oficina.E2E_1');
	});

	test('remover o logo grava nulo e o documento mostra só o nome da oficina', async ({ page, banco }) => {
		await banco.client
			.from('design_settings')
			.update({ logo: `data:image/png;base64,${PNG_1X1.toString('base64')}` })
			.eq('id', 1);
		await page.goto('/administracao/configuracoes');
		await page.getByRole('button', { name: /^\W*Remover logo$/ }).click();
		await expect(page.getByText('Sem logo')).toBeVisible();
		await page.getByRole('button', { name: /^\W*Salvar$/ }).click();
		await expect(toast(page, 'Identidade visual salva.')).toBeVisible();
		expect((await lerIdentidade(banco)).logo).toBeNull();

		const cliente = await banco.criarCliente();
		const servico = await banco.criarServico();
		const ordem = await banco.criarOrdem(cliente, [{ servico, preco: 10 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		await expect(page.locator('app-os-cliente img.doc-logo')).toHaveCount(0);
		await expect(page.locator('app-os-cliente')).toContainText(original.shop_name);
	});

	test('arquivo que não é imagem aceita é recusado e nada muda', async ({ page, banco }) => {
		await page.goto('/administracao/configuracoes');
		await page.locator('#logo-arquivo').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
		await expect(toast(page, 'Use uma imagem PNG, JPG ou WebP.')).toBeVisible();
		await page.locator('#logo-arquivo').setInputFiles({ name: 'quebrado.png', mimeType: 'image/png', buffer: Buffer.from('nada') });
		await expect(toast(page, 'Não foi possível abrir a imagem.')).toBeVisible();
		expect((await lerIdentidade(banco)).logo).toBe(original.logo);
	});

	test('Instagram com espaço ou caractere inválido não é salvo', async ({ page, banco }) => {
		await page.goto('/administracao/configuracoes');
		await page.locator('#instagram').fill('oficina e2e!');
		await page.getByRole('button', { name: /^\W*Salvar$/ }).click();
		await expect(toast(page, 'Confira os campos destacados.')).toBeVisible();
		await expect(page.getByText('Use só letras, números, ponto e _ (até 30).')).toBeVisible();
		expect((await lerIdentidade(banco)).instagram).toBe(original.instagram);
	});
});
