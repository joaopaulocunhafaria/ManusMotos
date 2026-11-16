/** Remove tudo que não for dígito. */
export function somenteDigitos(valor: string | null | undefined): string {
	return (valor ?? '').replace(/\D/g, '');
}

/** Placa em maiúsculas, sem hífen/espaços (formato gravado no banco). */
export function normalizarPlaca(valor: string | null | undefined): string {
	return (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00). Outros tamanhos voltam como vieram. */
export function formatarDocumento(valor: string | null | undefined): string {
	const d = somenteDigitos(valor);
	if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
	if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
	return valor ?? '';
}

/** Formata telefone (00) 0000-0000 ou (00) 00000-0000. */
export function formatarTelefone(valor: string | null | undefined): string {
	const d = somenteDigitos(valor);
	if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
	if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
	return valor ?? '';
}

/** Formata placa: antiga com hífen (ABC-1234); Mercosul sem hífen (ABC1D23). */
export function formatarPlaca(valor: string | null | undefined): string {
	const p = normalizarPlaca(valor);
	return /^[A-Z]{3}[0-9]{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

/** Link do WhatsApp (wa.me) para um telefone brasileiro. */
export function linkWhatsapp(telefone: string | null | undefined, texto?: string): string {
	const base = `https://wa.me/55${somenteDigitos(telefone)}`;
	return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
