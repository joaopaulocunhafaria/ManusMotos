import { environment } from './environment';

// Nos testes Karma não há fileReplacements: este é o environment de PRODUÇÃO (o usado no deploy da Vercel).
describe('environment de produção', () => {
	it('está marcado como produção', () => {
		expect(environment.production).toBeTrue();
	});

	it('aponta para a URL base do Supabase de produção (sem /rest/v1)', () => {
		expect(environment.supabaseUrl).toBe('https://jirabjimylbuizgxxhcj.supabase.co');
	});

	it('usa a publishable key (nunca a secreta)', () => {
		expect(environment.supabaseKey).toMatch(/^sb_publishable_/);
	});
});
