import { Page } from '@playwright/test';
import type { Servico } from '@manus/shared';
import { Banco, ClienteCriado } from './apoio/banco';
import { esperarAlvosDeToque, esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';
import { unico } from './apoio/geradores';

/** Tempo de trabalho da OS: estimativa interna (formulário) e cronômetro com play/pause e ajuste manual (detalhe). */

async function cenario(
	banco: Banco,
	extras: Record<string, unknown> = {},
): Promise<{ cliente: ClienteCriado; servico: Servico; id: string }> {
	const cliente = await banco.criarCliente({ nome: `Cliente Tempo ${unico()}` });
	const servico = await banco.criarServico(`Relação E2E ${unico()}`);
	const ordem = await banco.criarOrdem(cliente, [{ servico, preco: 200 }], extras);
	return { cliente, servico, id: ordem.id };
}

const cartaoTempo = (page: Page) => page.locator('p-card').filter({ hasText: 'Tempo de trabalho' });
const botaoPlayPause = (page: Page) => cartaoTempo(page).getByRole('button', { name: /^\W*(Iniciar|Continuar|Pausar)$/ });
const cronometro = (page: Page) => page.locator('#cronometro');
const dialogo = (page: Page) => page.locator('div.p-confirmdialog');

/** "H:MM:SS" → segundos. */
function segundos(texto: string): number {
	const [h, m, s] = texto.trim().split(':').map(Number);
	return h * 3600 + m * 60 + s;
}

test.describe('Ordem de serviço: tempo de trabalho', () => {
	test('play e pause: o banco registra o início, acumula ao pausar e continua de onde parou', async ({ page, banco }) => {
		const { id } = await cenario(banco, { work_estimate_minutes: 30, estimated_time: 'amanhã' });
		await page.goto(`/administracao/ordem-servico/${id}`);

		await expect(cronometro(page)).toHaveText('0:00:00');
		await expect(page.locator('#estimativa-trabalho')).toHaveText('30 min');
		await expect(cartaoTempo(page)).toContainText('Pausado');
		await expect(botaoPlayPause(page)).toHaveText(/Iniciar/);

		await botaoPlayPause(page).click();
		await expect(botaoPlayPause(page)).toHaveText(/Pausar/);
		await expect(cartaoTempo(page)).toContainText('Em execução');
		expect((await banco.ordem(id)).work_started_at, 'início gravado no banco').not.toBeNull();

		// O relógio anda na tela.
		await expect.poll(async () => segundos(await cronometro(page).innerText()), { timeout: 5_000 }).toBeGreaterThanOrEqual(2);

		await botaoPlayPause(page).click();
		await expect(botaoPlayPause(page)).toHaveText(/Continuar/);
		await expect(cartaoTempo(page)).toContainText('Pausado');
		const pausada = await banco.ordem(id);
		expect(pausada.work_started_at).toBeNull();
		expect(pausada.work_seconds).toBeGreaterThanOrEqual(2);

		// Pausado, o relógio para.
		const parado = await cronometro(page).innerText();
		await page.waitForTimeout(1_500);
		await expect(cronometro(page)).toHaveText(parado);
		expect(segundos(parado)).toBe(pausada.work_seconds);

		await botaoPlayPause(page).click();
		await expect(botaoPlayPause(page)).toHaveText(/Pausar/);
		await expect.poll(async () => segundos(await cronometro(page).innerText())).toBeGreaterThan(pausada.work_seconds);
		await botaoPlayPause(page).click();
		await expect(botaoPlayPause(page)).toHaveText(/Continuar/);
		expect((await banco.ordem(id)).work_seconds, 'continuar acumula sobre o anterior').toBeGreaterThan(pausada.work_seconds);
	});

	test('cronômetro ligado continua contando depois de recarregar a página e aparece na listagem', async ({ page, banco }) => {
		const { cliente, id } = await cenario(banco);
		await banco.client.rpc('set_service_order_work_time', { p_id: id, p_seconds: 600 });
		await banco.client.rpc('start_service_order_timer', { p_id: id });

		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(botaoPlayPause(page)).toHaveText(/Pausar/);
		await expect.poll(async () => segundos(await cronometro(page).innerText())).toBeGreaterThanOrEqual(600);
		await page.reload();
		await expect(botaoPlayPause(page)).toHaveText(/Pausar/);
		await expect.poll(async () => segundos(await cronometro(page).innerText())).toBeGreaterThanOrEqual(601);

		await page.goto('/administracao/ordem-servico');
		await page.getByRole('searchbox', { name: 'Buscar ordem de serviço' }).fill(cliente.name);
		const cartao = page.locator('app-cartao-ordem-servico').first();
		await expect(cartao).toContainText('Em execução');

		await banco.client.rpc('pause_service_order_timer', { p_id: id });
		await page.reload();
		await page.getByRole('searchbox', { name: 'Buscar ordem de serviço' }).fill(cliente.name);
		await expect(page.locator('app-cartao-ordem-servico').first()).not.toContainText('Em execução');
	});

	test('ajuste manual: corrige o tempo gasto e grava no banco', async ({ page, banco }) => {
		const { id } = await cenario(banco, { work_estimate_minutes: 30 });
		await page.goto(`/administracao/ordem-servico/${id}`);
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await expect(page.locator('#ajuste-horas')).toHaveValue('0');
		await expect(page.locator('#ajuste-minutos')).toHaveValue('0');

		await page.locator('#ajuste-horas').fill('1');
		await page.locator('#ajuste-minutos').fill('15');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(toast(page, 'Tempo de trabalho ajustado.')).toBeVisible();
		await expect(cronometro(page)).toHaveText('1:15:00');
		expect((await banco.ordem(id)).work_seconds).toBe(4500);
		expect((await banco.ordem(id)).work_started_at).toBeNull();

		// Passou da estimativa de 30 min: 4500 s / 1800 s = 250%.
		await expect(cartaoTempo(page)).toContainText('250% do estimado (passou da estimativa)');
		await expect(botaoPlayPause(page)).toHaveText(/Continuar/);

		// Reabrir o ajuste traz o valor atual.
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await expect(page.locator('#ajuste-horas')).toHaveValue('1');
		await expect(page.locator('#ajuste-minutos')).toHaveValue('15');
	});

	test('ajuste para zero é aceito', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await banco.client.rpc('set_service_order_work_time', { p_id: id, p_seconds: 1200 });
		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(cronometro(page)).toHaveText('0:20:00');
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await page.locator('#ajuste-horas').fill('');
		await page.locator('#ajuste-minutos').fill('');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(cronometro(page)).toHaveText('0:00:00');
		expect((await banco.ordem(id)).work_seconds).toBe(0);
		await expect(botaoPlayPause(page)).toHaveText(/Iniciar/);
	});

	test('ajuste com o cronômetro ligado continua contando a partir do novo valor', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await banco.client.rpc('start_service_order_timer', { p_id: id });
		await page.goto(`/administracao/ordem-servico/${id}`);
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await page.locator('#ajuste-horas').fill('2');
		await page.locator('#ajuste-minutos').fill('0');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(toast(page, 'Tempo de trabalho ajustado.')).toBeVisible();
		const ordem = await banco.ordem(id);
		expect(ordem.work_seconds).toBe(7200);
		expect(ordem.work_started_at).not.toBeNull();
		await expect(botaoPlayPause(page)).toHaveText(/Pausar/);
		await expect.poll(async () => segundos(await cronometro(page).innerText())).toBeGreaterThan(7200);
	});

	test('ajuste com minutos fora da faixa ou acima de 1000 h é recusado e nada é gravado', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await page.goto(`/administracao/ordem-servico/${id}`);
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await page.locator('#ajuste-minutos').fill('60');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(toast(page, 'Use até 1000 h, com minutos de 0 a 59.')).toBeVisible();
		await expect(page.getByText('De 0 a 59.', { exact: true })).toBeVisible();

		await page.locator('#ajuste-minutos').fill('1');
		await page.locator('#ajuste-horas').fill('1000');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(toast(page, 'Use até 1000 h, com minutos de 0 a 59.').first()).toBeVisible();

		await page.locator('#ajuste-horas').fill('-1');
		await page.locator('#ajuste-minutos').fill('0');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(page.getByText('De 0 a 1000.', { exact: true })).toBeVisible();
		expect((await banco.ordem(id)).work_seconds).toBe(0);
	});

	test('cancelar o ajuste não altera nada', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await page.goto(`/administracao/ordem-servico/${id}`);
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await page.locator('#ajuste-horas').fill('5');
		await page.getByRole('button', { name: /^\W*Cancelar$/ }).click();
		await expect(page.locator('#ajuste-horas')).toBeHidden();
		await expect(cronometro(page)).toHaveText('0:00:00');
		expect((await banco.ordem(id)).work_seconds).toBe(0);
	});

	test('concluir a OS com o cronômetro ligado pausa e guarda o tempo; depois não dá para ligar', async ({ page, banco }) => {
		const { id } = await cenario(banco, { status: 'in_progress' });
		await banco.client.rpc('start_service_order_timer', { p_id: id });
		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(botaoPlayPause(page)).toHaveText(/Pausar/);
		await page.waitForTimeout(1_200);

		await page.getByRole('button', { name: 'Concluir serviço' }).click();
		await dialogo(page).getByRole('button', { name: 'Confirmar' }).click();
		await expect(page.locator('p-tag').first()).toHaveText('Concluída');
		await expect(botaoPlayPause(page)).toHaveText(/Continuar/);
		await expect(botaoPlayPause(page)).toBeDisabled();
		await expect(cartaoTempo(page)).toContainText('o cronômetro fica parado');

		const ordem = await banco.ordem(id);
		expect(ordem.work_started_at).toBeNull();
		expect(ordem.work_seconds).toBeGreaterThanOrEqual(1);
		await expect.poll(async () => segundos(await cronometro(page).innerText())).toBe(ordem.work_seconds);

		// Ajuste manual continua liberado para corrigir depois de concluir.
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		await page.locator('#ajuste-minutos').fill('40');
		await page.getByRole('button', { name: 'Salvar tempo' }).click();
		await expect(cronometro(page)).toHaveText('0:40:00');
	});

	test('OS cancelada: botão de iniciar desabilitado', async ({ page, banco }) => {
		const { id } = await cenario(banco, { status: 'canceled' });
		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(botaoPlayPause(page)).toBeDisabled();
		await expect(cartaoTempo(page)).toContainText('OS cancelada');
	});

	test('falha ao iniciar mostra o erro e mantém o cronômetro parado', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(botaoPlayPause(page)).toBeEnabled();
		// Outra pessoa cancela a OS enquanto a tela está aberta.
		await banco.client.from('service_orders').update({ status: 'canceled' }).eq('id', id);
		await botaoPlayPause(page).click();
		await expect(toast(page, 'Não é possível iniciar o cronômetro de uma OS concluída, recusada ou cancelada.')).toBeVisible();
		await expect(botaoPlayPause(page)).toHaveText(/Iniciar/);
		expect((await banco.ordem(id)).work_started_at).toBeNull();
	});

	test('sem estimativa: mostra "Não informado" e sem barra de progresso', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(page.locator('#estimativa-trabalho')).toHaveText('Não informado');
		await expect(cartaoTempo(page).getByRole('progressbar')).toHaveCount(0);
	});

	test('mobile: cartão do tempo sem scroll horizontal e com alvos de toque de 44 px; inputs do ajuste com 16 px', async ({
		page,
		banco,
	}) => {
		const { id } = await cenario(banco, { work_estimate_minutes: 6000 });
		await page.goto(`/administracao/ordem-servico/${id}`);
		await expect(page.locator('#estimativa-trabalho')).toHaveText('100 h');
		await esperarSemScrollHorizontal(page);
		await esperarAlvosDeToque(cartaoTempo(page));
		await page.getByRole('button', { name: 'Ajustar tempo gasto' }).click();
		for (const campo of ['#ajuste-horas', '#ajuste-minutos']) {
			const fonte = await page.locator(campo).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
			expect(fonte).toBeGreaterThanOrEqual(16);
		}
		await esperarSemScrollHorizontal(page);
	});
});

test.describe('Ordem de serviço: estimativa de trabalho no formulário', () => {
	test('edição carrega a estimativa em horas e minutos; apagar os dois grava sem estimativa', async ({ page, banco }) => {
		const { id } = await cenario(banco, { work_estimate_minutes: 90, estimated_time: 'sexta-feira' });
		await page.goto(`/administracao/ordem-servico/${id}/editar`);
		await expect(page.locator('#os-prazo')).toHaveValue('sexta-feira');
		await expect(page.locator('#os-estimativa-horas')).toHaveValue('1');
		await expect(page.locator('#os-estimativa-minutos')).toHaveValue('30');

		await page.locator('#os-estimativa-horas').fill('');
		await page.locator('#os-estimativa-minutos').fill('');
		await page.getByRole('button', { name: 'Salvar alterações' }).click();
		await expect(toast(page, 'Ordem de serviço atualizada.')).toBeVisible();
		const ordem = await banco.ordem(id);
		expect([ordem.work_estimate_minutes, ordem.estimated_time]).toEqual([null, 'sexta-feira']);
	});

	test('só minutos (45) e só horas (2) são aceitos', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await page.goto(`/administracao/ordem-servico/${id}/editar`);
		await page.locator('#os-estimativa-minutos').fill('45');
		await page.getByRole('button', { name: 'Salvar alterações' }).click();
		await expect(toast(page, 'Ordem de serviço atualizada.')).toBeVisible();
		expect((await banco.ordem(id)).work_estimate_minutes).toBe(45);

		await page.goto(`/administracao/ordem-servico/${id}/editar`);
		await page.locator('#os-estimativa-horas').fill('2');
		await page.locator('#os-estimativa-minutos').fill('');
		await page.getByRole('button', { name: 'Salvar alterações' }).click();
		await expect(toast(page, 'Ordem de serviço atualizada.')).toBeVisible();
		expect((await banco.ordem(id)).work_estimate_minutes).toBe(120);
	});

	for (const [caso, horas, minutos] of [
		['zero (0 h 0 min)', '0', '0'],
		['minutos acima de 59', '0', '60'],
		['acima de 100 h', '100', '1'],
		['horas negativas', '-1', '30'],
	] as const) {
		test(`estimativa inválida: ${caso} não grava`, async ({ page, banco }) => {
			const { id } = await cenario(banco, { work_estimate_minutes: 30 });
			await page.goto(`/administracao/ordem-servico/${id}/editar`);
			await expect(page.locator('#os-estimativa-minutos')).toHaveValue('30');
			await page.locator('#os-estimativa-horas').fill(horas);
			await page.locator('#os-estimativa-minutos').fill(minutos);
			await page.getByRole('button', { name: 'Salvar alterações' }).click();
			await expect(toast(page, 'Confira o tempo de trabalho estimado.')).toBeVisible();
			await expect(page.getByText('Use de 1 min a 100 h (minutos de 0 a 59).')).toBeVisible();
			await expect(page).toHaveURL(/\/editar$/);
			expect((await banco.ordem(id)).work_estimate_minutes).toBe(30);
		});
	}

	test('estimativa de exatamente 100 h é aceita', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await page.goto(`/administracao/ordem-servico/${id}/editar`);
		await page.locator('#os-estimativa-horas').fill('100');
		await page.locator('#os-estimativa-minutos').fill('0');
		await page.getByRole('button', { name: 'Salvar alterações' }).click();
		await expect(toast(page, 'Ordem de serviço atualizada.')).toBeVisible();
		expect((await banco.ordem(id)).work_estimate_minutes).toBe(6000);
	});

	test('editar a OS não zera o tempo já gasto', async ({ page, banco }) => {
		const { id } = await cenario(banco);
		await banco.client.rpc('set_service_order_work_time', { p_id: id, p_seconds: 900 });
		await page.goto(`/administracao/ordem-servico/${id}/editar`);
		await page.locator('#os-estimativa-minutos').fill('20');
		await page.getByRole('button', { name: 'Salvar alterações' }).click();
		await expect(toast(page, 'Ordem de serviço atualizada.')).toBeVisible();
		await expect(cronometro(page)).toHaveText('0:15:00');
		expect((await banco.ordem(id)).work_seconds).toBe(900);
	});
});
