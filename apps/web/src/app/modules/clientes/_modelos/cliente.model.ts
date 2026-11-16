import type { Cliente, Moto } from '@manus/shared';

/** Cliente com as motos embutidas (`select('*, motorcycles(*)')`). */
export type ClienteComMotos = Cliente & { motorcycles: Moto[] };

/** Moto vinda do formulário (sem `id` quando nova). */
export interface MotoFormulario {
	id: string | null;
	model: string;
	color: string;
	plate: string;
}

/** Dados do cliente vindos do formulário, já normalizados. */
export interface ClienteFormulario {
	name: string;
	phone: string;
	document: string;
	address: string | null;
}
