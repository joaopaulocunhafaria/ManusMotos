import { OrigemExtrato, TipoPeriodo } from '../_modelos/resumo-financeiro.model';

export const ORIGEM_EXTRATO_LABEL: Record<OrigemExtrato, string> = {
	os: 'Ordem de serviço',
	sale: 'Venda de peça',
	purchase: 'Compra de estoque',
	income: 'Entrada',
	expense: 'Saída',
};

export const ORIGEM_EXTRATO_ICONE: Record<OrigemExtrato, string> = {
	os: 'pi pi-file-edit',
	sale: 'pi pi-shopping-cart',
	purchase: 'pi pi-box',
	income: 'pi pi-arrow-down-left',
	expense: 'pi pi-arrow-up-right',
};

export const TIPO_PERIODO_LABEL: Record<TipoPeriodo, string> = {
	semana: 'Semana',
	mes: 'Mês',
	ano: 'Ano',
	personalizado: 'Período',
};
