import { Page } from '@playwright/test';
import { esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';
import { unico } from './apoio/geradores';

const cartao = (page: Page, nome: string) => page.locator('li button').filter({ hasText: nome });

async function buscar(page: Page, termo: string): Promise<void> {
	await page.getByRole('searchbox', { name: 'Buscar serviço' }).fill(termo);
}

async function abrirNovo(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Novo serviço' }).click();
	await expect(page.locator('#nome-servico')).toBeVisible();
}

/** Catálogo de serviços: /administracao/servicos */
test.describe('Serviços', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/administracao/servicos');
		await expect(page.getByRole('heading', { name: 'Serviços', level: 1 })).toBeVisible();
	});

	test('caminho feliz: cadastra, encontra na busca, edita o nome', async ({ page, banco }) => {
		const nome = `Alinhamento ${unico()}`;
		await abrirNovo(page);
		await page.locator('#nome-servico').fill(`  ${nome}  `);
		await page.getByRole('button', { name: 'Salvar' }).click();
		await expect(toast(page, 'Serviço cadastrado.')).toBeVisible();

		const salvo = await banco.servicoPorNome(nome);
		expect(salvo, 'nome gravado sem espaços nas pontas').not.toBeNull();
		expect(salvo!.active).toBe(true);

		await buscar(page, nome);
		await expect(cartao(page, nome)).toBeVisible();
		await esperarSemScrollHorizontal(page);

		const novoNome = `${nome} editado`;
		await cartao(page, nome).click();
		await expect(page.locator('#nome-servico')).toHaveValue(nome);
		await page.locator('#nome-servico').fill(novoNome);
		await page.getByRole('button', { name: 'Salvar' }).click();
		await expect(toast(page, 'Serviço atualizado.')).toBeVisible();
		await buscar(page, novoNome);
		await expect(cartao(page, novoNome)).toBeVisible();
		await banco.servicoPorNome(novoNome);
	});

	test('nome vazio ou só com espaços não é enviado', async ({ page }) => {
		await abrirNovo(page);
		await page.getByRole('button', { name: 'Salvar' }).click();
		await expect(page.getByText('Informe o nome (até 100 caracteres).')).toBeVisible();

		await page.locator('#nome-servico').fill('    ');
		await page.getByRole('button', { name: 'Salvar' }).click();
		await expect(page.getByText('Informe o nome (até 100 caracteres).')).toBeVisible();
		await expect(toast(page, /cadastrado/)).toHaveCount(0);
	});

	test('nome duplicado (ignorando maiúsculas/espaços) é recusado com mensagem clara', async ({ page, banco }) => {
		const existente = await banco.criarServico(`Balanceamento ${unico()}`);
		await abrirNovo(page);
		await page.locator('#nome-servico').fill(` ${existente.name.toUpperCase()} `);
		await page.getByRole('button', { name: 'Salvar' }).click();
		await expect(toast(page, 'Já existe um cadastro com esses dados.')).toBeVisible();
		await expect(page.locator('#nome-servico'), 'o formulário continua aberto para corrigir').toBeVisible();
	});

	test('desativar some das sugestões da OS e ativar volta', async ({ page, banco }) => {
		const servico = await banco.criarServico(`Cromagem ${unico()}`);
		await buscar(page, servico.name);
		await cartao(page, servico.name).click();
		await page.getByRole('button', { name: 'Desativar serviço' }).click();
		await expect(toast(page, 'Serviço desativado.')).toBeVisible();
		await expect(cartao(page, servico.name).getByText('Inativo')).toBeVisible();

		await page.goto('/administracao/ordem-servico/nova');
		await page.locator('#os-servico-0').pressSequentially(servico.name.slice(0, 12), { delay: 20 });
		await expect(page.getByRole('option').filter({ hasText: 'Nenhum serviço encontrado' })).toBeVisible();

		await page.goto('/administracao/servicos');
		await buscar(page, servico.name);
		await cartao(page, servico.name).click();
		await page.getByRole('button', { name: 'Ativar serviço' }).click();
		await expect(toast(page, 'Serviço ativado.')).toBeVisible();
		await expect(cartao(page, servico.name).getByText('Inativo')).toHaveCount(0);
	});

	test('busca sem resultado mostra estado vazio', async ({ page }) => {
		await buscar(page, `inexistente-${unico()}`);
		await expect(page.getByText('Nenhum serviço encontrado.')).toBeVisible();
	});

	test('busca espera o usuário parar de digitar (debounce) antes de consultar', async ({ page }) => {
		const consultas: string[] = [];
		page.on('request', (r) => r.url().includes('/rest/v1/services') && r.url().includes('ilike') && consultas.push(r.url()));
		await page.getByRole('searchbox', { name: 'Buscar serviço' }).pressSequentially('pastilha', { delay: 40 });
		await expect(page.locator('li button').first()).toBeVisible();
		await page.waitForTimeout(800);
		expect(consultas).toHaveLength(1);
	});

	test('paginação: mostra 20 por vez e "Carregar mais" traz o restante', async ({ page, banco }) => {
		const prefixo = `Pag${unico()}`;
		for (let i = 0; i < 21; i++) await banco.criarServico(`${prefixo} ${String(i).padStart(2, '0')}`);
		await buscar(page, prefixo);
		await expect(page.locator('li button')).toHaveCount(20);
		await page.getByRole('button', { name: 'Carregar mais' }).click();
		await expect(page.locator('li button')).toHaveCount(21);
		await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
	});
});
