import { Injectable, signal } from '@angular/core';
import type { DesignSettings, DesignSettingsUpdate } from '@manus/shared';
import { palette, updatePreset, updatePrimaryPalette } from '@primeng/themes';
import { Observable, tap } from 'rxjs';
import { deSupabase } from '../utils/_metodos/supabase';
import {
	aplicarVariaveisCss,
	escalaRaio,
	fontePorValor,
	IDENTIDADE_PADRAO,
	IdentidadeVisual,
	urlGoogleFonts,
} from '../utils/_metodos/tema';
import { SupabaseService } from './supabase.service';

const CHAVE_CACHE = 'manus.identidade-visual';
const ID_LINK_FONTE = 'fonte-tema';

/** Identidade visual da instância: lê/grava `design_settings` e aplica cores, fonte e título no app. */
@Injectable({
	providedIn: 'root',
})
export class TemaService {
	/** Identidade em uso (cache local até o banco responder). */
	public readonly config = signal<IdentidadeVisual>(IDENTIDADE_PADRAO);

	constructor(private supabaseService: SupabaseService) {}

	public buscar(): Observable<DesignSettings> {
		return deSupabase(this.supabaseService.client.from('design_settings').select('*').eq('id', 1).single());
	}

	public atualizar(dados: DesignSettingsUpdate): Observable<DesignSettings> {
		return deSupabase<DesignSettings>(
			this.supabaseService.client.from('design_settings').update(dados).eq('id', 1).select().single(),
		).pipe(tap((config) => this.aplicar(config)));
	}

	/** Chamado no boot: aplica o cache na hora (sem "piscar") e atualiza com o banco em segundo plano. */
	public inicializar(): void {
		const cache = this.lerCache();
		if (cache) this.aplicar(cache);
		this.buscar().subscribe({
			next: (config) => this.aplicar(config),
			error: () => {
				// Sem rede/banco: mantém cache ou padrão.
			},
		});
	}

	public aplicar(dados: IdentidadeVisual | DesignSettings): void {
		const config = this.somenteIdentidade(dados);
		this.config.set(config);

		aplicarVariaveisCss(config);
		updatePrimaryPalette(palette(config.primary_color));
		updatePreset({ primitive: { borderRadius: escalaRaio(config.border_radius) } });
		this.carregarFonte(config.font_family);

		document.title = config.shop_name;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.primary_color);
		document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', config.shop_name);

		this.salvarCache(config);
	}

	/** Injeta só a fonte escolhida do Google Fonts; a fonte do sistema não baixa nada. */
	private carregarFonte(valor: string): void {
		const url = urlGoogleFonts(fontePorValor(valor));
		let link = document.getElementById(ID_LINK_FONTE) as HTMLLinkElement | null;
		if (!url) {
			link?.remove();
			return;
		}
		if (!link) {
			link = document.createElement('link');
			link.id = ID_LINK_FONTE;
			link.rel = 'stylesheet';
			document.head.appendChild(link);
		}
		if (link.href !== url) link.href = url;
	}

	private somenteIdentidade(dados: IdentidadeVisual | DesignSettings): IdentidadeVisual {
		const config = { ...IDENTIDADE_PADRAO };
		for (const chave of Object.keys(IDENTIDADE_PADRAO) as (keyof IdentidadeVisual)[]) {
			if (dados[chave] !== undefined) (config as Record<string, unknown>)[chave] = dados[chave];
		}
		return config;
	}

	private lerCache(): IdentidadeVisual | null {
		try {
			const texto = localStorage.getItem(CHAVE_CACHE);
			return texto ? this.somenteIdentidade(JSON.parse(texto)) : null;
		} catch {
			return null;
		}
	}

	private salvarCache(config: IdentidadeVisual): void {
		try {
			localStorage.setItem(CHAVE_CACHE, JSON.stringify(config));
		} catch {
			// Storage indisponível (aba privada): ignora.
		}
	}
}
