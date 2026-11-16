import { Pipe, PipeTransform } from '@angular/core';
import { formatarTelefone } from '../_metodos/texto';

/** Telefone formatado: `{{ cliente.phone | telefone }}`. */
@Pipe({ name: 'telefone', standalone: false })
export class TelefonePipe implements PipeTransform {
	public transform(valor: string | null | undefined): string {
		return formatarTelefone(valor);
	}
}
