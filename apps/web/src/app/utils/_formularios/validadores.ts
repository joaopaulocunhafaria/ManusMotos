import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const REGEX_COR_HEX = /^#[0-9a-fA-F]{6}$/;

/** Cor no formato `#rrggbb`. Erro: `{ corHex: true }`. Vazio passa (combine com `Validators.required`). */
export function corHex(): ValidatorFn {
	return (controle: AbstractControl): ValidationErrors | null => {
		const valor = controle.value;
		if (valor === null || valor === undefined || valor === '') return null;
		return typeof valor === 'string' && REGEX_COR_HEX.test(valor) ? null : { corHex: true };
	};
}

/** Telefone brasileiro com 10 ou 11 dígitos (ignora máscara). Erro: `{ telefone: true }`. Vazio passa. */
export function telefone(): ValidatorFn {
	return (controle: AbstractControl): ValidationErrors | null => {
		const valor = controle.value;
		if (!valor) return null;
		const digitos = String(valor).replace(/\D/g, '');
		return digitos.length === 10 || digitos.length === 11 ? null : { telefone: true };
	};
}

function cpfValido(cpf: string): boolean {
	if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
	const digito = (tamanho: number) => {
		let soma = 0;
		for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
		const resto = (soma * 10) % 11;
		return resto === 10 ? 0 : resto;
	};
	return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

function cnpjValido(cnpj: string): boolean {
	if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
	const digito = (tamanho: number) => {
		const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const soma = pesos.reduce((total, peso, i) => total + Number(cnpj[i]) * peso, 0);
		const resto = soma % 11;
		return resto < 2 ? 0 : 11 - resto;
	};
	return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13]);
}

/** CPF ou CNPJ válido (dígitos verificadores; ignora máscara). Erro: `{ cpfCnpj: true }`. Vazio passa. */
export function cpfCnpj(): ValidatorFn {
	return (controle: AbstractControl): ValidationErrors | null => {
		const valor = controle.value;
		if (!valor) return null;
		const digitos = String(valor).replace(/\D/g, '');
		return cpfValido(digitos) || cnpjValido(digitos) ? null : { cpfCnpj: true };
	};
}

/** Placa antiga (ABC-1234) ou Mercosul (ABC1D23), ignorando hífen e caixa. Erro: `{ placa: true }`. Vazio passa. */
export function placa(): ValidatorFn {
	return (controle: AbstractControl): ValidationErrors | null => {
		const valor = controle.value;
		if (!valor) return null;
		const normalizada = String(valor)
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '');
		return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizada) ? null : { placa: true };
	};
}

/**
 * Validador de grupo para os anos da moto: ano final exige o inicial e não pode ser menor que ele.
 * Erros: `{ anoFinalSemInicial: true }` ou `{ anoFinalMenor: true }`.
 */
export function anosMoto(campoInicio = 'year_start', campoFim = 'year_end'): ValidatorFn {
	return (grupo: AbstractControl): ValidationErrors | null => {
		const inicio = grupo.get(campoInicio)?.value;
		const fim = grupo.get(campoFim)?.value;
		if (fim === null || fim === undefined || fim === '') return null;
		if (inicio === null || inicio === undefined || inicio === '') return { anoFinalSemInicial: true };
		return Number(fim) < Number(inicio) ? { anoFinalMenor: true } : null;
	};
}
