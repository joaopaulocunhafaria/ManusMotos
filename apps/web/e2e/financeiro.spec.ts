import { Page } from '@playwright/test';
import { Banco } from './apoio/banco';
import { esperarAlvosDeToque, esperarSemScrollHorizontal, expect, preencherNumero, test, toast } from './apoio/fixtures';
import { hojeIsoLocal, segundaFeiraIsolada, somarDias, unico } from './apoio/geradores';

/**
 * Gestão financeira: /administracao/financeiro
 * Cada teste usa datas isoladas (semanas em 2040–2079, meses/anos em 2200–2999) para não somar
 * movimentos de outros testes que rodam em paralelo. Os testes que mudam o caixa (linha única) rodam em série.
 */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moeda = (valor: number) => MOEDA.format(valor).replace(/ /g, ' ');
const valorDoCard = (page: Page, card: string) => page.locator(`[data-card="${card}"] .valor`);
const itensExtrato = (page: Page) => page.locator('li.item-extrato');
const dialogo = (page: Page) => page.locator('div.p-confirmdialog');
const salvar = (page: Page) => page.getByRole('button', { name: /^\W*Salvar$/ });
/** Opção do p-selectButton (o host não tem role="button"; o selecionado tem aria-pressed="true"). */
const opcaoTipoLancamento = (page: Page, nome: 'Entrada' | 'Saída') =>
	page.locator('p-selectbutton p-togglebutton').filter({ hasText: nome });
const botaoTipo = (page: Page, nome: string) => page.getByRole('group', { name: 'Tipo de período' }).getByRole('button', { name: nome });

/** Ano aleatório e distante, só do teste. */
function anoIsolado(): number {
	return 2200 + Math.floor(Math.random() * 800);
}

/** `dd/mm/aaaa` a partir de `YYYY-MM-DD`. */
function br(iso: string): string {
	const [a, m, d] = iso.split('-');
	return `${d}/${m}/${a}`;
}

async function abrirPeriodo(page: Page, consulta: string): Promise<void> {
	await page.goto(`/administracao/financeiro?${consulta}`);
	await expect(page.locator('[data-card="saldo"]')).toBeVisible();
}

async function semanaIsolada(page: Page, segunda: string): Promise<void> {
	await abrirPeriodo(page, `periodo=semana&de=${segunda}`);
}

/** OS de `preco` concluída na data (`YYYY-MM-DD`). */
async function criarOsConcluida(banco: Banco, preco: number, data: string) {
	const cliente = await banco.criarCliente({ nome: `Cliente Fin ${unico()}` });
	const servico = await banco.criarServico();
	const ordem = await banco.criarOrdem(cliente, [{ servico, preco }]);
	await banco.concluirOrdemEm(ordem.id, data);
	return { ordem, cliente };
}

test.describe('Financeiro', () => {
	test.describe('rotas e período', () => {
		test('o menu lateral abre /administracao/financeiro com o mês atual', async ({ page }) => {
			await page.goto('/administracao/agenda');
			await page.getByRole('button', { name: 'Abrir menu' }).click();
			const link = page.getByRole('navigation', { name: 'Menu lateral' }).getByRole('link', { name: 'Financeiro', exact: true });
			await link.click();
			await expect(page).toHaveURL(/\/administracao\/financeiro$/);
			await expect(page.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeVisible();
			await expect(botaoTipo(page, 'Mês')).toHaveAttribute('aria-pressed', 'true');
			const hoje = new Date(`${hojeIsoLocal()}T12:00:00`);
			const mes = hoje.toLocaleDateString('pt-BR', { month: 'long' });
			await expect(page.locator('#periodo-rotulo')).toHaveText(`${mes[0].toUpperCase()}${mes.slice(1)} de ${hoje.getFullYear()}`);
		});

		test('querystring válida abre o período pedido (semana, ano e personalizado)', async ({ page }) => {
			await abrirPeriodo(page, 'periodo=semana&de=2026-11-18');
			await expect(botaoTipo(page, 'Semana')).toHaveAttribute('aria-pressed', 'true');
			await expect(page.locator('#periodo-rotulo')).toHaveText('16 – 22 nov 2026');

			await abrirPeriodo(page, 'periodo=ano&de=2025-06-01');
			await expect(page.locator('#periodo-rotulo')).toHaveText('2025');

			await abrirPeriodo(page, 'periodo=personalizado&de=2026-11-05&ate=2026-11-09');
			await expect(page.locator('#periodo-rotulo')).toHaveText('05/11/2026 a 09/11/2026');
			await expect(page.locator('#periodo-de')).toHaveValue('2026-11-05');
			await expect(page.locator('#periodo-ate')).toHaveValue('2026-11-09');
		});

		for (const consulta of [
			'periodo=trimestre',
			'periodo=semana&de=2026-02-30',
			'periodo=mes&de=17/11/2026',
			'periodo=personalizado&de=2026-11-10&ate=2026-11-09',
			'periodo=personalizado&de=2026-11-10',
		]) {
			test(`querystring inválida (${consulta}) avisa e cai no mês atual`, async ({ page }) => {
				await page.goto(`/administracao/financeiro?${consulta}`);
				await expect(toast(page, 'Período inválido. Mostrando o mês atual.')).toBeVisible();
				await expect(page).toHaveURL(/periodo=mes/);
				await expect(botaoTipo(page, 'Mês')).toHaveAttribute('aria-pressed', 'true');
			});
		}

		test('rota inexistente dentro do financeiro volta para o painel', async ({ page }) => {
			await page.goto('/administracao/financeiro/xyz');
			await expect(page).toHaveURL(/\/administracao\/financeiro(\?.*)?$/);
			await expect(page.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeVisible();
		});

		test('tipos e setas mudam o período na URL e o botão voltar retorna ao anterior', async ({ page }) => {
			await abrirPeriodo(page, 'periodo=semana&de=2026-11-16');
			await page.getByRole('button', { name: 'Próximo período' }).click();
			await expect(page).toHaveURL(/periodo=semana&de=2026-11-23/);
			await expect(page.locator('#periodo-rotulo')).toHaveText('23 – 29 nov 2026');
			await page.getByRole('button', { name: 'Período anterior' }).click();
			await page.getByRole('button', { name: 'Período anterior' }).click();
			await expect(page.locator('#periodo-rotulo')).toHaveText('9 – 15 nov 2026');

			await page.goBack();
			await expect(page.locator('#periodo-rotulo')).toHaveText('16 – 22 nov 2026');
			await page.goBack();
			await expect(page.locator('#periodo-rotulo')).toHaveText('23 – 29 nov 2026');

			await botaoTipo(page, 'Ano').click();
			await expect(page).toHaveURL(/periodo=ano/);
			await expect(botaoTipo(page, 'Ano')).toHaveAttribute('aria-pressed', 'true');
			await page.getByRole('button', { name: 'Período anterior' }).click();
			await expect(page.locator('#periodo-rotulo')).toHaveText(String(new Date().getFullYear() - 1));

			await botaoTipo(page, 'Mês').click();
			await page.getByRole('button', { name: 'Período anterior' }).click();
			await expect(page).toHaveURL(/periodo=mes&de=\d{4}-\d{2}-01/);
		});

		test('período personalizado: aplica as datas; datas invertidas ou vazias mostram erro e não mudam a URL', async ({ page }) => {
			await abrirPeriodo(page, 'periodo=mes&de=2026-11-01');
			await botaoTipo(page, 'Período').click();
			await expect(page).toHaveURL(/periodo=personalizado&de=2026-11-01&ate=2026-11-30/);

			await page.locator('#periodo-de').fill('2026-11-10');
			await page.locator('#periodo-ate').fill('2026-11-09');
			await page.getByRole('button', { name: 'Aplicar período' }).click();
			await expect(page.getByText('A data inicial não pode ser depois da final.')).toBeVisible();
			await expect(page).toHaveURL(/ate=2026-11-30/);

			await page.locator('#periodo-ate').fill('');
			await page.getByRole('button', { name: 'Aplicar período' }).click();
			await expect(page.getByText('Informe as duas datas.')).toBeVisible();

			await page.locator('#periodo-ate').fill('2026-11-10');
			await page.getByRole('button', { name: 'Aplicar período' }).click();
			await expect(page).toHaveURL(/periodo=personalizado&de=2026-11-10&ate=2026-11-10/);
			await expect(page.locator('#periodo-rotulo')).toHaveText('10/11/2026');
		});
	});

	test.describe('balanço por período', () => {
		test('cards somam OS concluídas, vendas, compras e lançamentos da semana; o extrato lista com sinal', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			const { ordem, cliente } = await criarOsConcluida(banco, 300, somarDias(segunda, 1));
			const peca = await banco.criarPeca({ name: `Pastilha Fin ${unico()}`, purchase_price: 25, quantity: 4, purchase_date: segunda });
			await banco.venderPeca(peca.id, 2, 60, somarDias(segunda, 2));
			const despesa = await banco.criarLancamento({ kind: 'expense', amount: 80, entry_date: somarDias(segunda, 3) });
			await banco.criarLancamento({ kind: 'income', amount: 20, entry_date: somarDias(segunda, 4) });
			// OS não concluída não entra.
			await banco.criarOrdem(cliente, [{ servico: await banco.criarServico(), preco: 999 }]);

			await semanaIsolada(page, segunda);
			await expect(valorDoCard(page, 'saldo')).toHaveText(moeda(300 + 120 + 20 - 100 - 80));
			await expect(page.locator('[data-card="saldo"]')).toContainText(`Entradas ${moeda(440)} · Saídas ${moeda(180)}`);
			await expect(valorDoCard(page, 'os')).toHaveText(moeda(300));
			await expect(page.locator('[data-card="os"]')).toContainText('1 ordem');
			await expect(valorDoCard(page, 'vendas')).toHaveText(moeda(120));
			await expect(page.locator('[data-card="vendas"]')).toContainText('2 unidades');
			await expect(valorDoCard(page, 'lucro-pecas')).toHaveText(moeda(70));
			await expect(valorDoCard(page, 'compras')).toHaveText(moeda(100));
			await expect(page.locator('[data-card="compras"]')).toContainText('4 unidades');
			await expect(valorDoCard(page, 'entradas')).toHaveText(moeda(20));
			await expect(valorDoCard(page, 'saidas')).toHaveText(moeda(80));

			await expect(itensExtrato(page)).toHaveCount(5);
			const os = itensExtrato(page).filter({ hasText: `OS #${ordem.number}` });
			await expect(os).toContainText(`+ ${moeda(300)}`);
			await expect(os).toContainText(br(somarDias(segunda, 1)));
			await expect(itensExtrato(page).filter({ hasText: '2× ' + peca.name })).toContainText(`+ ${moeda(120)}`);
			await expect(itensExtrato(page).filter({ hasText: '4× ' + peca.name })).toContainText(`− ${moeda(100)}`);
			await expect(itensExtrato(page).filter({ hasText: despesa.description })).toContainText(`− ${moeda(80)}`);
			// Mais recente primeiro.
			await expect(itensExtrato(page).first()).toHaveAttribute('data-origem', 'income');
			await expect(itensExtrato(page).last()).toHaveAttribute('data-origem', 'purchase');

			await os.getByRole('link').click();
			await expect(page).toHaveURL(new RegExp(`/administracao/ordem-servico/${ordem.id}$`));
			await page.goBack();
			await itensExtrato(page)
				.filter({ hasText: '2× ' + peca.name })
				.getByRole('link')
				.click();
			await expect(page).toHaveURL(new RegExp(`/administracao/estoque/${peca.id}$`));
			await page.goBack();
			await itensExtrato(page).filter({ hasText: despesa.description }).getByRole('link').click();
			await expect(page).toHaveURL(new RegExp(`/administracao/financeiro/lancamentos/${despesa.id}$`));
		});

		test('semana inclui segunda e domingo e exclui o domingo anterior e a segunda seguinte', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			for (const [dias, valor] of [
				[-1, 1000],
				[0, 1],
				[6, 2],
				[7, 2000],
			]) {
				await banco.criarLancamento({ kind: 'income', amount: valor, entry_date: somarDias(segunda, dias) });
			}
			await semanaIsolada(page, segunda);
			await expect(valorDoCard(page, 'entradas')).toHaveText(moeda(3));
			await expect(itensExtrato(page)).toHaveCount(2);
		});

		test('mês inclui o dia 1º e o último dia (fevereiro bissexto) e exclui os vizinhos', async ({ page, banco }) => {
			let ano = anoIsolado();
			while (!(ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0))) ano++;
			for (const [data, valor] of [
				[`${ano}-01-31`, 1000],
				[`${ano}-02-01`, 1],
				[`${ano}-02-29`, 2],
				[`${ano}-03-01`, 2000],
			] as const) {
				await banco.criarLancamento({ kind: 'expense', amount: valor, entry_date: data });
			}
			await abrirPeriodo(page, `periodo=mes&de=${ano}-02-10`);
			await expect(page.locator('#periodo-rotulo')).toHaveText(`Fevereiro de ${ano}`);
			await expect(valorDoCard(page, 'saidas')).toHaveText(moeda(3));
			await expect(valorDoCard(page, 'saldo')).toHaveText(moeda(-3));
		});

		test('ano inclui 1º de janeiro e 31 de dezembro e exclui os anos vizinhos', async ({ page, banco }) => {
			const ano = anoIsolado();
			for (const [data, valor] of [
				[`${ano - 1}-12-31`, 1000],
				[`${ano}-01-01`, 1],
				[`${ano}-12-31`, 2],
				[`${ano + 1}-01-01`, 2000],
			] as const) {
				await banco.criarLancamento({ kind: 'income', amount: valor, entry_date: data });
			}
			await abrirPeriodo(page, `periodo=ano&de=${ano}-05-05`);
			await expect(valorDoCard(page, 'entradas')).toHaveText(moeda(3));
		});

		test('período personalizado de um dia só traz o que foi naquele dia', async ({ page, banco }) => {
			const dia = somarDias(segundaFeiraIsolada(), 2);
			await banco.criarLancamento({ kind: 'income', amount: 7, entry_date: dia });
			await banco.criarLancamento({ kind: 'income', amount: 1000, entry_date: somarDias(dia, 1) });
			await abrirPeriodo(page, `periodo=personalizado&de=${dia}&ate=${dia}`);
			await expect(valorDoCard(page, 'entradas')).toHaveText(moeda(7));
		});

		test('OS reaberta (saiu de concluída) deixa de contar', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			const { ordem } = await criarOsConcluida(banco, 150, segunda);
			await semanaIsolada(page, segunda);
			await expect(valorDoCard(page, 'os')).toHaveText(moeda(150));
			await banco.client.from('service_orders').update({ status: 'in_progress' }).eq('id', ordem.id);
			await page.reload();
			await expect(valorDoCard(page, 'os')).toHaveText(moeda(0));
			await expect(page.locator('[data-card="os"]')).toContainText('0 ordens');
		});

		test('venda estornada sai do balanço; venda de peça excluída continua no balanço, sem link', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			const estornada = await banco.criarPeca({ name: `Estornada Fin ${unico()}`, quantity: 1, purchase_date: segunda });
			const venda = await banco.venderPeca(estornada.id, 1, 50, segunda);
			await banco.client.rpc('cancel_part_sale', { p_movement_id: venda.id });
			const excluida = await banco.criarPeca({ name: `Excluída Fin ${unico()}`, quantity: 1, purchase_date: segunda });
			const vendaExcluida = await banco.venderPeca(excluida.id, 1, 40, segunda);
			await banco.excluirPecaComHistorico(excluida);

			await semanaIsolada(page, segunda);
			await expect(valorDoCard(page, 'vendas')).toHaveText(moeda(40));
			const item = page.locator(`li.item-extrato[data-ref="${vendaExcluida.id}"]`);
			await expect(item).toContainText(`1× ${excluida.name}`);
			await expect(item.getByRole('link')).toHaveCount(0);
			await expect(item.locator('a')).not.toHaveAttribute('href', /.+/);
		});

		test('período sem movimento: cards zerados e extrato vazio', async ({ page }) => {
			await semanaIsolada(page, segundaFeiraIsolada());
			await expect(valorDoCard(page, 'saldo')).toHaveText(moeda(0));
			await expect(valorDoCard(page, 'os')).toHaveText(moeda(0));
			await expect(page.getByText('Nenhuma movimentação no período.')).toBeVisible();
		});

		test('extrato com mais de 20 itens pagina com "Carregar mais"', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			for (let i = 0; i < 21; i++) await banco.criarLancamento({ kind: 'income', amount: 1, entry_date: segunda });
			await semanaIsolada(page, segunda);
			await expect(itensExtrato(page)).toHaveCount(20);
			await page.getByRole('button', { name: 'Carregar mais' }).click();
			await expect(itensExtrato(page)).toHaveCount(21);
			await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
			await expect(valorDoCard(page, 'entradas')).toHaveText(moeda(21));
		});

		test('carregando e erro do balanço e do extrato; "Tentar novamente" recarrega', async ({ page }) => {
			let falhar = true;
			let liberar: () => void = () => undefined;
			const espera = new Promise<void>((resolver) => (liberar = resolver));
			await page.route('**/rpc/financial_summary', async (rota) => {
				await espera;
				return falhar ? rota.fulfill({ status: 500, body: '{"message":"falha"}' }) : rota.fallback();
			});
			await page.route('**/rpc/financial_statement**', (rota) =>
				falhar ? rota.fulfill({ status: 500, body: '{"message":"falha"}' }) : rota.fallback(),
			);
			await page.goto('/administracao/financeiro');
			await expect(page.locator('p-progressspinner').first()).toBeVisible();
			liberar();
			await expect(page.getByText('Não foi possível carregar o balanço.')).toBeVisible();
			await expect(page.getByText('Não foi possível carregar o extrato.')).toBeVisible();

			falhar = false;
			// "Tentar novamente" do balanço recarrega o balanço e o extrato.
			await page
				.getByRole('button', { name: /Tentar/ })
				.first()
				.click();
			await expect(page.getByText('Não foi possível carregar o balanço.')).toHaveCount(0);
			await expect(page.getByText('Não foi possível carregar o extrato.')).toHaveCount(0);
			await expect(page.locator('[data-card="saldo"]')).toBeVisible();

			// Só o extrato falhando: o "Tentar novamente" dele recarrega só o extrato.
			let falharExtrato = true;
			await page.unroute('**/rpc/financial_statement**');
			await page.route('**/rpc/financial_statement**', (rota) =>
				falharExtrato ? rota.fulfill({ status: 500, body: '{"message":"falha"}' }) : rota.fallback(),
			);
			await page.getByRole('button', { name: 'Período anterior' }).click();
			await expect(page.getByText('Não foi possível carregar o extrato.')).toBeVisible();
			await expect(page.locator('[data-card="saldo"]')).toBeVisible();
			falharExtrato = false;
			await page.getByRole('button', { name: /Tentar/ }).click();
			await expect(page.getByText('Não foi possível carregar o extrato.')).toHaveCount(0);
		});
	});

	test.describe('caixa', () => {
		// O caixa é uma linha única: estes testes não podem rodar ao mesmo tempo.
		test.describe.configure({ mode: 'serial' });

		test('caminho feliz: configura o caixa pela tela e o caixa do período soma as movimentações', async ({ page, banco }) => {
			await banco.guardarCaixa();
			const segunda = segundaFeiraIsolada();
			await criarOsConcluida(banco, 300, somarDias(segunda, 1));
			await banco.criarLancamento({ kind: 'expense', amount: 50, entry_date: somarDias(segunda, 2) });
			// Antes da data inicial do caixa: entra no balanço da semana anterior, mas não no caixa.
			await banco.criarLancamento({ kind: 'income', amount: 900, entry_date: somarDias(segunda, -1) });

			await semanaIsolada(page, segunda);
			await page.getByRole('button', { name: /^\W*Configurar caixa$/ }).click();
			await preencherNumero(page, '#caixa-valor', '500');
			await page.locator('#caixa-data').fill(segunda);
			await page.getByRole('button', { name: /^\W*Salvar caixa$/ }).click();
			await expect(toast(page, 'Caixa atualizado.')).toBeVisible();

			expect(await banco.caixa()).toMatchObject({ opening_balance: 500, opening_date: segunda });
			await expect(page.locator('#card-caixa')).toContainText(`Início em ${br(segunda)}: ${moeda(500)}`);
			await expect(valorDoCard(page, 'caixa-inicio')).toHaveText(moeda(500));
			await expect(valorDoCard(page, 'caixa-fim')).toHaveText(moeda(750));

			await page.getByRole('button', { name: 'Período anterior' }).click();
			await expect(valorDoCard(page, 'entradas')).toHaveText(moeda(900));
			await expect(valorDoCard(page, 'caixa-fim')).toHaveText(moeda(500));
		});

		test('valor inicial negativo é aceito; cancelar não grava; data vazia não é enviada', async ({ page, banco }) => {
			await banco.guardarCaixa();
			const segunda = segundaFeiraIsolada();
			await banco.definirCaixa(10, segunda);
			await semanaIsolada(page, segunda);
			const abrir = () => page.getByRole('button', { name: /^\W*Configurar caixa$/ }).click();
			const drawer = page.locator('.p-drawer').filter({ hasText: 'Configurar caixa' });

			await abrir();
			await expect(page.locator('#caixa-data')).toHaveValue(segunda);
			await preencherNumero(page, '#caixa-valor', '999');
			await drawer.getByRole('button', { name: 'Cancelar' }).click();
			await expect(drawer).toBeHidden();
			expect((await banco.caixa()).opening_balance).toBe(10);

			await abrir();
			await page.locator('#caixa-data').fill('');
			await page.getByRole('button', { name: /^\W*Salvar caixa$/ }).click();
			await expect(page.getByText('Informe a data inicial do caixa.')).toBeVisible();
			expect((await banco.caixa()).opening_date).toBe(segunda);

			await page.locator('#caixa-data').fill(segunda);
			await preencherNumero(page, '#caixa-valor', '-150,5');
			await page.getByRole('button', { name: /^\W*Salvar caixa$/ }).click();
			await expect(toast(page, 'Caixa atualizado.')).toBeVisible();
			expect((await banco.caixa()).opening_balance).toBe(-150.5);
			await expect(valorDoCard(page, 'caixa-fim')).toHaveText(moeda(-150.5));
		});
	});

	test.describe('lançamentos manuais', () => {
		test('caminho feliz: "Nova saída" grava no banco e aparece no extrato e nos cards do período', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			const descricao = `Aluguel ${unico()}`;
			await semanaIsolada(page, segunda);
			await page.getByRole('button', { name: /^\W*Nova saída$/ }).click();
			await expect(page).toHaveURL(/\/financeiro\/lancamentos\/novo\?tipo=expense$/);
			await expect(page.getByRole('heading', { level: 1, name: 'Novo lançamento' })).toBeVisible();
			await expect(opcaoTipoLancamento(page, 'Saída')).toHaveAttribute('aria-pressed', 'true');
			await expect(page.locator('#lancamento-data')).toHaveValue(hojeIsoLocal());

			await page.locator('#lancamento-descricao').fill(`  ${descricao}  `);
			await preencherNumero(page, '#lancamento-valor', '1234,56');
			await page.locator('#lancamento-data').fill(somarDias(segunda, 3));
			await page.locator('#lancamento-observacao').fill('  Novembro  ');
			await salvar(page).click();
			await expect(toast(page, 'Lançamento registrado.')).toBeVisible();
			await expect(page).toHaveURL(/\/administracao\/financeiro$/);

			const [salvo] = await banco.lancamentosPorDescricao(descricao);
			expect(salvo).toMatchObject({ kind: 'expense', amount: 1234.56, entry_date: somarDias(segunda, 3), notes: 'Novembro' });
			await semanaIsolada(page, segunda);
			await expect(valorDoCard(page, 'saidas')).toHaveText(moeda(1234.56));
			await expect(itensExtrato(page).filter({ hasText: descricao })).toContainText(`− ${moeda(1234.56)}`);
		});

		test('"Nova entrada" já vem com Entrada; trocar o tipo grava o escolhido', async ({ page, banco }) => {
			const descricao = `Aporte ${unico()}`;
			await page.goto('/administracao/financeiro');
			await page.getByRole('button', { name: /^\W*Nova entrada$/ }).click();
			await expect(opcaoTipoLancamento(page, 'Entrada')).toHaveAttribute('aria-pressed', 'true');
			await opcaoTipoLancamento(page, 'Saída').click();
			await opcaoTipoLancamento(page, 'Entrada').click();
			await page.locator('#lancamento-descricao').fill(descricao);
			await preencherNumero(page, '#lancamento-valor', '10');
			await page.locator('#lancamento-data').fill(segundaFeiraIsolada());
			await salvar(page).click();
			await expect(toast(page, 'Lançamento registrado.')).toBeVisible();
			expect((await banco.lancamentosPorDescricao(descricao))[0]).toMatchObject({ kind: 'income', amount: 10, notes: null });
		});

		test.describe('validações', () => {
			test.beforeEach(async ({ page }) => {
				await page.goto('/administracao/financeiro/lancamentos/novo');
				await expect(page.getByRole('heading', { level: 1, name: 'Novo lançamento' })).toBeVisible();
			});

			test('obrigatórios vazios não são enviados', async ({ page }) => {
				await page.locator('#lancamento-data').fill('');
				await salvar(page).click();
				await expect(page.getByText('Informe a descrição (até 120 caracteres).')).toBeVisible();
				await expect(page.getByText('Informe um valor maior que zero.')).toBeVisible();
				await expect(page.getByText('Informe a data.')).toBeVisible();
				await expect(page).toHaveURL(/lancamentos\/novo$/);
			});

			test('descrição só com espaços não é enviada', async ({ page, banco }) => {
				await page.locator('#lancamento-descricao').fill('     ');
				await preencherNumero(page, '#lancamento-valor', '10');
				await salvar(page).click();
				await expect(page.getByText('Informe a descrição (até 120 caracteres).')).toBeVisible();
				expect(await banco.lancamentosPorDescricao('     ')).toEqual([]);
			});

			test('valor zero não é enviado', async ({ page, banco }) => {
				const descricao = `Zero ${unico()}`;
				await page.locator('#lancamento-descricao').fill(descricao);
				await preencherNumero(page, '#lancamento-valor', '0');
				await salvar(page).click();
				await expect(page.getByText('Informe um valor maior que zero.')).toBeVisible();
				expect(await banco.lancamentosPorDescricao(descricao)).toEqual([]);
			});

			test('valor mínimo (R$ 0,01) e descrição com 120 caracteres são aceitos; o campo limita a 120', async ({ page, banco }) => {
				const descricao = `${unico()}`.padEnd(120, 'x');
				await page.locator('#lancamento-descricao').fill(descricao + 'excedente');
				await expect(page.locator('#lancamento-descricao')).toHaveValue(descricao);
				await preencherNumero(page, '#lancamento-valor', '0,01');
				await page.locator('#lancamento-data').fill(segundaFeiraIsolada());
				await salvar(page).click();
				await expect(toast(page, 'Lançamento registrado.')).toBeVisible();
				expect((await banco.lancamentosPorDescricao(descricao))[0]).toMatchObject({ amount: 0.01 });
			});
		});

		test('editar pelo extrato grava as mudanças', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			const lancamento = await banco.criarLancamento({ kind: 'expense', amount: 30, entry_date: segunda, notes: 'antiga' });
			await semanaIsolada(page, segunda);
			await itensExtrato(page).filter({ hasText: lancamento.description }).getByRole('link').click();
			await expect(page.getByRole('heading', { level: 1, name: 'Editar lançamento' })).toBeVisible();
			await expect(page.locator('#lancamento-descricao')).toHaveValue(lancamento.description);
			await expect(page.locator('#lancamento-data')).toHaveValue(segunda);
			await preencherNumero(page, '#lancamento-valor', '45');
			await opcaoTipoLancamento(page, 'Entrada').click();
			await page.locator('#lancamento-observacao').fill('');
			await salvar(page).click();
			await expect(toast(page, 'Lançamento atualizado.')).toBeVisible();
			expect(await banco.lancamento(lancamento.id)).toMatchObject({ kind: 'income', amount: 45, notes: null });
		});

		test('excluir: cancelar mantém; confirmar apaga e volta ao painel', async ({ page, banco }) => {
			const lancamento = await banco.criarLancamento({ entry_date: segundaFeiraIsolada() });
			await page.goto(`/administracao/financeiro/lancamentos/${lancamento.id}`);
			await page.getByRole('button', { name: /^\W*Excluir lançamento$/ }).click();
			await expect(dialogo(page)).toContainText(`"${lancamento.description}" será apagado definitivamente.`);
			await dialogo(page).getByRole('button', { name: 'Voltar' }).click();
			expect(await banco.lancamento(lancamento.id)).not.toBeNull();

			await page.getByRole('button', { name: /^\W*Excluir lançamento$/ }).click();
			await dialogo(page).getByRole('button', { name: 'Excluir' }).click();
			await expect(toast(page, 'Lançamento excluído.')).toBeVisible();
			await expect(page).toHaveURL(/\/administracao\/financeiro$/);
			expect(await banco.lancamento(lancamento.id)).toBeNull();
		});

		test('lançamento novo não tem botão de excluir; o voltar retorna ao painel', async ({ page }) => {
			await page.goto('/administracao/financeiro/lancamentos/novo');
			await expect(page.getByRole('button', { name: /Excluir/ })).toHaveCount(0);
			await page.getByRole('button', { name: 'Voltar' }).click();
			await expect(page).toHaveURL(/\/administracao\/financeiro$/);
		});

		for (const id of ['00000000-0000-4000-8000-0000000000ff', 'abc']) {
			test(`/lancamentos/${id} (inexistente ou inválido) mostra o estado de erro`, async ({ page }) => {
				await page.goto(`/administracao/financeiro/lancamentos/${id}`);
				await expect(page.getByText('Não foi possível carregar o lançamento.')).toBeVisible();
				await expect(page.locator('#lancamento-descricao')).toHaveCount(0);
			});
		}
	});

	test.describe('mobile (375 px)', () => {
		const inputsPequenos = (page: Page) =>
			page
				.locator('input:visible')
				.evaluateAll((campos) => campos.filter((c) => parseFloat(getComputedStyle(c).fontSize) < 16).map((c) => c.id));

		test('painel com valores grandes sem scroll horizontal e com alvos ≥ 44 px', async ({ page, banco }) => {
			const segunda = segundaFeiraIsolada();
			await banco.criarLancamento({
				kind: 'income',
				amount: 99_999_999.99,
				entry_date: segunda,
				description: `Descrição bem comprida de um lançamento para testar o corte ${unico()}`,
			});
			await abrirPeriodo(page, `periodo=personalizado&de=${segunda}&ate=${somarDias(segunda, 6)}`);
			await expect(itensExtrato(page)).toHaveCount(1);
			await esperarSemScrollHorizontal(page);
			await esperarAlvosDeToque(page.locator('main'));
			expect(await inputsPequenos(page)).toEqual([]);
		});

		test('drawer do caixa e formulário de lançamento: sem scroll horizontal, alvos ≥ 44 px, inputs ≥ 16 px', async ({ page }) => {
			await page.goto('/administracao/financeiro');
			await page.getByRole('button', { name: /^\W*Configurar caixa$/ }).click();
			const drawer = page.locator('.p-drawer');
			await expect(drawer).toBeVisible();
			await esperarSemScrollHorizontal(page);
			await esperarAlvosDeToque(drawer.locator('form'));
			expect(await inputsPequenos(page)).toEqual([]);
			await expect(page.locator('#caixa-valor')).toHaveAttribute('inputmode', /decimal|numeric/);

			await page.goto('/administracao/financeiro/lancamentos/novo');
			await page.waitForLoadState('networkidle');
			await esperarSemScrollHorizontal(page);
			await esperarAlvosDeToque(page.locator('main'));
			expect(await inputsPequenos(page)).toEqual([]);
			await expect(page.locator('#lancamento-valor')).toHaveAttribute('inputmode', /decimal|numeric/);
		});
	});
});
