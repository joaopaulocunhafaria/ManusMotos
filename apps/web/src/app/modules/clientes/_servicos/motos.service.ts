import { Injectable } from '@angular/core';
import type { Moto } from '@manus/shared';
import { map, Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { deSupabase } from '../../../utils/_metodos/supabase';
import { MotoFormulario } from '../_modelos/cliente.model';

/** Motos dos clientes (`motorcycles`). */
@Injectable({
	providedIn: 'root',
})
export class MotosService {
	constructor(private supabaseService: SupabaseService) {}

	public buscarPorCliente(clienteId: string): Observable<Moto[]> {
		return deSupabase(this.supabaseService.client.from('motorcycles').select('*').eq('client_id', clienteId).order('created_at')).pipe(
			map((motos) => motos ?? []),
		);
	}

	/** Cria as novas e atualiza as existentes do cliente. */
	public salvarDoCliente(clienteId: string, motos: MotoFormulario[]): Observable<Moto[]> {
		const linhas = motos.map(({ id, ...moto }) => ({ ...(id ? { id } : {}), ...moto, client_id: clienteId }));
		return deSupabase(this.supabaseService.client.from('motorcycles').upsert(linhas, { defaultToNull: false }).select()).pipe(
			map((salvas) => salvas ?? []),
		);
	}

	public excluir(ids: string[]): Observable<null> {
		return deSupabase(this.supabaseService.client.from('motorcycles').delete().in('id', ids));
	}
}
