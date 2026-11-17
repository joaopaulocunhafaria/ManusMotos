import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
	Agendamento,
	Cliente,
	ConfiguracaoCaixa,
	Database,
	LancamentoCaixa,
	LancamentoCaixaInsert,
	Moto,
	MovimentoPeca,
	OrdemServico,
	Peca,
	PecaInsert,
	Servico,
} from '@manus/shared';
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
		lancamentos: new Set<string>(),
	};

	/** Caixa antes do teste, restaurado em `limpar()` quando o teste o alterou. */
	private caixaOriginal: ConfiguracaoCaixa | null = null;
	private nomesPecasExcluidas = new Set<string>();

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

	/** Movimentações da peça (compras, vendas, ajustes), da mais antiga para a mais recente. */
	public async movimentosDaPeca(pecaId: string): Promise<MovimentoPeca[]> {
		const { data, error } = await this.client.from('part_movements').select('*').eq('part_id', pecaId).order('created_at');
		if (error) throw error;
		return data;
	}

	/** Exclui a peça e marca o nome para apagar no fim as movimentações que ficam órfãs (part_id nulo). */
	public async excluirPecaComHistorico(peca: Peca): Promise<void> {
		this.nomesPecasExcluidas.add(peca.name);
		const { error } = await this.client.from('parts').delete().eq('id', peca.id);
		if (error) throw error;
	}

	/** Vende pela RPC (como outro aparelho faria). */
	public async venderPeca(pecaId: string, quantidade: number, preco: number, data: string): Promise<MovimentoPeca> {
		const { data: venda, error } = await this.client.rpc('sell_part', {
			p_part_id: pecaId,
			p_quantity: quantidade,
			p_unit_price: preco,
			p_date: data,
		});
		if (error) throw error;
		return venda as MovimentoPeca;
	}

	/** Conclui a OS e fixa a data de conclusão (meio-dia no fuso da oficina). completed_at só é gravável pela service_role. */
	public async concluirOrdemEm(id: string, data: string): Promise<void> {
		const { error } = await this.client.from('service_orders').update({ status: 'completed' }).eq('id', id);
		if (error) throw error;
		const { error: erroData } = await this.admin
			.from('service_orders')
			.update({ completed_at: `${data}T12:00:00-03:00` })
			.eq('id', id);
		if (erroData) throw erroData;
	}

	public async criarLancamento(dados: Partial<LancamentoCaixaInsert> & { entry_date: string }): Promise<LancamentoCaixa> {
		const { data, error } = await this.client
			.from('cash_entries')
			.insert({ kind: 'expense', description: `Lançamento E2E ${unico()}`, amount: 10, ...dados })
			.select()
			.single();
		if (error) throw error;
		this.registrar('lancamentos', data.id);
		return data;
	}

	public async lancamento(id: string): Promise<LancamentoCaixa | null> {
		const { data, error } = await this.client.from('cash_entries').select('*').eq('id', id).maybeSingle();
		if (error) throw error;
		return data;
	}

	/** Lançamentos com a descrição exata (registra para limpeza os criados pela tela). */
	public async lancamentosPorDescricao(descricao: string): Promise<LancamentoCaixa[]> {
		const { data, error } = await this.client.from('cash_entries').select('*').eq('description', descricao);
		if (error) throw error;
		data.forEach((linha) => this.registrar('lancamentos', linha.id));
		return data;
	}

	public async caixa(): Promise<ConfiguracaoCaixa> {
		const { data, error } = await this.client.from('cash_settings').select('*').eq('id', 1).single();
		if (error) throw error;
		return data;
	}

	/** Define o início do caixa (o valor anterior volta no fim do teste). */
	public async definirCaixa(valor: number, data: string): Promise<void> {
		this.caixaOriginal ??= await this.caixa();
		const { error } = await this.client.from('cash_settings').update({ opening_balance: valor, opening_date: data }).eq('id', 1);
		if (error) throw error;
	}

	/** Guarda o caixa atual para restaurar no fim (use antes de alterá-lo pela tela). */
	public async guardarCaixa(): Promise<void> {
		this.caixaOriginal ??= await this.caixa();
	}

	/** Remove tudo que o teste criou (OS antes de clientes/serviços, por causa das FKs). */
	public async limpar(): Promise<void> {
		if (this.caixaOriginal) {
			const { opening_balance, opening_date } = this.caixaOriginal;
			await this.admin.from('cash_settings').update({ opening_balance, opening_date }).eq('id', 1);
		}
		const apagar = async (
			tabela: 'service_orders' | 'clients' | 'services' | 'appointments' | 'parts' | 'cash_entries',
			ids: Set<string>,
		) => {
			if (ids.size)
				await this.admin
					.from(tabela)
					.delete()
					.in('id', [...ids]);
		};
		await apagar('appointments', this.ids.agendamentos);
		await apagar('cash_entries', this.ids.lancamentos);
		// Movimentações ficam com part_id nulo quando a peça é apagada: remove antes para não sobrar histórico de teste.
		if (this.ids.pecas.size)
			await this.admin
				.from('part_movements')
				.delete()
				.in('part_id', [...this.ids.pecas]);
		if (this.nomesPecasExcluidas.size)
			await this.admin
				.from('part_movements')
				.delete()
				.is('part_id', null)
				.in('part_name', [...this.nomesPecasExcluidas]);
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
