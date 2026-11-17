import { esperarAlvosDeToque, esperarSemScrollHorizontal, expect, test } from './apoio/fixtures';

/** Rotas padrão, redirecionamentos e barra de navegação inferior. */
test.describe('Navegação e rotas', () => {
	test('a raiz abre a agenda em /administracao/agenda', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/administracao\/agenda$/);
		await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
	});

	for (const rota of ['/administracao', '/administracao/inicio', '/rota-que-nao-existe', '/administracao/xyz']) {
		test(`rota ${rota} redireciona para a agenda`, async ({ page }) => {
			await page.goto(rota);
			await expect(page).toHaveURL(/\/administracao\/agenda/);
		});
	}

	test('a barra inferior tem Agenda, OS, Estoque, Clientes e Menu', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const nav = page.getByRole('navigation', { name: 'Navegação principal' });
		await expect(nav.getByRole('link')).toHaveText(['Agenda', 'OS', 'Estoque', 'Clientes']);
		await expect(nav.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Serviços' }), 'Serviços fica só no menu lateral').toHaveCount(0);
		await expect(nav.getByRole('link', { name: 'Aparência' }), 'Aparência fica só no menu lateral').toHaveCount(0);
	});

	test('a barra inferior leva a cada área e marca a ativa', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const nav = page.getByRole('navigation', { name: 'Navegação principal' });
		const destinos: [string, RegExp, string][] = [
			['OS', /\/administracao\/ordem-servico$/, 'Ordens de serviço'],
			['Estoque', /\/administracao\/estoque$/, 'Estoque'],
			['Clientes', /\/administracao\/clientes$/, 'Clientes'],
			['Agenda', /\/administracao\/agenda$/, 'Agenda'],
		];
		for (const [rotulo, url, titulo] of destinos) {
			const link = nav.getByRole('link', { name: rotulo, exact: true });
			await link.click();
			await expect(page).toHaveURL(url);
			await expect(link).toHaveAttribute('aria-current', 'page');
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
		}
		await esperarAlvosDeToque(nav);
	});

	test('o hambúrguer do topo abre o menu lateral; cada link navega, marca a área ativa e fecha o menu', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const hamburguer = page.getByRole('button', { name: 'Abrir menu' });
		const menu = page.getByRole('navigation', { name: 'Menu lateral' });
		await expect(menu).toHaveCount(0);
		const destinos: [string, RegExp, string][] = [
			['Ordens de serviço', /\/administracao\/ordem-servico$/, 'Ordens de serviço'],
			['Estoque', /\/administracao\/estoque$/, 'Estoque'],
			['Clientes', /\/administracao\/clientes$/, 'Clientes'],
			['Serviços', /\/administracao\/servicos$/, 'Serviços'],
			['Aparência', /\/administracao\/configuracoes/, 'Identidade visual'],
			['Agenda', /\/administracao\/agenda$/, 'Agenda'],
		];
		for (const [rotulo, url, titulo] of destinos) {
			await hamburguer.click();
			await expect(menu).toBeVisible();
			await expect(hamburguer).toHaveAttribute('aria-expanded', 'true');
			await menu.getByRole('link', { name: rotulo, exact: true }).click();
			await expect(page).toHaveURL(url);
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
			await expect(menu, 'o menu fecha ao navegar').toHaveCount(0);
			await hamburguer.click();
			await expect(menu.getByRole('link', { name: rotulo, exact: true })).toHaveAttribute('aria-current', 'page');
			await page.getByRole('button', { name: 'Fechar menu' }).click();
			await expect(menu).toHaveCount(0);
		}
	});

	test('o botão "Menu" da barra inferior abre o menu lateral', async ({ page }) => {
		await page.goto('/administracao/clientes');
		await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Menu', exact: true }).click();
		const menu = page.getByRole('navigation', { name: 'Menu lateral' });
		await expect(menu).toBeVisible();
		await expect(menu.getByRole('link')).toHaveText(['Agenda', 'Ordens de serviço', 'Estoque', 'Clientes', 'Serviços', 'Aparência']);
		await expect(menu.getByRole('link', { name: 'Clientes', exact: true })).toHaveAttribute('aria-current', 'page');
	});

	test('o menu lateral fecha pelo X, pelo fundo escurecido e pelo Esc sem navegar', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const menu = page.getByRole('navigation', { name: 'Menu lateral' });
		const abrir = async () => {
			await page.getByRole('button', { name: 'Abrir menu' }).click();
			await expect(menu).toBeVisible();
		};

		await abrir();
		await page.getByRole('button', { name: 'Fechar menu' }).click();
		await expect(menu).toHaveCount(0);

		await abrir();
		await page.mouse.click(360, 300);
		await expect(menu).toHaveCount(0);

		await abrir();
		await page.keyboard.press('Escape');
		await expect(menu).toHaveCount(0);
		await expect(page).toHaveURL(/\/administracao\/agenda$/);
	});

	test('menu lateral cabe em 375 px e tem alvos de toque ≥ 44 px', async ({ page }) => {
		await page.goto('/administracao/agenda');
		await page.getByRole('button', { name: 'Abrir menu' }).click();
		const painel = page.locator('.p-drawer');
		await expect(painel).toBeVisible();
		// Espera a animação de entrada terminar antes de medir.
		await expect.poll(async () => (await painel.boundingBox())?.x).toBe(0);
		const caixa = (await painel.boundingBox())!;
		expect(caixa.x + caixa.width).toBeLessThanOrEqual(375);
		await esperarAlvosDeToque(painel);
		await esperarSemScrollHorizontal(page);
		await esperarAlvosDeToque(page.locator('header'));
	});

	for (const rota of [
		'/administracao/agenda',
		'/administracao/ordem-servico',
		'/administracao/ordem-servico/nova',
		'/administracao/servicos',
		'/administracao/clientes',
		'/administracao/clientes/novo',
		'/administracao/estoque',
		'/administracao/estoque/nova',
	]) {
		test(`${rota} cabe em 375 px sem scroll horizontal`, async ({ page }) => {
			await page.goto(rota);
			await page.waitForLoadState('networkidle');
			await esperarSemScrollHorizontal(page);
		});
	}

	test('inputs têm fonte ≥ 16 px (sem zoom no Safari)', async ({ page }) => {
		await page.goto('/administracao/ordem-servico/nova');
		await page.waitForLoadState('networkidle');
		const pequenos = await page
			.locator('input:visible, textarea:visible')
			.evaluateAll((campos) =>
				campos.filter((c) => parseFloat(getComputedStyle(c).fontSize) < 16).map((c) => c.id || c.outerHTML.slice(0, 60)),
			);
		expect(pequenos).toEqual([]);
	});
});
