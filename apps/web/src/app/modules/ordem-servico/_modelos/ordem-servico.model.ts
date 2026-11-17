import type { Cliente, FormaPagamento, ItemOrdemServico, Moto, OrdemServico, Servico } from '@manus/shared';

/** OS na listagem (com nome do cliente e moto). */
export type OrdemServicoResumo = OrdemServico & {
	clients: Pick<Cliente, 'name' | 'phone'>;
	motorcycles: Pick<Moto, 'model' | 'plate'>;
};

/** OS completa para o detalhe e a versão do cliente. */
export type OrdemServicoDetalhada = OrdemServico & {
	clients: Cliente;
	motorcycles: Moto;
	service_order_items: ItemOrdemServico[];
};

/** Dados gravados pela RPC `save_service_order` (o total é calculado no banco). */
export interface DadosOrdemServico {
	client_id: string;
	motorcycle_id: string;
	mileage: number | null;
	payment_method: FormaPagamento;
	installments: number | null;
	down_payment: number;
	order_date: string;
	/** Previsão de entrega enviada ao cliente. */
	estimated_time: string | null;
	/** Estimativa interna de trabalho ativo, em minutos. */
	work_estimate_minutes: number | null;
	notes: string | null;
	customer_notes: string | null;
}

/** Item vindo do formulário. */
export interface ItemFormulario {
	servico: Pick<Servico, 'id' | 'name'> | null;
	price: number | null;
}

/** Campos do cronômetro de trabalho devolvidos pelas RPCs. */
export type CronometroOrdemServico = Pick<OrdemServico, 'work_seconds' | 'work_started_at' | 'work_estimate_minutes'>;
