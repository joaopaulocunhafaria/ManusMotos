import { AbstractControl } from '@angular/forms';

/** Campo inválido e já tocado/alterado (para exibir a mensagem de erro). */
export function campoInvalido(controle: AbstractControl | null | undefined): boolean {
	return !!controle && controle.invalid && (controle.touched || controle.dirty);
}

/** Texto aparado ou `null` quando vazio. */
export function textoOuNulo(valor: string | null | undefined): string | null {
	return valor && valor.trim() ? valor.trim() : null;
}
