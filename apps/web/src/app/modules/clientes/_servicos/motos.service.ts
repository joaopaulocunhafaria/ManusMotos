import { Injectable } from '@angular/core';
import type { Moto } from '@manus/shared';
import { map, Observable } from 'rxjs';
import { SupabaseService } from '../../../services/supabase.service';
import { deSupabase } from '../../../utils/_metodos/supabase';

/** Motos dos clientes (`motorcycles`). A gravação é feita junto com o cliente em `ClientesService.salvar`. */
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
}
