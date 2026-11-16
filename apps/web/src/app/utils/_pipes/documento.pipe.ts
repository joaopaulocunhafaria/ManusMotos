import { Pipe, PipeTransform } from '@angular/core';
import { formatarDocumento } from '../_metodos/texto';

/** CPF/CNPJ formatado: `{{ cliente.document | documento }}`. */
@Pipe({ name: 'documento', standalone: false })
export class DocumentoPipe implements PipeTransform {
	public transform(valor: string | null | undefined): string {
		return formatarDocumento(valor);
	}
}
