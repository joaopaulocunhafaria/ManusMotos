import { PostgrestError } from '@supabase/supabase-js';
import { from, map, Observable } from 'rxjs';

/**
 * Converte uma chamada do Supabase (Promise `{ data, error }`) em Observable,
 * emitindo `data` ou lançando `error` — mantém o padrão `subscribe({ next, error })`.
 */
export function deSupabase<T>(consulta: PromiseLike<{ data: T | null; error: PostgrestError | Error | null }>): Observable<T> {
	return from(consulta).pipe(
		map(({ data, error }) => {
			if (error) throw error;
			return data as T;
		}),
	);
}

/** Código do erro do Postgres/PostgREST (`23505` = valor duplicado, `23503` = registro em uso…). */
export function codigoErro(erro: unknown): string | null {
	return erro && typeof erro === 'object' && 'code' in erro && typeof erro.code === 'string' ? erro.code : null;
}

/** Mensagem amigável a partir de um erro do Supabase. */
export function mensagemErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
	const codigo = codigoErro(erro);
	if (codigo === '23505') return 'Já existe um cadastro com esses dados.';
	if (codigo === '23503') return 'Este registro está em uso e não pode ser removido.';
	if (codigo?.startsWith('23')) return padrao;
	if (erro && typeof erro === 'object' && 'message' in erro && typeof erro.message === 'string') return erro.message;
	return padrao;
}
