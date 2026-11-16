import type { FormaPagamento, StatusOrdemServico } from '@manus/shared';

export type SeveridadeTag = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

export const LABEL_STATUS: Record<StatusOrdemServico, string> = {
	draft: 'Rascunho',
	awaiting_approval: 'Aguardando aprovação',
	approved: 'Aprovada',
	rejected: 'Recusada',
	in_progress: 'Em andamento',
	completed: 'Concluída',
	canceled: 'Cancelada',
};

export const SEVERIDADE_STATUS: Record<StatusOrdemServico, SeveridadeTag> = {
	draft: 'secondary',
	awaiting_approval: 'warn',
	approved: 'info',
	rejected: 'danger',
	in_progress: 'contrast',
	completed: 'success',
	canceled: 'secondary',
};

export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
	pix: 'Pix',
	cash: 'À vista',
	installments: 'Parcelado',
};

export const OPCOES_FORMA_PAGAMENTO = (Object.keys(LABEL_FORMA_PAGAMENTO) as FormaPagamento[]).map((valor) => ({
	label: LABEL_FORMA_PAGAMENTO[valor],
	valor,
}));

export const OPCOES_STATUS = (Object.keys(LABEL_STATUS) as StatusOrdemServico[]).map((valor) => ({ label: LABEL_STATUS[valor], valor }));

export interface TransicaoStatus {
	status: StatusOrdemServico;
	label: string;
	icone: string;
	/** Ações que encerram/desfazem pedem confirmação. */
	confirmar?: boolean;
}

/** Próximos passos possíveis a partir de cada status (botões do detalhe). */
export const TRANSICOES_STATUS: Record<StatusOrdemServico, TransicaoStatus[]> = {
	draft: [
		{ status: 'awaiting_approval', label: 'Marcar como enviada ao cliente', icone: 'pi pi-send' },
		{ status: 'approved', label: 'Cliente aprovou', icone: 'pi pi-thumbs-up' },
	],
	awaiting_approval: [
		{ status: 'approved', label: 'Cliente aprovou', icone: 'pi pi-thumbs-up' },
		{ status: 'rejected', label: 'Cliente recusou', icone: 'pi pi-thumbs-down', confirmar: true },
	],
	approved: [{ status: 'in_progress', label: 'Iniciar serviço', icone: 'pi pi-play' }],
	rejected: [{ status: 'awaiting_approval', label: 'Reenviar ao cliente', icone: 'pi pi-send' }],
	in_progress: [{ status: 'completed', label: 'Concluir serviço', icone: 'pi pi-check-circle', confirmar: true }],
	completed: [],
	canceled: [{ status: 'draft', label: 'Reabrir como rascunho', icone: 'pi pi-replay' }],
};

/** Status em que ainda faz sentido cancelar. */
export const STATUS_CANCELAVEIS: StatusOrdemServico[] = ['draft', 'awaiting_approval', 'approved', 'rejected', 'in_progress'];

/** Quantidade máxima de parcelas oferecida no formulário. */
export const MAXIMO_PARCELAS = 12;
