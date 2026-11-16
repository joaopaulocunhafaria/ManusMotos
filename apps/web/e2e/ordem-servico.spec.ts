import { Page } from '@playwright/test';
import type { Servico } from '@manus/shared';
import { ClienteCriado } from './apoio/banco';
import {
	escolherNoAutocomplete,
	escolherNoSelect,
	esperarSemScrollHorizontal,
	expect,
	preencherNumero,
	test,
	toast,
} from './apoio/fixtures';
import { gerarPlaca, unico } from './apoio/geradores';

/** Substitui APIs do navegador que abrem janelas do sistema (compartilhar, imprimir, nova aba) e registra as chamadas. */
async function simularApisDoSistema(page: Page, opcoes: { compartilhar?: 'ok' | 'cancelar' | 'sem-suporte' } = {}): Promise<void> {
	await page.addInitScript((modo) => {
		const w = window as unknown as Record<string, unknown>;
		w['__compartilhados'] = [];
		w['__aberturas'] = [];
		w['__impressoes'] = [];
		const definir = (alvo: object, nome: string, valor: unknown) =>
			Object.defineProperty(alvo, nome, { value: valor, configurable: true, writable: true });
		if (modo === 'sem-suporte') {
			definir(navigator, 'canShare', undefined);
			definir(navigator, 'share', undefined);
		} else {
			definir(navigator, 'canShare', () => true);
			definir(navigator, 'share', async (dados: { files: File[] }) => {
				if (modo === 'cancelar') throw new DOMException('Cancelado', 'AbortError');
				const arquivo = dados.files[0];
				const bytes = new Uint8Array(await arquivo.slice(0, 8).arrayBuffer());
				(w['__compartilhados'] as unknown[]).push({
					nome: arquivo.name,
					tipo: arquivo.type,
					tamanho: arquivo.size,
					assinatura: Array.from(bytes),
				});
			});
		}
		definir(window, 'open', (url: string) => {
			(w['__aberturas'] as string[]).push(url);
			return null;
		});
		definir(window, 'print', () => {
			(w['__impressoes'] as string[]).push((document.querySelector('.area-impressao') as HTMLElement | null)?.innerText ?? '');
		});
	}, opcoes.compartilhar ?? 'ok');
}

async function cenario(banco: import('./apoio/banco').Banco, motos = 1): Promise<{ cliente: ClienteCriado; servicos: Servico[] }> {
	const cliente = await banco.criarCliente({ motos, nome: `Cliente OS ${unico()}`, endereco: 'Rua Secreta, 99' });
	const servicos = [await banco.criarServico(`Óleo E2E ${unico()}`), await banco.criarServico(`Freio E2E ${unico()}`)];
	return { cliente, servicos };
}

async function escolherCliente(page: Page, cliente: ClienteCriado): Promise<void> {
	await escolherNoAutocomplete(page, '#os-cliente', cliente.name.slice(-10), cliente.name);
}

async function preencherItem(page: Page, indice: number, servico: Servico, preco: string): Promise<void> {
	await escolherNoAutocomplete(page, `#os-servico-${indice}`, servico.name.slice(-10), servico.name);
	await preencherNumero(page, `#os-preco-${indice}`, preco);
}

const criarOs = (page: Page) => page.getByRole('button', { name: 'Criar ordem de serviço' }).click();
const statusOs = (page: Page) => page.locator('p-tag').first();
/** Painel visível do p-confirmDialog (o host vazio também tem role=alertdialog). */
const dialogo = (page: Page) => page.locator('div.p-confirmdialog');

/** Espera a navegação para o detalhe e devolve o id da OS na URL. */
async function idDaUrl(page: Page): Promise<string> {
	await expect(page).toHaveURL(/\/ordem-servico\/[0-9a-f-]{36}$/);
	return page.url().split('/').pop()!;
}

async function abrirMenu(page: Page, item: string): Promise<void> {
	await page.getByRole('button', { name: 'Mais ações' }).click();
	await page.getByRole('menuitem', { name: item }).click();
}

test.describe('Ordem de serviço: formulário', () => {
	test.beforeEach(async ({ page }) => simularApisDoSistema(page));

	test('caminho feliz: cria OS parcelada com entrada e abre o detalhe interno completo', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco, 2);
		await page.goto('/administracao/ordem-servico');
		await page.getByRole('button', { name: 'Nova ordem de serviço' }).click();
		await expect(page).toHaveURL(/\/ordem-servico\/nova$/);

		await escolherCliente(page, cliente);
		// Cliente com 2 motos: a moto não é escolhida sozinha.
		await expect(page.locator('#os-moto').locator('..')).toContainText('Selecione a moto');
		await escolherNoSelect(page, 'os-moto', cliente.motorcycles[1].model);
		await page.locator('#os-km').fill('23500');

		await preencherItem(page, 0, servicos[0], '80');
		await page.getByRole('button', { name: 'Adicionar serviço' }).click();
		await preencherItem(page, 1, servicos[1], '120,50');
		await expect(page.getByText('R$ 200,50').first()).toBeVisible();

		await page.locator('p-selectbutton').getByText('Parcelado').click();
		await preencherNumero(page, '#os-entrada', '50,50');
		await escolherNoSelect(page, 'os-parcelas', '3x de R$ 50,00');
		await expect(page.locator('dl').first()).toContainText('Restante');
		await expect(page.locator('dl').first()).toContainText('R$ 150,00');
		await page.locator('#os-prazo').fill('2 dias');
		await page.locator('#os-obs-cliente').fill('Peças inclusas.');
		await page.locator('#os-obs').fill('Interno: barulho na corrente');
		await esperarSemScrollHorizontal(page);
		await criarOs(page);

		await expect(toast(page, 'Ordem de serviço criada.')).toBeVisible();
		const id = await idDaUrl(page);
		banco.registrar('ordens', id);

		const ordem = await banco.ordem(id);
		expect(ordem).toMatchObject({
			client_id: cliente.id,
			motorcycle_id: cliente.motorcycles[1].id,
			mileage: 23500,
			payment_method: 'installments',
			installments: 3,
			down_payment: 50.5,
			total: 200.5,
			status: 'draft',
			estimated_time: '2 dias',
			notes: 'Interno: barulho na corrente',
			customer_notes: 'Peças inclusas.',
		});
		const itens = await banco.itensDaOrdem(id);
		expect(itens.map((i) => [i.service_name, i.price])).toEqual([
			[servicos[0].name, 80],
			[servicos[1].name, 120.5],
		]);

		// Detalhe interno mostra tudo, inclusive o que não vai para o cliente.
		await expect(page.getByRole('heading', { name: `OS #${ordem.number}` })).toBeVisible();
		await expect(statusOs(page)).toHaveText('Rascunho');
		for (const texto of [
			cliente.name,
			'Rua Secreta, 99',
			cliente.motorcycles[1].model,
			'23.500 km',
			'3x de R$ 50,00',
			'Interno: barulho na corrente',
		]) {
			await expect(page.getByText(texto).first()).toBeVisible();
		}
		await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', `https://wa.me/55${cliente.phone}`);
		await esperarSemScrollHorizontal(page);
	});

	test('cliente com uma moto: a moto é escolhida automaticamente; limpar o cliente limpa a moto', async ({ page, banco }) => {
		const { cliente } = await cenario(banco, 1);
		await page.goto('/administracao/ordem-servico/nova');
		await escolherCliente(page, cliente);
		await expect(page.locator('#os-moto').locator('..')).toContainText(cliente.motorcycles[0].model);
		await page.locator('p-autocomplete').first().locator('.p-autocomplete-clear-icon').click();
		await expect(page.locator('#os-moto').locator('..')).toContainText('Selecione a moto');
	});

	test('formulário vazio: avisa o que falta, na ordem, e não grava', async ({ page, banco }) => {
		const { cliente } = await cenario(banco, 2);
		await page.goto('/administracao/ordem-servico/nova');
		await criarOs(page);
		await expect(toast(page, 'Selecione o cliente.')).toBeVisible();
		await expect(page.getByText('Selecione um cliente da lista.')).toBeVisible();

		await escolherCliente(page, cliente);
		await criarOs(page);
		await expect(toast(page, 'Selecione a moto.')).toBeVisible();

		await escolherNoSelect(page, 'os-moto', cliente.motorcycles[0].model);
		await criarOs(page);
		await expect(page.getByText('Selecione um serviço da lista.')).toBeVisible();
		await expect(page.getByText('Informe o preço.')).toBeVisible();

		await page.getByRole('button', { name: 'Remover serviço' }).click();
		await criarOs(page);
		await expect(toast(page, 'Adicione ao menos um serviço.')).toBeVisible();
		await expect(page).toHaveURL(/\/nova$/);
	});

	test('texto digitado sem escolher um cliente da lista não é aceito', async ({ page }) => {
		await page.goto('/administracao/ordem-servico/nova');
		await page.locator('#os-cliente').pressSequentially(`Ninguém ${unico()}`, { delay: 10 });
		await page.locator('#os-km').click();
		await expect(page.locator('#os-cliente')).toHaveValue('');
		await criarOs(page);
		await expect(toast(page, 'Selecione o cliente.')).toBeVisible();
	});

	test('entrada maior que o total é bloqueada', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		await page.goto('/administracao/ordem-servico/nova');
		await escolherCliente(page, cliente);
		await preencherItem(page, 0, servicos[0], '100');
		await preencherNumero(page, '#os-entrada', '150');
		await criarOs(page);
		await expect(toast(page, 'A entrada não pode ser maior que o total.')).toBeVisible();
		await expect(page.getByText('A entrada não pode ser maior que o total.').last()).toBeVisible();
		await expect(page).toHaveURL(/\/nova$/);

		// Entrada igual ao total é válida (restante zero).
		await preencherNumero(page, '#os-entrada', '100');
		await criarOs(page);
		await expect(toast(page, 'Ordem de serviço criada.')).toBeVisible();
		const ordem = await banco.ordem(await idDaUrl(page));
		expect([ordem.total, ordem.down_payment]).toEqual([100, 100]);
	});

	test('parcelado exige quantidade de parcelas; voltar para Pix descarta as parcelas', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		await page.goto('/administracao/ordem-servico/nova');
		await escolherCliente(page, cliente);
		await preencherItem(page, 0, servicos[0], '300');

		await page.locator('p-selectbutton').getByText('Parcelado').click();
		await criarOs(page);
		await expect(toast(page, 'Escolha a quantidade de parcelas.')).toBeVisible();

		await escolherNoSelect(page, 'os-parcelas', '12x de R$ 25,00');
		await page.locator('p-selectbutton').getByText('Pix').click();
		await expect(page.locator('#os-parcelas')).toHaveCount(0);
		await criarOs(page);
		await expect(toast(page, 'Ordem de serviço criada.')).toBeVisible();
		const ordem = await banco.ordem(await idDaUrl(page));
		expect([ordem.payment_method, ordem.installments]).toEqual(['pix', null]);
	});

	test('serviço de preço zero é aceito (cortesia)', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		await page.goto('/administracao/ordem-servico/nova');
		await escolherCliente(page, cliente);
		await preencherItem(page, 0, servicos[0], '0');
		await page.locator('p-selectbutton').getByText('À vista').click();
		await criarOs(page);
		await expect(toast(page, 'Ordem de serviço criada.')).toBeVisible();
		const ordem = await banco.ordem(await idDaUrl(page));
		expect([ordem.total, ordem.payment_method]).toEqual([0, 'cash']);
	});

	test('cadastra cliente novo sem sair da OS e ele já fica selecionado', async ({ page, banco }) => {
		const { gerarCpf } = await import('./apoio/geradores');
		const cpf = gerarCpf();
		const placa = gerarPlaca();
		await page.goto('/administracao/ordem-servico/nova');
		await page.getByRole('button', { name: 'Novo cliente' }).click();
		await page.locator('#cliente-nome').fill(`Cliente Drawer ${unico()}`);
		await page.locator('#cliente-telefone').fill('31988887777');
		await page.locator('#cliente-documento').fill(cpf);
		await page.locator('#moto-modelo-0').fill('Bros 160');
		await page.locator('#moto-cor-0').fill('Verde');
		await page.locator('#moto-placa-0').fill(placa);
		await page.getByRole('button', { name: 'Salvar e usar nesta OS' }).click();
		await expect(toast(page, 'Cliente salvo.')).toBeVisible();
		await banco.clientePorDocumento(cpf);
		await expect(page.locator('#os-cliente')).toHaveValue(/Cliente Drawer/);
		await expect(page.locator('#os-moto').locator('..')).toContainText('Bros 160');
	});

	test('adiciona moto ao cliente pela OS e a nova moto fica selecionada', async ({ page, banco }) => {
		const { cliente } = await cenario(banco, 1);
		await page.goto('/administracao/ordem-servico/nova');
		await escolherCliente(page, cliente);
		await page.getByRole('button', { name: 'Editar cliente / adicionar moto' }).click();
		await expect(page.locator('#cliente-nome')).toHaveValue(cliente.name);
		await page.getByRole('button', { name: /^\W*Adicionar moto$/ }).click();
		await page.locator('#moto-modelo-1').fill('XRE 300');
		await page.locator('#moto-cor-1').fill('Branca');
		await page.locator('#moto-placa-1').fill(gerarPlaca());
		await page.getByRole('button', { name: 'Salvar e usar nesta OS' }).click();
		await expect(toast(page, 'Cliente salvo.')).toBeVisible();
		await expect(page.locator('#os-moto').locator('..')).toContainText('XRE 300');
	});

	test('cadastra serviço novo no catálogo pela OS (nome vazio é recusado)', async ({ page, banco }) => {
		const nome = `Polimento ${unico()}`;
		await page.goto('/administracao/ordem-servico/nova');
		await page.getByRole('button', { name: 'Novo serviço no catálogo' }).click();
		await page.locator('#os-novo-servico').fill('   ');
		await page.getByRole('button', { name: 'Cadastrar e adicionar' }).click();
		await expect(page.getByText('Informe o nome (até 100 caracteres).')).toBeVisible();

		await page.locator('#os-novo-servico').fill(nome);
		await page.getByRole('button', { name: 'Cadastrar e adicionar' }).click();
		await expect(toast(page, 'Serviço cadastrado no catálogo.')).toBeVisible();
		await banco.servicoPorNome(nome);
		// Preenche o item vazio existente em vez de criar outro.
		await expect(page.locator('[id^=os-servico-]')).toHaveCount(1);
		await expect(page.locator('#os-servico-0')).toHaveValue(nome);
	});

	test('editar: carrega a OS, troca preço e remove item; total e itens são regravados', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(
			cliente,
			[
				{ servico: servicos[0], preco: 60 },
				{ servico: servicos[1], preco: 90 },
			],
			{ mileage: 1000, notes: 'nota antiga' },
		);
		await page.goto(`/administracao/ordem-servico/${ordem.id}/editar`);
		await expect(page.getByRole('heading', { name: `Editar OS #${ordem.number}` })).toBeVisible();
		await expect(page.locator('#os-cliente')).toHaveValue(cliente.name);
		await expect(page.locator('#os-km')).toHaveValue('1000');
		await expect(page.locator('#os-servico-1')).toHaveValue(servicos[1].name);

		await preencherNumero(page, '#os-preco-0', '75');
		await page.getByRole('button', { name: 'Remover serviço' }).nth(1).click();
		await page.locator('#os-obs').fill('');
		await page.getByRole('button', { name: 'Salvar alterações' }).click();
		await expect(toast(page, 'Ordem de serviço atualizada.')).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`/ordem-servico/${ordem.id}$`));

		const atualizada = await banco.ordem(ordem.id);
		expect([atualizada.number, atualizada.total, atualizada.notes]).toEqual([ordem.number, 75, null]);
		expect((await banco.itensDaOrdem(ordem.id)).map((i) => i.price)).toEqual([75]);
	});

	test('voltar do formulário de edição retorna ao detalhe', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 10 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}/editar`);
		await page.getByRole('button', { name: 'Voltar' }).click();
		await expect(page).toHaveURL(new RegExp(`/ordem-servico/${ordem.id}$`));
	});
});

test.describe('Ordem de serviço: detalhe, status e versão do cliente', () => {
	test('fluxo completo de status: enviada → recusada → reenviada → aprovada → em andamento → concluída', async ({ page, banco }) => {
		await simularApisDoSistema(page);
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 100 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);

		const passo = async (botao: string, esperado: string, confirmar = false) => {
			await page.getByRole('button', { name: botao }).click();
			if (confirmar) await dialogo(page).getByRole('button', { name: 'Confirmar' }).click();
			await expect(statusOs(page)).toHaveText(esperado);
			expect((await banco.ordem(ordem.id)).status).toBeTruthy();
		};
		await passo('Marcar como enviada ao cliente', 'Aguardando aprovação');
		await passo('Cliente recusou', 'Recusada', true);
		await passo('Reenviar ao cliente', 'Aguardando aprovação');
		await passo('Cliente aprovou', 'Aprovada');
		await passo('Iniciar serviço', 'Em andamento');
		await passo('Concluir serviço', 'Concluída', true);
		expect((await banco.ordem(ordem.id)).status).toBe('completed');

		// Concluída: sem próximos passos e sem "Cancelar OS".
		await expect(page.getByRole('button', { name: /Cliente|Iniciar|Concluir|Reenviar|Marcar/ })).toHaveCount(0);
		await page.getByRole('button', { name: 'Mais ações' }).click();
		await expect(page.getByRole('menuitem', { name: 'Cancelar OS' })).toHaveCount(0);
	});

	test('confirmação recusada não altera o status', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 100 }], { status: 'awaiting_approval' });
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Cliente recusou' }).click();
		await dialogo(page).getByRole('button', { name: 'Voltar' }).click();
		await expect(statusOs(page)).toHaveText('Aguardando aprovação');
		expect((await banco.ordem(ordem.id)).status).toBe('awaiting_approval');
	});

	test('cancelar pelo menu e reabrir como rascunho', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 100 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await abrirMenu(page, 'Cancelar OS');
		await dialogo(page).getByRole('button', { name: 'Confirmar' }).click();
		await expect(statusOs(page)).toHaveText('Cancelada');
		await page.getByRole('button', { name: 'Reabrir como rascunho' }).click();
		await expect(statusOs(page)).toHaveText('Rascunho');
		expect((await banco.ordem(ordem.id)).status).toBe('draft');
	});

	test('excluir pelo menu pede confirmação, apaga e volta para a listagem', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 100 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await abrirMenu(page, 'Excluir');
		await expect(dialogo(page)).toContainText('apagados definitivamente');
		await dialogo(page).getByRole('button', { name: 'Excluir' }).click();
		await expect(toast(page, 'Ordem de serviço excluída.')).toBeVisible();
		await expect(page).toHaveURL(/\/ordem-servico$/);
		const { data } = await banco.client.from('service_orders').select('id').eq('id', ordem.id);
		expect(data).toEqual([]);
		expect(await banco.itensDaOrdem(ordem.id)).toEqual([]);
	});

	test('editar pelo menu abre o formulário da OS', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 100 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await abrirMenu(page, 'Editar');
		await expect(page).toHaveURL(new RegExp(`/ordem-servico/${ordem.id}/editar$`));
	});

	test('versão do cliente: esconde dados internos, compartilha PNG e sugere marcar como enviada', async ({ page, banco }) => {
		await simularApisDoSistema(page, { compartilhar: 'ok' });
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(
			cliente,
			[
				{ servico: servicos[0], preco: 150 },
				{ servico: servicos[1], preco: 150 },
			],
			{
				payment_method: 'installments',
				installments: 2,
				down_payment: 100,
				notes: 'SEGREDO INTERNO',
				customer_notes: 'Garantia de 90 dias.',
				estimated_time: '3 dias',
			},
		);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();

		const cartao = page.locator('app-os-cliente');
		await expect(cartao).toContainText(`OS #${ordem.number}`);
		for (const texto of [
			cliente.name,
			servicos[0].name,
			'R$ 300,00',
			'Entrada',
			'R$ 100,00',
			'2x de R$ 100,00',
			'3 dias',
			'Garantia de 90 dias.',
		]) {
			await expect(cartao).toContainText(texto);
		}
		const textoCartao = await cartao.innerText();
		expect(textoCartao).not.toContain('SEGREDO INTERNO');
		expect(textoCartao).not.toContain('Rua Secreta');
		expect(textoCartao).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
		expect(textoCartao).not.toContain('Rascunho');

		const compartilhar = page.getByRole('button', { name: 'Compartilhar imagem' });
		await expect(compartilhar).toBeEnabled({ timeout: 20_000 });
		await compartilhar.click();
		const compartilhados = await page.evaluate(
			() =>
				(window as unknown as { __compartilhados: { nome: string; tipo: string; tamanho: number; assinatura: number[] }[] })
					.__compartilhados,
		);
		expect(compartilhados).toHaveLength(1);
		expect(compartilhados[0]).toMatchObject({ nome: `orcamento-os-${ordem.number}.png`, tipo: 'image/png' });
		expect(compartilhados[0].assinatura, 'arquivo é um PNG de verdade').toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(compartilhados[0].tamanho).toBeGreaterThan(10_000);

		await expect(dialogo(page)).toContainText('Aguardando aprovação');
		await dialogo(page).getByRole('button', { name: 'Sim, marcar' }).click();
		await expect(statusOs(page)).toHaveText('Aguardando aprovação');
	});

	test('compartilhamento cancelado pelo usuário não pergunta nada nem muda o status', async ({ page, banco }) => {
		await simularApisDoSistema(page, { compartilhar: 'cancelar' });
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 50 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		await expect(page.getByRole('button', { name: 'Compartilhar imagem' })).toBeEnabled({ timeout: 20_000 });
		await page.getByRole('button', { name: 'Compartilhar imagem' }).click();
		await page.waitForTimeout(500);
		await expect(dialogo(page)).toHaveCount(0);
		expect((await banco.ordem(ordem.id)).status).toBe('draft');
	});

	test('sem suporte a compartilhar arquivos: baixa o PNG', async ({ page, banco }) => {
		await simularApisDoSistema(page, { compartilhar: 'sem-suporte' });
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 50 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		await expect(page.getByRole('button', { name: 'Compartilhar imagem' })).toBeEnabled({ timeout: 20_000 });
		const download = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Compartilhar imagem' }).click();
		expect((await download).suggestedFilename()).toBe(`orcamento-os-${ordem.number}.png`);
	});

	test('PDF: imprime só a versão do cliente', async ({ page, banco }) => {
		await simularApisDoSistema(page);
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 50 }], { notes: 'SEGREDO INTERNO' });
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		await page.getByRole('button', { name: 'Salvar PDF / imprimir' }).click();

		const impressoes = await page.evaluate(() => (window as unknown as { __impressoes: string[] }).__impressoes);
		expect(impressoes).toHaveLength(1);
		expect(impressoes[0]).toContain(`OS #${ordem.number}`);
		expect(impressoes[0]).not.toContain('SEGREDO INTERNO');

		// Na mídia de impressão, só a área do cartão aparece.
		await page.emulateMedia({ media: 'print' });
		await expect(page.locator('body > .area-impressao')).toBeVisible();
		await expect(page.locator('app-root')).toBeHidden();
		await page.emulateMedia({ media: 'screen' });
		await expect(page.locator('body > .area-impressao')).toBeHidden();
	});

	test('WhatsApp abre a conversa do cliente com mensagem pronta', async ({ page, banco }) => {
		await simularApisDoSistema(page);
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 50 }]);
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		await page.getByRole('button', { name: 'Abrir conversa no WhatsApp' }).click();
		const aberturas = await page.evaluate(() => (window as unknown as { __aberturas: string[] }).__aberturas);
		expect(aberturas).toHaveLength(1);
		const url = new URL(aberturas[0]);
		expect(url.origin + url.pathname).toBe(`https://wa.me/55${cliente.phone}`);
		expect(url.searchParams.get('text')).toContain(`OS #${ordem.number}`);
	});

	test('OS à vista sem entrada: versão do cliente não mostra entrada nem parcelas', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const ordem = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 50 }], { payment_method: 'cash' });
		await page.goto(`/administracao/ordem-servico/${ordem.id}`);
		await page.getByRole('button', { name: 'Versão do cliente' }).click();
		const cartao = page.locator('app-os-cliente');
		await expect(cartao).toContainText('À vista');
		await expect(cartao).not.toContainText('Entrada');
		await expect(cartao).not.toContainText('Parcelas');
	});

	test('OS inexistente mostra erro', async ({ page }) => {
		await page.goto('/administracao/ordem-servico/00000000-0000-4000-8000-000000000999');
		await expect(page.getByText('Não foi possível carregar a ordem de serviço.')).toBeVisible();
		await page.goto('/administracao/ordem-servico/00000000-0000-4000-8000-000000000999/editar');
		await expect(page.getByText('Não foi possível carregar a ordem de serviço.')).toBeVisible();
	});
});

test.describe('Ordem de serviço: listagem', () => {
	test('busca por número, nome e placa; filtra por status; estado vazio', async ({ page, banco }) => {
		const { cliente, servicos } = await cenario(banco);
		const rascunho = await banco.criarOrdem(cliente, [{ servico: servicos[0], preco: 10 }]);
		const aprovada = await banco.criarOrdem(cliente, [{ servico: servicos[1], preco: 20 }], { status: 'approved' });
		await page.goto('/administracao/ordem-servico');
		const busca = page.getByRole('searchbox', { name: 'Buscar ordem de serviço' });
		const cartoes = page.locator('app-cartao-ordem-servico');

		await busca.fill(String(rascunho.number));
		await expect(cartoes).toHaveCount(1);
		await expect(cartoes.first()).toContainText(`OS #${rascunho.number}`);

		await busca.fill(cliente.name);
		await expect(cartoes).toHaveCount(2);
		await expect(cartoes.first(), 'mais recente primeiro').toContainText(`OS #${aprovada.number}`);

		await busca.fill(cliente.motorcycles[0].plate.toLowerCase());
		await expect(cartoes).toHaveCount(2);

		await page.getByRole('combobox', { name: 'Filtrar por status' }).click();
		await page.getByRole('option', { name: 'Aprovada' }).click();
		await expect(cartoes).toHaveCount(1);
		await expect(cartoes.first()).toContainText('Aprovada');

		await cartoes.first().click();
		await expect(page).toHaveURL(new RegExp(`/ordem-servico/${aprovada.id}$`));
		await page.goBack();

		await busca.fill(`zz-sem-resultado-${unico()}`);
		await expect(page.getByText('Nenhuma ordem de serviço encontrada.')).toBeVisible();
	});
});
