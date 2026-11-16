import { Page } from '@playwright/test';
import { esperarSemScrollHorizontal, expect, test, toast } from './apoio/fixtures';
import { cpfFormatado, gerarCnpj, gerarCpf, gerarPlaca, unico } from './apoio/geradores';

async function preencherCliente(
	page: Page,
	dados: { nome: string; telefone: string; documento: string; endereco?: string },
): Promise<void> {
	await page.locator('#cliente-nome').fill(dados.nome);
	await page.locator('#cliente-telefone').fill(dados.telefone);
	await page.locator('#cliente-documento').fill(dados.documento);
	if (dados.endereco !== undefined) await page.locator('#cliente-endereco').fill(dados.endereco);
}

async function preencherMoto(page: Page, indice: number, dados: { modelo: string; cor: string; placa: string }): Promise<void> {
	await page.locator(`#moto-modelo-${indice}`).fill(dados.modelo);
	await page.locator(`#moto-cor-${indice}`).fill(dados.cor);
	await page.locator(`#moto-placa-${indice}`).fill(dados.placa);
}

const salvar = (page: Page) => page.getByRole('button', { name: 'Salvar cliente' }).click();

/** Clientes e motos: /administracao/clientes */
test.describe('Clientes', () => {
	test('caminho feliz: cadastra cliente com 2 motos, normaliza e encontra pela busca', async ({ page, banco }) => {
		const cpf = gerarCpf();
		const nome = `Joana Teste ${unico()}`;
		const [placa1, placa2] = [gerarPlaca(), gerarPlaca()];

		await page.goto('/administracao/clientes');
		await page.getByRole('button', { name: 'Novo cliente' }).click();
		await expect(page).toHaveURL(/\/clientes\/novo$/);

		await preencherCliente(page, { nome, telefone: '31987654321', documento: cpf, endereco: 'Rua A, 10' });
		// Máscaras aplicadas ao sair do campo.
		await page.locator('#cliente-endereco').click();
		await expect(page.locator('#cliente-telefone')).toHaveValue('(31) 98765-4321');
		await expect(page.locator('#cliente-documento')).toHaveValue(cpfFormatado(cpf));

		// Placa digitada em minúsculas e com hífen.
		await preencherMoto(page, 0, {
			modelo: 'Honda CG 160',
			cor: 'Vermelha',
			placa: `${placa1.slice(0, 3).toLowerCase()}-${placa1.slice(3)}`,
		});
		await page.getByRole('button', { name: 'Adicionar moto' }).click();
		await preencherMoto(page, 1, { modelo: 'Yamaha Fazer', cor: 'Azul', placa: placa2 });
		await esperarSemScrollHorizontal(page);
		await salvar(page);

		await expect(toast(page, 'Cliente salvo.')).toBeVisible();
		await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('heading', { name: 'Editar cliente' })).toBeVisible();

		const gravado = await banco.clientePorDocumento(cpf);
		expect(gravado).not.toBeNull();
		expect(gravado!.phone).toBe('31987654321');
		expect(gravado!.address).toBe('Rua A, 10');
		expect(gravado!.motorcycles.map((m) => m.plate).sort()).toEqual([placa1, placa2].sort());

		await page.goto('/administracao/clientes');
		const busca = page.getByRole('searchbox', { name: 'Buscar cliente' });
		for (const termo of [nome.split(' ').pop()!, cpfFormatado(cpf), `${placa2.slice(0, 3)}-${placa2.slice(3, 5)}`.toLowerCase()]) {
			await busca.fill(termo);
			await expect(page.locator('li button').filter({ hasText: nome }), `busca por "${termo}"`).toBeVisible();
			await expect(page.locator('li button')).toHaveCount(1);
		}
	});

	test('busca: nome com números não confunde com telefone; telefone mascarado encontra', async ({ page, banco }) => {
		const cliente = await banco.criarCliente();
		await page.goto('/administracao/clientes');
		const busca = page.getByRole('searchbox', { name: 'Buscar cliente' });
		await busca.fill(`Fulano ${cliente.phone.slice(-4)}`);
		await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible();
		await busca.fill(`(${cliente.phone.slice(0, 2)}) ${cliente.phone.slice(2, 7)}-${cliente.phone.slice(7)}`);
		await expect(page.locator('li button').filter({ hasText: cliente.name })).toBeVisible();
	});

	test('campos obrigatórios mostram erro e nada é gravado', async ({ page }) => {
		await page.goto('/administracao/clientes/novo');
		await salvar(page);
		await expect(toast(page, 'Confira os campos destacados.')).toBeVisible();
		for (const mensagem of [
			'Informe o nome.',
			'Informe DDD + número (10 ou 11 dígitos).',
			'CPF ou CNPJ inválido.',
			'Informe o modelo.',
			'Informe a cor.',
			'Placa inválida.',
		]) {
			await expect(page.getByText(mensagem)).toBeVisible();
		}
		await expect(page).toHaveURL(/\/clientes\/novo$/);
	});

	test('valida CPF com dígito errado, telefone curto, placa inválida e nome só com espaços', async ({ page }) => {
		await page.goto('/administracao/clientes/novo');
		await preencherCliente(page, { nome: '   ', telefone: '319876543', documento: '529.982.247-24' });
		await preencherMoto(page, 0, { modelo: 'CG', cor: 'Preta', placa: 'AB12345' });
		await salvar(page);
		await expect(page.getByText('Informe o nome.')).toBeVisible();
		await expect(page.getByText('Informe DDD + número (10 ou 11 dígitos).')).toBeVisible();
		await expect(page.getByText('CPF ou CNPJ inválido.')).toBeVisible();
		await expect(page.getByText('Placa inválida.')).toBeVisible();
	});

	test('aceita CNPJ e telefone fixo; endereço vazio vira nulo', async ({ page, banco }) => {
		const cnpj = gerarCnpj();
		await page.goto('/administracao/clientes/novo');
		await preencherCliente(page, { nome: `Oficina Parceira ${unico()}`, telefone: '3133334444', documento: cnpj, endereco: '' });
		await page.locator('#cliente-nome').click();
		await expect(page.locator('#cliente-documento')).toHaveValue(cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'));
		await preencherMoto(page, 0, { modelo: 'Biz', cor: 'Branca', placa: gerarPlaca() });
		await salvar(page);
		await expect(toast(page, 'Cliente salvo.')).toBeVisible();
		const gravado = await banco.clientePorDocumento(cnpj);
		expect(gravado!.address).toBeNull();
		expect(gravado!.phone).toBe('3133334444');
	});

	test('CPF duplicado e placa duplicada são recusados', async ({ page, banco }) => {
		const existente = await banco.criarCliente();

		await page.goto('/administracao/clientes/novo');
		await preencherCliente(page, { nome: 'Duplicado', telefone: '31999998888', documento: existente.document });
		await preencherMoto(page, 0, { modelo: 'CG', cor: 'Preta', placa: gerarPlaca() });
		await salvar(page);
		await expect(toast(page, 'Já existe um cadastro com esses dados.')).toBeVisible();
		await expect(page).toHaveURL(/\/clientes\/novo$/);

		const cpf = gerarCpf();
		await page.goto('/administracao/clientes/novo');
		await preencherCliente(page, { nome: 'Placa repetida', telefone: '31999998888', documento: cpf });
		await preencherMoto(page, 0, { modelo: 'CG', cor: 'Preta', placa: existente.motorcycles[0].plate });
		await salvar(page);
		await expect(toast(page, 'Já existe um cadastro com esses dados.')).toBeVisible();
		expect(await banco.clientePorDocumento(cpf), 'falha na moto não deixa o cliente salvo pela metade').toBeNull();

		// Corrigindo a placa, o mesmo formulário salva normalmente.
		await page.locator('#moto-placa-0').fill(gerarPlaca());
		await salvar(page);
		await expect(toast(page, 'Cliente salvo.')).toBeVisible();
		expect(await banco.clientePorDocumento(cpf)).not.toBeNull();
	});

	test('a única moto não pode ser removida; com duas, o botão de remover aparece', async ({ page }) => {
		await page.goto('/administracao/clientes/novo');
		await expect(page.getByRole('button', { name: 'Remover moto' })).toHaveCount(0);
		await page.getByRole('button', { name: 'Adicionar moto' }).click();
		await expect(page.getByRole('button', { name: 'Remover moto' })).toHaveCount(2);
		await page.getByRole('button', { name: 'Remover moto' }).first().click();
		await expect(page.locator('[id^=moto-modelo-]')).toHaveCount(1);
	});

	test('editar: troca dados, adiciona e remove moto sem OS', async ({ page, banco }) => {
		const cliente = await banco.criarCliente({ motos: 2 });
		const novaPlaca = gerarPlaca();
		await page.goto(`/administracao/clientes/${cliente.id}`);
		await expect(page.locator('#cliente-nome')).toHaveValue(cliente.name);
		await expect(page.locator('[id^=moto-modelo-]')).toHaveCount(2);

		await page.locator('#cliente-nome').fill(`${cliente.name} Editado`);
		await page.getByRole('button', { name: 'Remover moto' }).first().click();
		await page.getByRole('button', { name: 'Adicionar moto' }).click();
		await preencherMoto(page, 1, { modelo: 'Titan', cor: 'Prata', placa: novaPlaca });
		await salvar(page);
		await expect(toast(page, 'Cliente salvo.')).toBeVisible();

		const gravado = await banco.clientePorDocumento(cliente.document);
		expect(gravado!.name).toBe(`${cliente.name} Editado`);
		expect(gravado!.motorcycles.map((m) => m.plate).sort()).toEqual([cliente.motorcycles[1].plate, novaPlaca].sort());
	});

	test('moto com OS não pode ser removida e continua cadastrada', async ({ page, banco }) => {
		const cliente = await banco.criarCliente({ motos: 2 });
		const servico = await banco.criarServico();
		await banco.criarOrdem(cliente, [{ servico, preco: 50 }]);

		await page.goto(`/administracao/clientes/${cliente.id}`);
		await page.locator('#cliente-nome').fill('Nome que não deve ser gravado');
		await page.getByRole('button', { name: 'Remover moto' }).first().click();
		await salvar(page);
		await expect(toast(page, 'Este registro está em uso e não pode ser removido.')).toBeVisible();
		const gravado = await banco.clientePorDocumento(cliente.document);
		expect(gravado!.motorcycles).toHaveLength(2);
		expect(gravado!.name, 'a transação inteira é desfeita').toBe(cliente.name);
	});

	test('cliente inexistente mostra erro com opção de tentar de novo', async ({ page }) => {
		await page.goto('/administracao/clientes/00000000-0000-4000-8000-000000000999');
		await expect(page.getByText('Não foi possível carregar o cliente.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
	});

	test('voltar retorna à listagem', async ({ page }) => {
		await page.goto('/administracao/clientes/novo');
		await page.getByRole('button', { name: 'Voltar' }).click();
		await expect(page).toHaveURL(/\/administracao\/clientes$/);
	});
});
