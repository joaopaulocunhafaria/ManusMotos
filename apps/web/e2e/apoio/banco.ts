import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Agendamento, Cliente, Database, Moto, OrdemServico, Peca, PecaInsert, Servico } from '@manus/shared';
import { environment } from '../../src/environments/environment.development';
import { gerarCpf, gerarPlaca, gerarTelefone, unico } from './geradores';

export type ClienteCriado = Cliente & { motorcycles: Moto[] };

/**
 * Acesso direto ao Supabase local para preparar cenários e conferir o que a tela gravou.
 * Usa a mesma chave pública do app (papel `anon`). Tudo que é criado aqui é removido em `limpar()`.
 */
export class Banco {
	public readonly client: SupabaseClient<Database> = createClient<Database>(environment.supabaseUrl, environment.supabaseKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	/** Só para limpeza: o Supabase local libera a service_role (o app nunca usa). */
	private readonly admin: SupabaseClient<Database> = createClient<Database>(
		environment.supabaseUrl,
		process.env['E2E_SERVICE_ROLE_KEY'] ?? environment.supabaseKey,
		{ auth: { persistSession: false, autoRefreshToken: false } },
	);

	private ids = {
		ordens: new Set<string>(),
		clientes: new Set<string>(),
		servicos: new Set<string>(),
		agendamentos: new Set<string>(),
		pecas: new Set<string>(),
	};

	/** Registra para limpeza registros criados pela própria tela. */
	public registrar(tipo: keyof Banco['ids'], id: string): void {
		this.ids[tipo].add(id);
	}

	public async criarServico(nome = `Serviço E2E ${unico()}`, ativo = true): Promise<Servico> {
		const { data, error } = await this.client.from('services').insert({ name: nome, active: ativo }).select().single();
		if (error) throw error;
		this.registrar('servicos', data.id);
		return data;
	}

	public async criarCliente(opcoes: { nome?: string; motos?: number; endereco?: string | null } = {}): Promise<ClienteCriado> {
		const { data: cliente, error } = await this.client
			.from('clients')
			.insert({
				name: opcoes.nome ?? `Cliente E2E ${unico()}`,
				phone: gerarTelefone(),
				document: gerarCpf(),
				address: opcoes.endereco ?? null,
			})
			.select()
			.single();
		if (error) throw error;
		this.registrar('clientes', cliente.id);
		const motos = Array.from({ length: opcoes.motos ?? 1 }, (_, i) => ({
			client_id: cliente.id,
			model: `Moto E2E ${i + 1}`,
			color: 'Preta',
			plate: gerarPlaca(),
		}));
		const { data: motosCriadas, error: erroMotos } = await this.client.from('motorcycles').insert(motos).select();
		if (erroMotos) throw erroMotos;
		return { ...cliente, motorcycles: motosCriadas };
	}

	public async criarOrdem(
		cliente: ClienteCriado,
		itens: { servico: Servico; preco: number }[],
		extras: Record<string, unknown> = {},
	): Promise<OrdemServico> {
		const { data: id, error } = await this.client.rpc('save_service_order', {
			p_order: { client_id: cliente.id, motorcycle_id: cliente.motorcycles[0].id, payment_method: 'pix', ...extras },
			p_items: itens.map(({ servico, preco }) => ({ service_id: servico.id, price: preco })),
		});
		if (error) throw error;
		this.registrar('ordens', id);
		return this.ordem(id);
	}

	public async ordem(id: string): Promise<OrdemServico> {
		const { data, error } = await this.client.from('service_orders').select('*').eq('id', id).single();
		if (error) throw error;
		return data;
	}

	public async itensDaOrdem(id: string) {
		const { data, error } = await this.client.from('service_order_items').select('*').eq('service_order_id', id).order('position');
		if (error) throw error;
		return data;
	}

	public async clientePorDocumento(documento: string): Promise<ClienteCriado | null> {
		const { data } = await this.client.from('clients').select('*, motorcycles(*)').eq('document', documento).maybeSingle();
		if (data) this.registrar('clientes', data.id);
		return data as ClienteCriado | null;
	}

	public async servicoPorNome(nome: string): Promise<Servico | null> {
		const { data } = await this.client.from('services').select('*').eq('name', nome).maybeSingle();
		if (data) this.registrar('servicos', data.id);
		return data;
	}

	public async criarAgendamento(dados: Partial<Agendamento> & { scheduled_date: string; start_time: string }): Promise<Agendamento> {
		const { data, error } = await this.client
			.from('appointments')
			.insert({ client_name: `Agendado E2E ${unico()}`, duration_minutes: 60, ...dados })
			.select()
			.single();
		if (error) throw error;
		this.registrar('agendamentos', data.id);
		return data;
	}

	public async agendamentosDoDia(data: string): Promise<Agendamento[]> {
		const { data: linhas, error } = await this.client.from('appointments').select('*').eq('scheduled_date', data).order('start_time');
		if (error) throw error;
		linhas.forEach((linha) => this.registrar('agendamentos', linha.id));
		return linhas;
	}

	public async criarPeca(dados: Partial<PecaInsert> = {}): Promise<Peca> {
		const { data, error } = await this.client
			.from('parts')
			.insert({ name: `Peça E2E ${unico()}`, purchase_price: 100, sale_price: 150, quantity: 1, ...dados })
			.select()
			.single();
		if (error) throw error;
		this.registrar('pecas', data.id);
		return data;
	}

	public async peca(id: string): Promise<Peca | null> {
		const { data, error } = await this.client.from('parts').select('*').eq('id', id).maybeSingle();
		if (error) throw error;
		return data;
	}

	/** Peças com o nome exato (registra para limpeza as criadas pela tela). */
	public async pecasPorNome(nome: string): Promise<Peca[]> {
		const { data, error } = await this.client.from('parts').select('*').eq('name', nome);
		if (error) throw error;
		data.forEach((linha) => this.registrar('pecas', linha.id));
		return data;
	}

	/** Remove tudo que o teste criou (OS antes de clientes/serviços, por causa das FKs). */
	public async limpar(): Promise<void> {
		const apagar = async (tabela: 'service_orders' | 'clients' | 'services' | 'appointments' | 'parts', ids: Set<string>) => {
			if (ids.size)
				await this.admin
					.from(tabela)
					.delete()
					.in('id', [...ids]);
		};
		await apagar('appointments', this.ids.agendamentos);
		await apagar('parts', this.ids.pecas);
		// OS criadas pela tela para os clientes do teste.
		if (this.ids.clientes.size) {
			const { data } = await this.admin
				.from('service_orders')
				.select('id')
				.in('client_id', [...this.ids.clientes]);
			data?.forEach((linha) => this.ids.ordens.add(linha.id));
		}
		await apagar('service_orders', this.ids.ordens);
		await apagar('clients', this.ids.clientes);
		// Serviços usados em OS de outros testes ainda em execução ficam (FK restrict); são apagados na limpeza daquele teste.
		for (const id of this.ids.servicos) await this.admin.from('services').delete().eq('id', id);
	}
}
