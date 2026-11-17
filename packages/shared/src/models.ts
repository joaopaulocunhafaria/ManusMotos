import type { Tables, TablesInsert, TablesUpdate } from './database.types';

/**
 * Aliases de domínio sobre os tipos gerados pelo Supabase.
 * Adicione aqui um alias por tabela para usar no front e nas edge functions.
 */
/** Identidade visual da instância (linha única, id = 1). */
export type DesignSettings = Tables<'design_settings'>;
export type DesignSettingsUpdate = TablesUpdate<'design_settings'>;

/** Cliente da mecânica (`document` = CPF/CNPJ só dígitos). */
export type Cliente = Tables<'clients'>;
export type ClienteInsert = TablesInsert<'clients'>;
export type ClienteUpdate = TablesUpdate<'clients'>;

/** Moto de um cliente (`plate` maiúscula, sem hífen). */
export type Moto = Tables<'motorcycles'>;
export type MotoInsert = TablesInsert<'motorcycles'>;
export type MotoUpdate = TablesUpdate<'motorcycles'>;

/** Serviço do catálogo (só nome; o preço é definido em cada OS). */
export type Servico = Tables<'services'>;
export type ServicoInsert = TablesInsert<'services'>;
export type ServicoUpdate = TablesUpdate<'services'>;

/** Ordem de serviço. Gravação via RPC `save_service_order`. */
export type OrdemServico = Tables<'service_orders'>;
export type ItemOrdemServico = Tables<'service_order_items'>;

export type StatusOrdemServico = 'draft' | 'awaiting_approval' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'canceled';
export type FormaPagamento = 'pix' | 'cash' | 'installments';

/** Agendamento da agenda semanal (`start_time` vem como `HH:MM:SS`, data/hora locais). */
export type Agendamento = Tables<'appointments'>;
export type AgendamentoInsert = TablesInsert<'appointments'>;
export type AgendamentoUpdate = TablesUpdate<'appointments'>;

/** Peça do estoque. `profit_margin` (% sobre a venda) é calculada pelo banco. */
export type Peca = Tables<'parts'>;
export type PecaInsert = TablesInsert<'parts'>;
export type PecaUpdate = TablesUpdate<'parts'>;

/** Movimentação de estoque: `purchase` (sai do caixa), `sale` (entra no caixa), `adjustment` (sem efeito no caixa). */
export type MovimentoPeca = Tables<'part_movements'>;
export type TipoMovimentoPeca = 'purchase' | 'sale' | 'adjustment';

/** Início do caixa (linha única, id = 1). */
export type ConfiguracaoCaixa = Tables<'cash_settings'>;

/** Lançamento manual do caixa (`income` = entrada, `expense` = saída). */
export type LancamentoCaixa = Tables<'cash_entries'>;
export type LancamentoCaixaInsert = TablesInsert<'cash_entries'>;
export type TipoLancamentoCaixa = 'income' | 'expense';
