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

	test('a barra inferior leva a cada área e marca a ativa', async ({ page }) => {
		await page.goto('/administracao/agenda');
		const nav = page.getByRole('navigation', { name: 'Navegação principal' });
		const destinos: [string, RegExp, string][] = [
			['OS', /\/administracao\/ordem-servico$/, 'Ordens de serviço'],
			['Serviços', /\/administracao\/servicos$/, 'Serviços'],
			['Clientes', /\/administracao\/clientes$/, 'Clientes'],
			['Aparência', /\/administracao\/configuracoes/, 'Identidade visual'],
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

	for (const rota of [
		'/administracao/agenda',
		'/administracao/ordem-servico',
		'/administracao/ordem-servico/nova',
		'/administracao/servicos',
		'/administracao/clientes',
		'/administracao/clientes/novo',
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
