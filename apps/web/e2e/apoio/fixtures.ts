import { expect, Locator, Page, test as base } from '@playwright/test';
import { Banco } from './banco';

interface Fixtures {
	/** Dados do teste: criados por ele e apagados ao final. */
	banco: Banco;
	/** Falha o teste se a página lançar erro JS não tratado. */
	semErrosJs: void;
}

export const test = base.extend<Fixtures>({
	banco: async ({}, usar) => {
		const banco = new Banco();
		await usar(banco);
		await banco.limpar();
	},
	semErrosJs: [
		async ({ page }, usar) => {
			const erros: string[] = [];
			page.on('pageerror', (erro) => erros.push(erro.message));
			await usar();
			expect(erros, 'Erros JS não tratados na página').toEqual([]);
		},
		{ auto: true },
	],
});

export { expect };

/** Garante que a página não rola na horizontal (regra do layout mobile). */
export async function esperarSemScrollHorizontal(page: Page): Promise<void> {
	const larguras = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, janela: window.innerWidth }));
	expect(larguras.pagina, 'scroll horizontal na página').toBeLessThanOrEqual(larguras.janela);
}

/** Toast do PrimeNG com o texto. */
export function toast(page: Page, texto: string | RegExp): Locator {
	return page.locator('.p-toast-message').filter({ hasText: texto });
}

/** Digita num p-autoComplete e escolhe a opção que contém o texto. */
export async function escolherNoAutocomplete(
	page: Page,
	seletorInput: string,
	termo: string,
	opcao: string | RegExp = termo,
): Promise<void> {
	const input = page.locator(seletorInput);
	await input.click();
	await input.pressSequentially(termo, { delay: 20 });
	const item = page.getByRole('option').filter({ hasText: opcao }).first();
	await item.click();
}

/** Escolhe uma opção num p-select pelo id do input. */
export async function escolherNoSelect(page: Page, inputId: string, opcao: string | RegExp): Promise<void> {
	await page.locator(`#${inputId}`).click();
	await page.getByRole('option').filter({ hasText: opcao }).first().click();
}

/** Preenche um p-inputNumber (moeda/numero) apagando o valor anterior. */
export async function preencherNumero(page: Page, seletorInput: string, valor: string): Promise<void> {
	const input = page.locator(seletorInput);
	await input.click();
	await input.press('ControlOrMeta+a');
	await input.press('Backspace');
	await input.pressSequentially(valor, { delay: 20 });
	await input.blur();
}

/** Alvos de toque visíveis com pelo menos 44 × 44 px (botões e links da área). */
export async function esperarAlvosDeToque(area: Locator): Promise<void> {
	const pequenos = await area.locator('button:visible, a:visible').evaluateAll((elementos) =>
		elementos
			.map((e) => ({ texto: (e.textContent || e.getAttribute('aria-label') || '').trim(), ...e.getBoundingClientRect().toJSON() }))
			.filter((r) => r.width > 0 && (r.height < 44 || r.width < 44))
			.map((r) => `${r.texto} (${Math.round(r.width)}×${Math.round(r.height)})`),
	);
	expect(pequenos, 'alvos de toque menores que 44 px').toEqual([]);
}
