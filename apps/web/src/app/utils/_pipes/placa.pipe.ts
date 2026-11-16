import { Pipe, PipeTransform } from '@angular/core';
import { formatarPlaca } from '../_metodos/texto';

/** Placa formatada: `{{ moto.plate | placa }}`. */
@Pipe({ name: 'placa', standalone: false })
export class PlacaPipe implements PipeTransform {
	public transform(valor: string | null | undefined): string {
		return formatarPlaca(valor);
	}
}
