import { Page } from '@playwright/test';
import { esperarAlvosDeToque, esperarSemScrollHorizontal, expect, preencherNumero, test, toast } from './apoio/fixtures';
import { hojeIsoLocal, unico } from './apoio/geradores';

const cartao = (page: Page, nome: string) => page.locator('li.peca').filter({ hasText: nome });
const dialogo = (page: Page) => page.locator('div.p-confirmdialog');
const salvar = (page: Page) => page.getByRole('button', { name: /^\W*Salvar$/ });

async function buscar(page: Page, termo: string): Promise<void> {
	await page.getByRole('searchbox', { name: 'Buscar peça' }).fill(termo);
}

async function abrirNova(page: Page): Promise<void> {
	await page.goto('/administracao/estoque/nova');
	await expect(page.getByRole('heading', { level: 1, name: 'Nova peça' })).toBeVisible();
}

async function preencherPeca(
	page: Page,
	dados: { nome: string; modelo?: string; anoInicio?: string; anoFim?: string; compra?: string; venda?: string; quantidade?: string },
): Promise<void> {
	await page.locator('#peca-nome').fill(dados.nome);
	if (dados.modelo !== undefined) await page.locator('#peca-modelo').fill(dados.modelo);
	if (dados.anoInicio !== undefined) await page.locator('#peca-ano-inicio').fill(dados.anoInicio);
	if (dados.anoFim !== undefined) await page.locator('#peca-ano-fim').fill(dados.anoFim);
	if (dados.compra !== undefined) await preencherNumero(page, '#peca-compra', dados.compra);
	if (dados.venda !== undefined) await preencherNumero(page, '#peca-venda', dados.venda);
	if (dados.quantidade !== undefined) await preencherNumero(page, '#peca-quantidade', dados.quantidade);
}

/** Estoque de peças: /administracao/estoque */
test.describe('Estoque', () => {
	test.describe('rotas', () => {
		test('/administracao/estoque abre a listagem pelo link da barra inferior', async ({ page }) => {
			await page.goto('/administracao/agenda');
			const link = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Estoque', exact: true });
			await link.click();
			await expect(page).toHaveURL(/\/administracao\/estoque$/);
			await expect(page.getByRole('heading', { level: 1, name: 'Estoque' })).toBeVisible();
			await expect(link).toHaveAttribute('aria-current', 'page');
		});

		test('"Nova peça" abre /estoque/nova e o voltar retorna à listagem', async ({ page }) => {
			await page.goto('/administracao/estoque');
			await page.getByRole('button', { name: /^\W*Nova peça$/ }).click();
			await expect(page).toHaveURL(/\/administracao\/estoque\/nova$/);
			await page.getByRole('button', { name: 'Voltar' }).click();
			await expect(page).toHaveURL(/\/administracao\/estoque$/);
		});

		test('clicar no card abre a edição em /estoque/:id', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Corrente ${unico()}` });
			await page.goto('/administracao/estoque');
			await buscar(page, peca.name);
			await cartao(page, peca.name).getByRole('link').click();
			await expect(page).toHaveURL(new RegExp(`/administracao/estoque/${peca.id}$`));
			await expect(page.getByRole('heading', { level: 1, name: 'Editar peça' })).toBeVisible();
			await expect(page.locator('#peca-nome')).toHaveValue(peca.name);
		});

		for (const id of ['00000000-0000-4000-8000-0000000000ff', 'abc']) {
			test(`/estoque/${id} (inexistente ou inválido) mostra o estado de erro`, async ({ page }) => {
				await page.goto(`/administracao/estoque/${id}`);
				await expect(page.getByText('Não foi possível carregar a peça.')).toBeVisible();
				await expect(page.locator('#peca-nome')).toHaveCount(0);
			});
		}
	});

	test('caminho feliz: cadastra, confere no banco, aparece na lista com a margem e edita', async ({ page, banco }) => {
		const nome = `Pastilha de freio ${unico()}`;
		await abrirNova(page);
		await preencherPeca(page, {
			nome: `  ${nome}  `,
			modelo: ' CG 160 ',
			anoInicio: '2015',
			anoFim: '2020',
			compra: '100',
			venda: '150',
			quantidade: '4',
		});
		await expect(page.locator('#peca-margem')).toContainText('Margem de lucro: 33,3%');
		await expect(page.locator('#peca-margem')).toContainText('R$ 50,00 por peça');
		await salvar(page).click();
		await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
		await expect(page).toHaveURL(/\/administracao\/estoque$/);

		const [salva] = await banco.pecasPorNome(nome);
		expect(salva, 'nome gravado sem espaços nas pontas').toBeTruthy();
		expect(salva).toMatchObject({
			motorcycle_model: 'CG 160',
			year_start: 2015,
			year_end: 2020,
			purchase_price: 100,
			sale_price: 150,
			quantity: 4,
			profit_margin: 33.33,
		});

		await buscar(page, nome);
		const card = cartao(page, nome);
		await expect(card).toContainText('CG 160 · 2015–2020');
		await expect(card).toContainText('Compra R$ 100,00 · Venda R$ 150,00');
		await expect(card).toContainText('Margem 33,3%');
		await expect(card).toContainText('4 unidades');

		await card.getByRole('link').click();
		await preencherPeca(page, { nome, anoFim: '', venda: '200' });
		await expect(page.locator('#peca-margem')).toContainText('Margem de lucro: 50%');
		await salvar(page).click();
		await expect(toast(page, 'Peça atualizada.')).toBeVisible();
		expect(await banco.peca(salva.id)).toMatchObject({ year_start: 2015, year_end: null, sale_price: 200, profit_margin: 50 });
		await buscar(page, nome);
		await expect(cartao(page, nome)).toContainText('CG 160 · 2015');
		await expect(cartao(page, nome)).toContainText('Margem 50%');
	});

	test('peça só com nome e valores (sem moto e sem anos) mostra "Qualquer moto"', async ({ page, banco }) => {
		const nome = `Óleo 20W50 ${unico()}`;
		await abrirNova(page);
		await preencherPeca(page, { nome, compra: '20', venda: '35' });
		await salvar(page).click();
		await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
		const [salva] = await banco.pecasPorNome(nome);
		expect(salva).toMatchObject({ motorcycle_model: null, year_start: null, year_end: null, quantity: 0 });
		await buscar(page, nome);
		await expect(cartao(page, nome)).toContainText('Qualquer moto');
		await expect(cartao(page, nome)).toContainText('Sem estoque');
	});

	test.describe('quantidade (+/−)', () => {
		test('+ e − gravam no banco; em zero mostra "Sem estoque" e desabilita o −', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Vela ${unico()}`, quantity: 1 });
			await page.goto('/administracao/estoque');
			await buscar(page, peca.name);
			const card = cartao(page, peca.name);
			const menos = card.getByRole('button', { name: `Diminuir quantidade de ${peca.name}` });
			const mais = card.getByRole('button', { name: `Aumentar quantidade de ${peca.name}` });
			await expect(card).toContainText('1 unidade');

			await menos.click();
			await expect(card).toContainText('0 unidades');
			await expect(card).toContainText('Sem estoque');
			await expect(menos).toBeDisabled();
			expect((await banco.peca(peca.id))!.quantity).toBe(0);

			await mais.click();
			await mais.click();
			await expect(card).toContainText('2 unidades');
			await expect(card.getByText('Sem estoque')).toHaveCount(0);
			await expect(menos).toBeEnabled();
			expect((await banco.peca(peca.id))!.quantity).toBe(2);
		});

		test('− com o estoque já zerado por outro aparelho mostra erro e não grava negativo', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Cabo ${unico()}`, quantity: 1 });
			await page.goto('/administracao/estoque');
			await buscar(page, peca.name);
			await expect(cartao(page, peca.name)).toContainText('1 unidade');
			await banco.client.rpc('adjust_part_quantity', { p_id: peca.id, p_delta: -1 });
			await cartao(page, peca.name)
				.getByRole('button', { name: `Diminuir quantidade de ${peca.name}` })
				.click();
			await expect(toast(page, 'Estoque insuficiente.')).toBeVisible();
			expect((await banco.peca(peca.id))!.quantity).toBe(0);
		});
	});

	test.describe('validações do formulário', () => {
		test.beforeEach(async ({ page }) => abrirNova(page));

		test('obrigatórios vazios não são enviados', async ({ page }) => {
			await salvar(page).click();
			await expect(page.getByText('Informe o nome da peça (até 120 caracteres).')).toBeVisible();
			await expect(page.getByText('Informe o valor de compra.')).toBeVisible();
			await expect(page.getByText('Informe o valor de venda.')).toBeVisible();
			await expect(toast(page, /cadastrada/)).toHaveCount(0);
		});

		test('nome só com espaços não é enviado', async ({ page }) => {
			await preencherPeca(page, { nome: '     ', compra: '10', venda: '20' });
			await salvar(page).click();
			await expect(page.getByText('Informe o nome da peça (até 120 caracteres).')).toBeVisible();
			await expect(toast(page, /cadastrada/)).toHaveCount(0);
		});

		test('nome com 120 caracteres é aceito e o campo limita a 120', async ({ page, banco }) => {
			const nome = `${unico()}-`.padEnd(120, 'x');
			await expect(page.locator('#peca-nome')).toHaveAttribute('maxlength', '120');
			await expect(page.locator('#peca-modelo')).toHaveAttribute('maxlength', '80');
			await preencherPeca(page, { nome, modelo: 'M'.repeat(80), compra: '1', venda: '2' });
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
			const [salva] = await banco.pecasPorNome(nome);
			expect(salva.name).toHaveLength(120);
			expect(salva.motorcycle_model).toHaveLength(80);
		});

		test('ano com formato inválido é recusado', async ({ page }) => {
			await preencherPeca(page, { nome: `Peça ${unico()}`, anoInicio: '20a5', compra: '1', venda: '2' });
			await salvar(page).click();
			await expect(page.getByText('Informe o ano com 4 dígitos, entre 1950 e 2100.')).toBeVisible();
			await expect(toast(page, /cadastrada/)).toHaveCount(0);
		});

		for (const ano of ['1949', '2101']) {
			test(`ano ${ano} (fora de 1950–2100) é recusado`, async ({ page }) => {
				await preencherPeca(page, { nome: `Peça ${unico()}`, anoInicio: ano, compra: '1', venda: '2' });
				await salvar(page).click();
				await expect(page.getByText('Informe o ano com 4 dígitos, entre 1950 e 2100.')).toBeVisible();
				await expect(toast(page, /cadastrada/)).toHaveCount(0);
			});
		}

		test('ano final antes do inicial é recusado', async ({ page }) => {
			await preencherPeca(page, { nome: `Peça ${unico()}`, anoInicio: '2020', anoFim: '2019', compra: '1', venda: '2' });
			await salvar(page).click();
			await expect(page.getByText('O ano final não pode ser antes do inicial.')).toBeVisible();
			await expect(toast(page, /cadastrada/)).toHaveCount(0);
		});

		test('ano final sem o inicial é recusado', async ({ page }) => {
			await preencherPeca(page, { nome: `Peça ${unico()}`, anoFim: '2020', compra: '1', venda: '2' });
			await salvar(page).click();
			await expect(page.getByText('Informe o ano inicial.')).toBeVisible();
			await expect(toast(page, /cadastrada/)).toHaveCount(0);
		});

		test('ano final igual ao inicial é aceito e aparece como um ano só', async ({ page, banco }) => {
			const nome = `Retentor ${unico()}`;
			await preencherPeca(page, { nome, modelo: 'Biz', anoInicio: '2018', anoFim: '2018', compra: '10', venda: '20' });
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
			expect((await banco.pecasPorNome(nome))[0]).toMatchObject({ year_start: 2018, year_end: 2018 });
			await buscar(page, nome);
			await expect(cartao(page, nome)).toContainText('Biz · 2018');
		});

		test('venda abaixo da compra é permitida, com margem negativa e aviso', async ({ page, banco }) => {
			const nome = `Encalhada ${unico()}`;
			await preencherPeca(page, { nome, compra: '80', venda: '50' });
			await expect(page.locator('#peca-margem')).toContainText('Margem de lucro: -60%');
			await expect(page.locator('#peca-margem')).toContainText('o valor de venda está abaixo do valor de compra');
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
			expect((await banco.pecasPorNome(nome))[0].profit_margin).toBe(-60);
			await buscar(page, nome);
			await expect(cartao(page, nome)).toContainText('Margem -60%');
		});

		test('venda zero não tem margem ("—")', async ({ page, banco }) => {
			const nome = `Brinde ${unico()}`;
			await preencherPeca(page, { nome, compra: '5', venda: '0' });
			await expect(page.locator('#peca-margem')).toContainText('Informe o valor de venda para ver a margem de lucro.');
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
			expect((await banco.pecasPorNome(nome))[0].profit_margin).toBeNull();
			await buscar(page, nome);
			await expect(cartao(page, nome)).toContainText('Margem —');
		});

		test('compra zero dá margem de 100%', async ({ page }) => {
			await preencherPeca(page, { nome: `Peça ${unico()}`, compra: '0', venda: '30' });
			await expect(page.locator('#peca-margem')).toContainText('Margem de lucro: 100%');
		});

		test('mesma peça/moto/anos (ignorando maiúsculas e espaços) é recusada com mensagem clara', async ({ page, banco }) => {
			const existente = await banco.criarPeca({ name: `Kit relação ${unico()}`, motorcycle_model: 'Titan', year_start: 2010 });
			await preencherPeca(page, {
				nome: ` ${existente.name.toUpperCase()} `,
				modelo: 'titan',
				anoInicio: '2010',
				compra: '1',
				venda: '2',
			});
			await salvar(page).click();
			await expect(toast(page, 'Já existe um cadastro com esses dados.')).toBeVisible();
			await expect(page.locator('#peca-nome'), 'o formulário continua aberto para corrigir').toBeVisible();
			expect(await banco.pecasPorNome(existente.name.toUpperCase())).toEqual([]);
		});

		test('a mesma peça para outro modelo é aceita', async ({ page, banco }) => {
			const existente = await banco.criarPeca({ name: `Kit relação ${unico()}`, motorcycle_model: 'Titan' });
			await preencherPeca(page, { nome: existente.name, modelo: 'Fan', compra: '1', venda: '2' });
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
			expect(await banco.pecasPorNome(existente.name)).toHaveLength(2);
		});
	});

	test.describe('exclusão', () => {
		test('cancelar a confirmação mantém a peça', async ({ page, banco }) => {
			const peca = await banco.criarPeca();
			await page.goto(`/administracao/estoque/${peca.id}`);
			await page.getByRole('button', { name: /^\W*Excluir peça$/ }).click();
			await expect(dialogo(page)).toContainText('será apagada do estoque definitivamente');
			await dialogo(page).getByRole('button', { name: 'Voltar' }).click();
			await expect(dialogo(page)).toHaveCount(0);
			await expect(page).toHaveURL(new RegExp(`/estoque/${peca.id}$`));
			expect(await banco.peca(peca.id)).not.toBeNull();
		});

		test('confirmar apaga a peça e volta para a listagem', async ({ page, banco }) => {
			const peca = await banco.criarPeca();
			await page.goto(`/administracao/estoque/${peca.id}`);
			await page.getByRole('button', { name: /^\W*Excluir peça$/ }).click();
			await dialogo(page).getByRole('button', { name: 'Excluir' }).click();
			await expect(toast(page, 'Peça excluída.')).toBeVisible();
			await expect(page).toHaveURL(/\/administracao\/estoque$/);
			expect(await banco.peca(peca.id)).toBeNull();
		});

		test('peça nova não tem botão de excluir', async ({ page }) => {
			await abrirNova(page);
			await expect(page.getByRole('button', { name: /Excluir peça/ })).toHaveCount(0);
		});
	});

	test.describe('busca e paginação', () => {
		test.beforeEach(async ({ page }) => {
			await page.goto('/administracao/estoque');
			await expect(page.getByRole('heading', { level: 1, name: 'Estoque' })).toBeVisible();
		});

		test('sem resultado mostra estado vazio', async ({ page }) => {
			await buscar(page, `inexistente-${unico()}`);
			await expect(page.getByText('Nenhuma peça encontrada.')).toBeVisible();
		});

		test('termo parcial, sem diferenciar maiúsculas', async ({ page, banco }) => {
			const marca = unico();
			const peca = await banco.criarPeca({ name: `Amortecedor Traseiro ${marca}` });
			await buscar(page, `traseiro ${marca}`.toUpperCase());
			await expect(cartao(page, peca.name)).toBeVisible();
			await buscar(page, `seiro ${marca}`);
			await expect(cartao(page, peca.name)).toBeVisible();
		});

		test('busca pelo modelo da moto', async ({ page, banco }) => {
			const modelo = `XRE ${unico()}`;
			const peca = await banco.criarPeca({ motorcycle_model: modelo });
			await buscar(page, modelo.toLowerCase());
			await expect(page.locator('li.peca')).toHaveCount(1);
			await expect(cartao(page, peca.name)).toBeVisible();
		});

		test('busca pelo ano encontra peças cujo intervalo inclui o ano', async ({ page, banco }) => {
			const marca = unico();
			const dentro = await banco.criarPeca({ name: `Farol ${marca}`, motorcycle_model: marca, year_start: 1961, year_end: 1963 });
			const fora = await banco.criarPeca({ name: `Lanterna ${marca}`, motorcycle_model: marca, year_start: 1964 });
			await buscar(page, '1962');
			await expect(cartao(page, dentro.name)).toBeVisible();
			await expect(cartao(page, fora.name)).toHaveCount(0);
		});

		test('% e _ digitados são tratados como texto', async ({ page, banco }) => {
			const marca = unico();
			const comPorcento = await banco.criarPeca({ name: `Desconto 10% ${marca}` });
			const semPorcento = await banco.criarPeca({ name: `Desconto 10x ${marca}` });
			await buscar(page, `10% ${marca}`);
			await expect(cartao(page, comPorcento.name)).toBeVisible();
			await expect(cartao(page, semPorcento.name)).toHaveCount(0);

			const sublinhado = await banco.criarPeca({ name: `Junta_A ${marca}` });
			const semSublinhado = await banco.criarPeca({ name: `JuntaBA ${marca}` });
			await buscar(page, `Junta_`);
			await expect(cartao(page, sublinhado.name)).toBeVisible();
			await expect(cartao(page, semSublinhado.name)).toHaveCount(0);
		});

		test('busca espera o usuário parar de digitar (debounce) antes de consultar', async ({ page, banco }) => {
			await banco.criarPeca({ name: `Pneu ${unico()}` });
			await page.waitForLoadState('networkidle');
			const consultas: string[] = [];
			page.on('request', (r) => r.url().includes('/rest/v1/rpc/search_parts') && consultas.push(r.url()));
			await page.getByRole('searchbox', { name: 'Buscar peça' }).pressSequentially('pneu', { delay: 40 });
			await expect(cartao(page, 'Pneu').first()).toBeVisible();
			await page.waitForTimeout(800);
			expect(consultas).toHaveLength(1);
		});

		test('paginação: mostra 20 por vez e "Carregar mais" traz o restante', async ({ page, banco }) => {
			const prefixo = `Pag${unico()}`;
			for (let i = 0; i < 21; i++) await banco.criarPeca({ name: `${prefixo} ${String(i).padStart(2, '0')}` });
			await buscar(page, prefixo);
			await expect(page.locator('li.peca')).toHaveCount(20);
			await page.getByRole('button', { name: 'Carregar mais' }).click();
			await expect(page.locator('li.peca')).toHaveCount(21);
			await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
		});

		test('erro ao carregar mostra o estado de erro e "tentar de novo" recarrega', async ({ page }) => {
			let falhar = true;
			await page.route('**/rest/v1/rpc/search_parts*', (rota) =>
				falhar ? rota.fulfill({ status: 500, body: '{"message":"falha"}' }) : rota.fallback(),
			);
			await page.reload();
			await expect(page.getByText('Não foi possível carregar o estoque.')).toBeVisible();
			falhar = false;
			await page.getByRole('button', { name: /Tentar/ }).click();
			await expect(page.getByText('Não foi possível carregar o estoque.')).toHaveCount(0);
		});
	});

	test.describe('data de entrada', () => {
		test('nova peça vem com a data de hoje; a data escolhida é gravada, gera a compra e aparece no card', async ({ page, banco }) => {
			const nome = `Disco ${unico()}`;
			await abrirNova(page);
			await expect(page.locator('#peca-data-entrada')).toHaveValue(hojeIsoLocal());
			await preencherPeca(page, { nome, compra: '80', venda: '120', quantidade: '3' });
			await page.locator('#peca-data-entrada').fill('2025-03-10');
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();

			const [salva] = await banco.pecasPorNome(nome);
			expect(salva).toMatchObject({ purchase_date: '2025-03-10', quantity: 3 });
			const movimentos = await banco.movimentosDaPeca(salva.id);
			expect(movimentos).toEqual([
				expect.objectContaining({ kind: 'purchase', quantity: 3, unit_price: 80, total: 240, movement_date: '2025-03-10' }),
			]);
			await buscar(page, nome);
			await expect(cartao(page, nome)).toContainText('Entrada em 10/03/2025');
		});

		test('peça cadastrada com quantidade zero não gera compra', async ({ page, banco }) => {
			const nome = `Retentor ${unico()}`;
			await abrirNova(page);
			await preencherPeca(page, { nome, compra: '10', venda: '20', quantidade: '0' });
			await salvar(page).click();
			await expect(toast(page, 'Peça cadastrada.')).toBeVisible();
			const [salva] = await banco.pecasPorNome(nome);
			expect(await banco.movimentosDaPeca(salva.id)).toEqual([]);
		});

		test('data de entrada vazia não é enviada', async ({ page, banco }) => {
			const nome = `Sem data ${unico()}`;
			await abrirNova(page);
			await preencherPeca(page, { nome, compra: '10', venda: '20' });
			await page.locator('#peca-data-entrada').fill('');
			await salvar(page).click();
			await expect(page.getByText('Informe a data de entrada da peça.')).toBeVisible();
			await expect(page).toHaveURL(/\/estoque\/nova$/);
			expect(await banco.pecasPorNome(nome)).toEqual([]);
		});

		test('na edição a quantidade fica só leitura e a data de entrada pode ser corrigida', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Farol ${unico()}`, quantity: 2, purchase_date: '2025-01-05' });
			await page.goto(`/administracao/estoque/${peca.id}`);
			await expect(page.locator('#peca-quantidade')).toBeDisabled();
			await expect(page.getByText('Use + / − na listagem ou "Vender" para mudar a quantidade.')).toBeVisible();
			await expect(page.locator('#peca-data-entrada')).toHaveValue('2025-01-05');
			await page.locator('#peca-data-entrada').fill('2025-01-06');
			await salvar(page).click();
			await expect(toast(page, 'Peça atualizada.')).toBeVisible();
			expect(await banco.peca(peca.id)).toMatchObject({ purchase_date: '2025-01-06', quantity: 2 });
		});
	});

	test.describe('venda', () => {
		const drawer = (page: Page) => page.locator('.p-drawer').filter({ hasText: 'Vender peça' });
		const confirmar = (page: Page) => page.getByRole('button', { name: /^\W*Confirmar venda$/ });

		async function abrirVendaNaLista(page: Page, nome: string): Promise<void> {
			await page.goto('/administracao/estoque');
			await buscar(page, nome);
			await cartao(page, nome)
				.getByRole('button', { name: `Vender ${nome}` })
				.click();
			await expect(drawer(page)).toBeVisible();
		}

		test('caminho feliz pela listagem: sugere o preço, grava a venda, baixa o estoque e atualiza o card', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Pneu ${unico()}`, purchase_price: 100, sale_price: 180, quantity: 5 });
			await abrirVendaNaLista(page, peca.name);
			await expect(page.locator('#venda-preco')).toHaveValue(/^R\$\s180,00$/);
			await expect(page.locator('#venda-data')).toHaveValue(hojeIsoLocal());
			await expect(page.locator('#venda-resumo')).toContainText('Total: R$ 180,00');

			await preencherNumero(page, '#venda-quantidade', '2');
			await preencherNumero(page, '#venda-preco', '175,50');
			await page.locator('#venda-data').fill('2025-04-02');
			await page.locator('#venda-observacao').fill('  Balcão  ');
			await expect(page.locator('#venda-resumo')).toContainText('Total: R$ 351,00');
			await expect(page.locator('#venda-resumo')).toContainText('Lucro previsto: R$ 151,00');
			await confirmar(page).click();

			await expect(toast(page, 'Venda registrada.')).toBeVisible();
			await expect(drawer(page)).toBeHidden();
			await expect(cartao(page, peca.name)).toContainText('3 unidades');
			expect((await banco.peca(peca.id))!.quantity).toBe(3);
			const venda = (await banco.movimentosDaPeca(peca.id)).find((m) => m.kind === 'sale');
			expect(venda).toMatchObject({
				quantity: 2,
				unit_price: 175.5,
				unit_cost: 100,
				total: 351,
				movement_date: '2025-04-02',
				notes: 'Balcão',
				part_name: peca.name,
			});
		});

		test('vender todo o estoque é válido: mostra "Sem estoque" e desabilita Vender', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Bateria ${unico()}`, quantity: 2 });
			await abrirVendaNaLista(page, peca.name);
			await preencherNumero(page, '#venda-quantidade', '2');
			await confirmar(page).click();
			await expect(toast(page, 'Venda registrada.')).toBeVisible();
			const card = cartao(page, peca.name);
			await expect(card).toContainText('Sem estoque');
			await expect(card.getByRole('button', { name: `Vender ${peca.name}` })).toBeDisabled();
			expect((await banco.peca(peca.id))!.quantity).toBe(0);
		});

		test('quantidade acima do estoque não é enviada', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Lâmpada ${unico()}`, quantity: 2 });
			await abrirVendaNaLista(page, peca.name);
			await preencherNumero(page, '#venda-quantidade', '3');
			await confirmar(page).click();
			await expect(drawer(page).getByText('Estoque insuficiente: há 2 em estoque.')).toBeVisible();
			expect((await banco.movimentosDaPeca(peca.id)).filter((m) => m.kind === 'sale')).toEqual([]);
			expect((await banco.peca(peca.id))!.quantity).toBe(2);
		});

		test('quantidade zero ou vazia não é enviada', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Fusível ${unico()}`, quantity: 2 });
			await abrirVendaNaLista(page, peca.name);
			for (const valor of ['0', '']) {
				await preencherNumero(page, '#venda-quantidade', valor);
				await confirmar(page).click();
				await expect(drawer(page).getByText('Informe pelo menos 1 unidade.')).toBeVisible();
			}
			expect((await banco.peca(peca.id))!.quantity).toBe(2);
		});

		test('preço vazio não é enviado; preço zero é aceito', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Brinde ${unico()}`, quantity: 2 });
			await abrirVendaNaLista(page, peca.name);
			await preencherNumero(page, '#venda-preco', '');
			await confirmar(page).click();
			await expect(drawer(page).getByText('Informe o preço de venda.')).toBeVisible();
			await preencherNumero(page, '#venda-preco', '0');
			await confirmar(page).click();
			await expect(toast(page, 'Venda registrada.')).toBeVisible();
			expect((await banco.movimentosDaPeca(peca.id)).find((m) => m.kind === 'sale')).toMatchObject({ unit_price: 0, total: 0 });
		});

		test('data vazia não é enviada', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Sem data venda ${unico()}`, quantity: 2 });
			await abrirVendaNaLista(page, peca.name);
			await page.locator('#venda-data').fill('');
			await confirmar(page).click();
			await expect(drawer(page).getByText('Informe a data da venda.')).toBeVisible();
			expect((await banco.peca(peca.id))!.quantity).toBe(2);
		});

		test('cancelar fecha sem gravar nada', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Cancelada ${unico()}`, quantity: 2 });
			await abrirVendaNaLista(page, peca.name);
			await preencherNumero(page, '#venda-quantidade', '1');
			await drawer(page).getByRole('button', { name: 'Cancelar' }).click();
			await expect(drawer(page)).toBeHidden();
			await expect(cartao(page, peca.name)).toContainText('2 unidades');
			expect((await banco.movimentosDaPeca(peca.id)).filter((m) => m.kind === 'sale')).toEqual([]);
		});

		test('estoque vendido em outro aparelho: o banco recusa e mostra "Estoque insuficiente."', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Concorrida ${unico()}`, quantity: 1 });
			await abrirVendaNaLista(page, peca.name);
			await banco.venderPeca(peca.id, 1, 10, '2025-04-02');
			await confirmar(page).click();
			await expect(toast(page, 'Estoque insuficiente.')).toBeVisible();
			expect((await banco.peca(peca.id))!.quantity).toBe(0);
			expect((await banco.movimentosDaPeca(peca.id)).filter((m) => m.kind === 'sale')).toHaveLength(1);
		});

		test('pela edição da peça: vende, atualiza a quantidade e mostra no histórico', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Kit ${unico()}`, quantity: 3, purchase_date: '2025-02-01' });
			await page.goto(`/administracao/estoque/${peca.id}`);
			const historico = page.getByRole('region', { name: 'Histórico' });
			await expect(historico.locator('li.movimento')).toHaveCount(1);
			await expect(historico.locator('li.movimento').first()).toContainText('Compra');
			await expect(historico.locator('li.movimento').first()).toContainText('01/02/2025');

			await page.getByRole('button', { name: /^\W*Vender$/ }).click();
			await preencherNumero(page, '#venda-quantidade', '1');
			await page.locator('#venda-data').fill('2025-02-03');
			await confirmar(page).click();
			await expect(toast(page, 'Venda registrada.')).toBeVisible();
			await expect(page.locator('#peca-quantidade')).toHaveValue('2');
			await expect(historico.locator('li.movimento')).toHaveCount(2);
			await expect(historico.locator('li.movimento').first()).toContainText('Venda');
			await expect(historico.locator('li.movimento').first()).toContainText('03/02/2025');
			expect((await banco.peca(peca.id))!.quantity).toBe(2);
		});

		test('Vender fica desabilitado na edição de peça sem estoque', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Zerada ${unico()}`, quantity: 0 });
			await page.goto(`/administracao/estoque/${peca.id}`);
			await expect(page.getByRole('button', { name: /^\W*Vender$/ })).toBeDisabled();
			await expect(page.getByText('Nenhuma movimentação.')).toBeVisible();
		});
	});

	test.describe('histórico e estorno', () => {
		test('+ vira compra e − vira ajuste no histórico', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Mola ${unico()}`, quantity: 0, purchase_price: 15 });
			await page.goto('/administracao/estoque');
			await buscar(page, peca.name);
			const card = cartao(page, peca.name);
			await card.getByRole('button', { name: `Aumentar quantidade de ${peca.name}` }).click();
			await expect(card).toContainText('1 unidade');
			await card.getByRole('button', { name: `Diminuir quantidade de ${peca.name}` }).click();
			await expect(card).toContainText('0 unidades');
			expect(await banco.movimentosDaPeca(peca.id)).toEqual([
				expect.objectContaining({ kind: 'purchase', quantity: 1, unit_price: 15, movement_date: hojeIsoLocal() }),
				expect.objectContaining({ kind: 'adjustment', quantity: 1 }),
			]);
			await card.getByRole('link').click();
			const historico = page.getByRole('region', { name: 'Histórico' });
			await expect(historico.locator('li.movimento').filter({ hasText: 'Compra' })).toHaveCount(1);
			await expect(historico.locator('li.movimento').filter({ hasText: 'Saída (ajuste)' })).toHaveCount(1);
			await expect(historico.getByRole('button', { name: /Estornar/ })).toHaveCount(0);
		});

		test('estornar venda: cancelar mantém; confirmar devolve o estoque e apaga a venda', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Estorno ${unico()}`, quantity: 3 });
			await banco.venderPeca(peca.id, 2, 50, '2025-05-05');
			await page.goto(`/administracao/estoque/${peca.id}`);
			await expect(page.locator('#peca-quantidade')).toHaveValue('1');
			const estornar = page.getByRole('button', { name: 'Estornar venda de 05/05/2025' });

			await estornar.click();
			await expect(dialogo(page)).toContainText('A venda de 2 unidades será apagada e as unidades voltam ao estoque.');
			await dialogo(page).getByRole('button', { name: 'Voltar' }).click();
			expect((await banco.movimentosDaPeca(peca.id)).filter((m) => m.kind === 'sale')).toHaveLength(1);

			await estornar.click();
			await dialogo(page).getByRole('button', { name: 'Estornar' }).click();
			await expect(toast(page, 'Venda estornada.')).toBeVisible();
			await expect(page.locator('#peca-quantidade')).toHaveValue('3');
			await expect(estornar).toHaveCount(0);
			expect((await banco.peca(peca.id))!.quantity).toBe(3);
			expect((await banco.movimentosDaPeca(peca.id)).filter((m) => m.kind === 'sale')).toEqual([]);
		});

		test('histórico com mais de 20 movimentações pagina com "Carregar mais"', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Muitas ${unico()}`, quantity: 22 });
			for (let i = 0; i < 21; i++) await banco.venderPeca(peca.id, 1, 1, '2025-06-01');
			await page.goto(`/administracao/estoque/${peca.id}`);
			const historico = page.getByRole('region', { name: 'Histórico' });
			await expect(historico.locator('li.movimento')).toHaveCount(20);
			await historico.getByRole('button', { name: 'Carregar mais' }).click();
			await expect(historico.locator('li.movimento')).toHaveCount(22);
			await expect(historico.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
		});
	});

	test.describe('mobile (375 px)', () => {
		test('listagem sem scroll horizontal e com alvos de toque ≥ 44 px', async ({ page, banco }) => {
			const peca = await banco.criarPeca({
				name: `Peça com nome bem comprido para testar o corte do texto no card ${unico()}`,
				motorcycle_model: 'Modelo de moto também comprido para testar',
				year_start: 2010,
				year_end: 2024,
				purchase_price: 12345.67,
				sale_price: 23456.78,
			});
			await page.goto('/administracao/estoque');
			await buscar(page, peca.name);
			await expect(cartao(page, peca.name)).toBeVisible();
			await esperarSemScrollHorizontal(page);
			await esperarAlvosDeToque(page.locator('main'));
		});

		test('formulário sem scroll horizontal, alvos ≥ 44 px e inputs ≥ 16 px', async ({ page }) => {
			await abrirNova(page);
			await page.waitForLoadState('networkidle');
			await esperarSemScrollHorizontal(page);
			await esperarAlvosDeToque(page.locator('main'));
			const pequenos = await page
				.locator('input:visible')
				.evaluateAll((campos) => campos.filter((c) => parseFloat(getComputedStyle(c).fontSize) < 16).map((c) => c.id));
			expect(pequenos).toEqual([]);
		});

		test('drawer de venda sem scroll horizontal, alvos ≥ 44 px, inputs ≥ 16 px e teclado numérico', async ({ page, banco }) => {
			const peca = await banco.criarPeca({ name: `Peça com nome bem comprido para o drawer de venda ${unico()}`, quantity: 1 });
			await page.goto('/administracao/estoque');
			await buscar(page, peca.name);
			await cartao(page, peca.name)
				.getByRole('button', { name: `Vender ${peca.name}` })
				.click();
			const drawer = page.locator('.p-drawer');
			await expect(drawer).toBeVisible();
			await esperarSemScrollHorizontal(page);
			await esperarAlvosDeToque(drawer.locator('form'));
			const pequenos = await drawer
				.locator('input:visible')
				.evaluateAll((campos) => campos.filter((c) => parseFloat(getComputedStyle(c).fontSize) < 16).map((c) => c.id));
			expect(pequenos).toEqual([]);
			await expect(page.locator('#venda-quantidade')).toHaveAttribute('inputmode', /decimal|numeric/);
			await expect(page.locator('#venda-preco')).toHaveAttribute('inputmode', /decimal|numeric/);
		});

		test('campos de ano e valores abrem o teclado numérico', async ({ page }) => {
			await abrirNova(page);
			await expect(page.locator('#peca-ano-inicio')).toHaveAttribute('inputmode', 'numeric');
			await expect(page.locator('#peca-ano-fim')).toHaveAttribute('inputmode', 'numeric');
			await expect(page.locator('#peca-compra')).toHaveAttribute('inputmode', /decimal|numeric/);
			await expect(page.locator('#peca-venda')).toHaveAttribute('inputmode', /decimal|numeric/);
			await expect(page.locator('#peca-quantidade')).toHaveAttribute('inputmode', /decimal|numeric/);
		});
	});
});
