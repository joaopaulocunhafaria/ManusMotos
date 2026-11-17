import type { TipoMovimentoPeca } from '@manus/shared';

/** Rótulos das movimentações de estoque. */
export const TIPO_MOVIMENTO_LABEL: Record<TipoMovimentoPeca, string> = {
	purchase: 'Compra',
	sale: 'Venda',
	adjustment: 'Saída (ajuste)',
};

export const TIPO_MOVIMENTO_SEVERIDADE: Record<TipoMovimentoPeca, 'info' | 'success' | 'secondary'> = {
	purchase: 'info',
	sale: 'success',
	adjustment: 'secondary',
};
