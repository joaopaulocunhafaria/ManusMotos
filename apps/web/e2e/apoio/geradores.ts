/** Geradores de dados únicos: cada teste cria os próprios registros e não depende do seed. */

let contador = 0;

/** Sufixo curto e único por execução (evita colisão entre testes paralelos). */
export function unico(): string {
	contador++;
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${contador}`.toUpperCase();
}

const aleatorio = (max: number) => Math.floor(Math.random() * max);

/** CPF válido aleatório (só dígitos). */
export function gerarCpf(): string {
	const base = Array.from({ length: 9 }, () => aleatorio(10));
	if (new Set(base).size === 1) base[0] = (base[0] + 1) % 10;
	const digito = (numeros: number[]) => {
		const soma = numeros.reduce((total, n, i) => total + n * (numeros.length + 1 - i), 0);
		const resto = (soma * 10) % 11;
		return resto === 10 ? 0 : resto;
	};
	const d1 = digito(base);
	const d2 = digito([...base, d1]);
	return [...base, d1, d2].join('');
}

/** Formata CPF como o usuário digitaria. */
export function cpfFormatado(cpf: string): string {
	return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Placa Mercosul aleatória (AAA9A99). */
export function gerarPlaca(): string {
	const letra = () => LETRAS[aleatorio(26)];
	return `${letra()}${letra()}${letra()}${aleatorio(10)}${letra()}${aleatorio(10)}${aleatorio(10)}`;
}

/** Celular com DDD (11 dígitos). */
export function gerarTelefone(): string {
	return `319${String(aleatorio(100_000_000)).padStart(8, '0')}`;
}

/** Segunda-feira aleatória num futuro distante (`YYYY-MM-DD`): a semana fica só para o teste. */
export function segundaFeiraIsolada(): string {
	const data = new Date(2040 + aleatorio(40), 0, 2 + aleatorio(300));
	const diaSemana = data.getDay();
	data.setDate(data.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
	return isoLocal(data);
}

export function isoLocal(data: Date): string {
	return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function somarDias(iso: string, dias: number): string {
	const [a, m, d] = iso.split('-').map(Number);
	return isoLocal(new Date(a, m - 1, d + dias));
}

/** CNPJ válido aleatório (só dígitos). */
export function gerarCnpj(): string {
	const base = [...Array.from({ length: 8 }, () => aleatorio(10)), 0, 0, 0, 1];
	const digito = (numeros: number[]) => {
		const pesos = numeros.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const resto = numeros.reduce((total, n, i) => total + n * pesos[i], 0) % 11;
		return resto < 2 ? 0 : 11 - resto;
	};
	const d1 = digito(base);
	return [...base, d1, digito([...base, d1])].join('');
}
