import { Page } from '@playwright/test';
import { escolherNoAutocomplete, escolherNoSelect, esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';
import { isoLocal, segundaFeiraIsolada, somarDias, unico } from './apoio/geradores';

const rotuloSemana = (page: Page) => page.locator('span.flex-1.text-center');
const bloco = (page: Page, nome: string) => page.getByRole('button', { name: new RegExp(nome) });
/** Botão principal (as colunas dos dias também são botões "Novo agendamento em …"). */
const novoAgendamento = (page: Page) => page.getByRole('button', { name: /^\W*Novo agendamento$/ }).click();
const salvar = (page: Page) => page.getByRole('button', { name: 'Salvar' }).click();

/** Toca fora dos campos para fechar sugestões abertas (Escape fecharia o painel inteiro). */
async function fecharSugestoes(page: Page): Promise<void> {
	await page.waitForTimeout(800); // busca com debounce de 500 ms ainda pode abrir sugestões
	await page.getByText('Duração', { exact: true }).click();
	await expect(page.locator('.p-autocomplete-overlay')).toHaveCount(0);
}

/** Abre a agenda numa semana só do teste (futuro distante), evitando colisão com outros dados. */
async function abrirSemana(page: Page, segunda: string): Promise<void> {
	await page.goto(`/administracao/agenda?semana=${segunda}`);
	await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
	await page.waitForLoadState('networkidle');
}

async function preencherAgendamento(
	page: Page,
	dados: { nome: string; dia?: string; hora?: string; duracao?: string; moto?: string; servico?: string },
): Promise<void> {
	await page.locator('#agendamento-cliente').fill(dados.nome);
	if (dados.dia) await page.locator('#agendamento-dia').fill(dados.dia);
	if (dados.hora) await page.locator('#agendamento-hora').fill(dados.hora);
	if (dados.duracao) await escolherNoSelect(page, 'agendamento-duracao', dados.duracao);
	if (dados.moto) await page.locator('#agendamento-moto').fill(dados.moto);
	if (dados.servico) await page.locator('#agendamento-servico').fill(dados.servico);
	await fecharSugestoes(page);
}

test.describe('Agenda: navegação entre semanas', () => {
	test('abre na semana atual com "Hoje" desabilitado e o dia de hoje destacado', async ({ page }) => {
		await page.goto('/administracao/agenda');
		await expect(page.getByRole('button', { name: 'Hoje' })).toBeDisabled();
		await expect(page).not.toHaveURL(/semana=/);
		const hoje = new Date();
		await expect(page.locator('span.rounded-full.bg-\\[var\\(--cor-primaria\\)\\]')).toHaveText(String(hoje.getDate()));
		await esperarSemScrollHorizontal(page);
	});

	test('avança e volta semanas pela URL; "Hoje" volta para a semana atual', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const atual = await rotuloSemana(page).innerText();
		await page.getByRole('button', { name: 'Próxima semana' }).click();
		await expect(page).toHaveURL(/semana=\d{4}-\d{2}-\d{2}/);
		await expect(rotuloSemana(page)).not.toHaveText(atual);
		await expect(page.getByRole('button', { name: 'Hoje' })).toBeEnabled();

		await page.getByRole('button', { name: 'Semana anterior' }).click();
		await expect(rotuloSemana(page)).toHaveText(atual);
		await expect(page, 'semana atual não precisa de parâmetro').not.toHaveURL(/semana=/);

		await page.getByRole('button', { name: 'Semana anterior' }).click();
		await page.getByRole('button', { name: 'Semana anterior' }).click();
		await page.getByRole('button', { name: 'Hoje' }).click();
		await expect(rotuloSemana(page)).toHaveText(atual);
		await expect(page).not.toHaveURL(/semana=/);

		// Voltar do navegador também troca a semana.
		await page.getByRole('button', { name: 'Próxima semana' }).click();
		await page.goBack();
		await expect(rotuloSemana(page)).toHaveText(atual);
	});

	test('parâmetro de semana inválido cai na semana atual', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const atual = await rotuloSemana(page).innerText();
		for (const invalido of ['abc', '2026-02-31', '2026-13-01', '']) {
			await page.goto(`/administracao/agenda?semana=${invalido}`);
			await expect(rotuloSemana(page), `semana=${invalido}`).toHaveText(atual);
		}
	});

	test('data no meio da semana abre a semana de segunda a domingo; rótulos de virada de mês e ano', async ({ page }) => {
		await page.goto('/administracao/agenda?semana=2026-11-19');
		await expect(rotuloSemana(page)).toHaveText('16 – 22 nov');
		await page.goto('/administracao/agenda?semana=2026-11-30');
		await expect(rotuloSemana(page)).toHaveText('30 nov – 6 dez');
		await page.goto('/administracao/agenda?semana=2026-01-01');
		await expect(rotuloSemana(page)).toHaveText('29 dez 2025 – 4 jan 2026');
		// Domingo pertence à semana que começou na segunda anterior.
		await page.goto('/administracao/agenda?semana=2026-11-22');
		await expect(rotuloSemana(page)).toHaveText('16 – 22 nov');
	});
});

test.describe('Agenda: agendamentos', () => {
	test('caminho feliz: cria pelo botão, aparece na grade, edita horário e exclui com confirmação', async ({ page, banco }) => {
		const segunda = segundaFeiraIsolada();
		const quarta = somarDias(segunda, 2);
		const nome = `Rafael ${unico()}`;
		await abrirSemana(page, segunda);

		await novoAgendamento(page);
		// Fora da semana atual, sugere a segunda-feira exibida.
		await expect(page.locator('#agendamento-dia')).toHaveValue(segunda);
		await expect(page.locator('#agendamento-hora')).toHaveValue(/^\d{2}:00$/);
		await preencherAgendamento(page, { nome, dia: quarta, hora: '09:00', duracao: '1h30', moto: 'CG 160', servico: 'Revisão' });
		await salvar(page);
		await expect(toast(page, 'Agendamento criado.')).toBeVisible();

		await expect(bloco(page, nome)).toHaveAttribute('aria-label', `09:00–10:30, ${nome}, CG 160, Revisão`);
		const [gravado] = await banco.agendamentosDoDia(quarta);
		expect(gravado).toMatchObject({
			client_name: nome,
			client_id: null,
			start_time: '09:00:00',
			duration_minutes: 90,
			motorcycle_model: 'CG 160',
			service: 'Revisão',
		});
		await esperarSemScrollHorizontal(page);

		await bloco(page, nome).click();
		await expect(page.locator('#agendamento-cliente')).toHaveValue(nome);
		await expect(page.locator('#agendamento-hora')).toHaveValue('09:00');
		await page.locator('#agendamento-hora').fill('14:30');
		await salvar(page);
		await expect(toast(page, 'Agendamento atualizado.')).toBeVisible();
		await expect(bloco(page, nome)).toHaveAttribute('aria-label', new RegExp('^14:30–16:00'));

		await bloco(page, nome).click();
		await page.getByRole('button', { name: 'Excluir agendamento' }).click();
		await expect(page.getByRole('button', { name: 'Toque de novo para confirmar' })).toBeVisible();
		expect(await banco.agendamentosDoDia(quarta), 'primeiro toque só pede confirmação').toHaveLength(1);
		await page.getByRole('button', { name: 'Toque de novo para confirmar' }).click();
		await expect(toast(page, 'Agendamento excluído.')).toBeVisible();
		await expect(bloco(page, nome)).toHaveCount(0);
		expect(await banco.agendamentosDoDia(quarta)).toHaveLength(0);
	});

	test('tocar num horário vazio da grade abre o formulário com aquele dia e hora', async ({ page }) => {
		const segunda = segundaFeiraIsolada();
		const terca = somarDias(segunda, 1);
		await abrirSemana(page, segunda);
		const coluna = page.getByRole('button', { name: /^Novo agendamento em / }).nth(1);
		// Grade começa às 7h, 48 px por hora: 10:30 fica a 3,5 h do topo.
		await coluna.click({ position: { x: 10, y: 3.5 * 48 + 5 } });
		await expect(page.locator('#agendamento-dia')).toHaveValue(terca);
		await expect(page.locator('#agendamento-hora')).toHaveValue('10:30');
	});

	test('nome vazio ou só com espaços não é salvo', async ({ page, banco }) => {
		const segunda = segundaFeiraIsolada();
		await abrirSemana(page, segunda);
		await novoAgendamento(page);
		await salvar(page);
		await expect(page.getByText('Informe o nome do cliente (até 120 caracteres).')).toBeVisible();
		await page.locator('#agendamento-cliente').fill('    ');
		await salvar(page);
		await expect(page.getByText('Informe o nome do cliente (até 120 caracteres).')).toBeVisible();
		expect(await banco.agendamentosDoDia(segunda)).toHaveLength(0);
	});

	test('agendamento que passaria da meia-noite é recusado; terminar às 24:00 é aceito', async ({ page, banco }) => {
		const segunda = segundaFeiraIsolada();
		const nome = `Noturno ${unico()}`;
		await abrirSemana(page, segunda);
		await novoAgendamento(page);
		await preencherAgendamento(page, { nome, hora: '23:30', duracao: '1 hora' });
		await salvar(page);
		await expect(toast(page, 'O agendamento precisa terminar no mesmo dia.')).toBeVisible();
		expect(await banco.agendamentosDoDia(segunda)).toHaveLength(0);

		await page.locator('#agendamento-hora').fill('23:00');
		await salvar(page);
		await expect(toast(page, 'Agendamento criado.')).toBeVisible();
		// A grade se estende até 24h para caber o agendamento.
		await expect(bloco(page, nome)).toHaveAttribute('aria-label', new RegExp('^23:00–24:00'));
		expect(await banco.agendamentosDoDia(segunda), 'registra para limpeza e confere o gravado').toHaveLength(1);
	});

	test('agendamento antes das 7h amplia a grade para cima', async ({ page, banco }) => {
		const segunda = segundaFeiraIsolada();
		await abrirSemana(page, segunda);
		await expect(page.getByText('6h', { exact: true })).toHaveCount(0);
		await banco.criarAgendamento({ scheduled_date: segunda, start_time: '06:00', client_name: `Madrugador ${unico()}` });
		await page.reload();
		await expect(page.getByText('6h', { exact: true })).toBeVisible();
	});

	test('agendamentos no mesmo horário ficam lado a lado, sem sobreposição', async ({ page, banco }) => {
		const segunda = segundaFeiraIsolada();
		const [a, b] = [`Lado A ${unico()}`, `Lado B ${unico()}`];
		await banco.criarAgendamento({ scheduled_date: segunda, start_time: '10:00', client_name: a });
		await banco.criarAgendamento({ scheduled_date: segunda, start_time: '10:30', client_name: b });
		await abrirSemana(page, segunda);
		const caixaA = (await bloco(page, a).boundingBox())!;
		const caixaB = (await bloco(page, b).boundingBox())!;
		expect(caixaA.x + caixaA.width, 'A termina antes de B começar').toBeLessThanOrEqual(caixaB.x + 1);
		expect(Math.abs(caixaA.width - caixaB.width)).toBeLessThan(2);
	});

	test('agendamento de outra semana não aparece', async ({ page, banco }) => {
		const segunda = segundaFeiraIsolada();
		const nome = `Outra semana ${unico()}`;
		await banco.criarAgendamento({ scheduled_date: somarDias(segunda, 7), start_time: '10:00', client_name: nome });
		await abrirSemana(page, segunda);
		await expect(bloco(page, nome)).toHaveCount(0);
		await page.getByRole('button', { name: 'Próxima semana' }).click();
		await expect(bloco(page, nome)).toBeVisible();
	});

	test('cliente cadastrado: sugestão liga o cadastro e preenche a moto única; editar o nome desliga', async ({ page, banco }) => {
		const cliente = await banco.criarCliente({ nome: `Cadastrado ${unico()}`, motos: 1 });
		const segunda = segundaFeiraIsolada();
		await abrirSemana(page, segunda);

		await novoAgendamento(page);
		await escolherNoAutocomplete(page, '#agendamento-cliente', cliente.name.slice(-8), cliente.name);
		await expect(page.locator('#agendamento-cliente')).toHaveValue(cliente.name);
		await expect(page.locator('#agendamento-moto')).toHaveValue(cliente.motorcycles[0].model);
		await page.locator('#agendamento-hora').fill('08:00');
		await salvar(page);
		await expect(toast(page, 'Agendamento criado.')).toBeVisible();
		const [vinculado] = await banco.agendamentosDoDia(segunda);
		expect(vinculado.client_id).toBe(cliente.id);

		await bloco(page, cliente.name).click();
		await page.locator('#agendamento-cliente').fill(`${cliente.name} (irmão)`);
		await fecharSugestoes(page);
		await salvar(page);
		await expect(toast(page, 'Agendamento atualizado.')).toBeVisible();
		const [desvinculado] = await banco.agendamentosDoDia(segunda);
		expect(desvinculado).toMatchObject({ client_name: `${cliente.name} (irmão)`, client_id: null });
	});

	test('serviço sugerido vem do catálogo ativo', async ({ page, banco }) => {
		const servico = await banco.criarServico(`Lavagem ${unico()}`);
		const segunda = segundaFeiraIsolada();
		await abrirSemana(page, segunda);
		await novoAgendamento(page);
		await escolherNoAutocomplete(page, '#agendamento-servico', servico.name.slice(-8), servico.name);
		await expect(page.locator('#agendamento-servico')).toHaveValue(servico.name);
	});

	test('agendamentos de hoje aparecem na semana atual', async ({ page, banco }) => {
		const hoje = isoLocal(new Date());
		const nome = `Hoje ${unico()}`;
		await banco.criarAgendamento({ scheduled_date: hoje, start_time: '12:00', client_name: nome });
		await page.goto('/administracao/agenda');
		await expect(bloco(page, nome)).toBeVisible();
	});
});
