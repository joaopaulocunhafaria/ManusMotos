import { Component, computed, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { DesignSettingsUpdate } from '@manus/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { TemaService } from '../../../../services/tema.service';
import { corHex, telefone } from '../../../../utils/_formularios/validadores';
import { reduzirImagem, TIPOS_IMAGEM_LOGO } from '../../../../utils/_metodos/imagem';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import {
	contrasteWcag,
	FONTES,
	fontePorValor,
	IDENTIDADE_PADRAO,
	IdentidadeVisual,
	RAIOS,
	raioParaPx,
} from '../../../../utils/_metodos/tema';
import { EstadoTela } from '../../../../utils/_models/estado-tela';

type CampoCor = 'primary_color' | 'secondary_color' | 'background_color' | 'surface_color' | 'text_color' | 'border_color';

interface CorConfiguravel {
	campo: CampoCor;
	label: string;
	descricao: string;
}

@Component({
	selector: 'app-identidade-visual',
	standalone: false,
	templateUrl: './identidade-visual.component.html',
	styleUrl: './identidade-visual.component.scss',
	providers: [ConfirmationService],
})
export class IdentidadeVisualComponent implements OnInit, OnDestroy {
	@ViewChild('arquivoLogo') private arquivoLogo?: ElementRef<HTMLInputElement>;

	public readonly tiposLogo = TIPOS_IMAGEM_LOGO.join(',');
	public readonly fontes = FONTES;
	public readonly raios = RAIOS;
	public readonly cores: CorConfiguravel[] = [
		{ campo: 'primary_color', label: 'Primária', descricao: 'Botões, links e destaques' },
		{ campo: 'secondary_color', label: 'Secundária', descricao: 'Subtítulos e elementos de apoio' },
		{ campo: 'background_color', label: 'Fundo', descricao: 'Fundo das telas' },
		{ campo: 'surface_color', label: 'Superfície', descricao: 'Topo, barra inferior e cards' },
		{ campo: 'text_color', label: 'Texto', descricao: 'Textos principais' },
		{ campo: 'border_color', label: 'Borda', descricao: 'Linhas e contornos' },
	];

	public formulario: FormGroup;
	public estado = signal<EstadoTela>('carregando');
	public salvando = signal(false);
	public processandoLogo = signal(false);
	/** Valores atuais do formulário, para a pré-visualização ao vivo. */
	public previa = signal<IdentidadeVisual>(IDENTIDADE_PADRAO);

	public readonly avisosContraste = computed(() => {
		const p = this.previa();
		if (!this.coresValidas(p)) return [];
		const avisos: string[] = [];
		if (contrasteWcag(p.text_color, p.background_color) < 4.5) avisos.push('O texto pode ficar difícil de ler sobre a cor de fundo.');
		if (contrasteWcag(p.text_color, p.surface_color) < 4.5) avisos.push('O texto pode ficar difícil de ler sobre a cor de superfície.');
		if (contrasteWcag('#ffffff', p.primary_color) < 3)
			avisos.push('O texto branco dos botões pode ficar difícil de ler sobre a cor primária.');
		return avisos;
	});

	private assinaturaFormulario?: Subscription;

	constructor(
		private formBuilder: FormBuilder,
		private temaService: TemaService,
		private messageService: MessageService,
		private confirmationService: ConfirmationService,
	) {
		const cor = (valor: string) => [valor, [Validators.required, corHex()]];
		this.formulario = this.formBuilder.nonNullable.group({
			shop_name: ['', [Validators.required, Validators.maxLength(60)]],
			subtitle: ['', [Validators.maxLength(120)]],
			phone: ['', [telefone()]],
			whatsapp: ['', [telefone()]],
			instagram: ['', [Validators.pattern(/^\s*@?[A-Za-z0-9._]{1,30}\s*$/)]],
			logo: this.formBuilder.control<string | null>(null),
			primary_color: cor(IDENTIDADE_PADRAO.primary_color),
			secondary_color: cor(IDENTIDADE_PADRAO.secondary_color),
			background_color: cor(IDENTIDADE_PADRAO.background_color),
			surface_color: cor(IDENTIDADE_PADRAO.surface_color),
			text_color: cor(IDENTIDADE_PADRAO.text_color),
			border_color: cor(IDENTIDADE_PADRAO.border_color),
			font_family: [IDENTIDADE_PADRAO.font_family, [Validators.required]],
			border_radius: [IDENTIDADE_PADRAO.border_radius, [Validators.required]],
		});
	}

	ngOnInit(): void {
		this.assinaturaFormulario = this.formulario.valueChanges.subscribe(() => this.previa.set(this.formulario.getRawValue()));
		this.carregar();
	}

	ngOnDestroy(): void {
		this.assinaturaFormulario?.unsubscribe();
	}

	public carregar(): void {
		this.estado.set('carregando');
		this.temaService.buscar().subscribe({
			next: (config) => {
				this.preencher(config);
				this.estado.set('carregado');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			this.messageService.add({ severity: 'warn', summary: 'Confira os campos destacados.' });
			return;
		}
		this.salvando.set(true);
		this.temaService.atualizar(this.normalizar(this.formulario.getRawValue())).subscribe({
			next: (config) => {
				this.salvando.set(false);
				this.preencher(config);
				this.messageService.add({ severity: 'success', summary: 'Identidade visual salva.' });
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar.') });
			},
		});
	}

	/** Volta as cores, fonte e arredondamento para o padrão (mantém título e contato). Só grava ao salvar. */
	public restaurarPadrao(): void {
		this.confirmationService.confirm({
			header: 'Restaurar padrão',
			message: 'As cores, a fonte e o arredondamento voltam ao padrão. Título e contato são mantidos. Você ainda precisa salvar.',
			acceptLabel: 'Restaurar',
			rejectLabel: 'Cancelar',
			rejectButtonProps: { variant: 'outlined' },
			accept: () => {
				const { shop_name, subtitle, phone, whatsapp, instagram, logo, ...visual } = IDENTIDADE_PADRAO;
				this.formulario.patchValue(visual);
				this.formulario.markAsDirty();
			},
		});
	}

	// ---------- Logo ----------

	public escolherLogo(): void {
		this.arquivoLogo?.nativeElement.click();
	}

	/** Reduz a imagem no aparelho e coloca no formulário (só grava ao salvar). */
	public async aoEscolherLogo(evento: Event): Promise<void> {
		const input = evento.target as HTMLInputElement;
		const arquivo = input.files?.[0];
		input.value = ''; // permite escolher o mesmo arquivo de novo
		if (!arquivo) return;
		this.processandoLogo.set(true);
		try {
			const logo = await reduzirImagem(arquivo);
			this.formulario.patchValue({ logo });
			this.formulario.markAsDirty();
		} catch (erro) {
			this.messageService.add({
				severity: 'error',
				summary: erro instanceof Error ? erro.message : 'Não foi possível usar esta imagem.',
			});
		} finally {
			this.processandoLogo.set(false);
		}
	}

	public removerLogo(): void {
		this.formulario.patchValue({ logo: null });
		this.formulario.markAsDirty();
	}

	public invalido(campo: string): boolean {
		const controle = this.formulario.get(campo);
		return !!controle && controle.invalid && (controle.touched || controle.dirty);
	}

	public raioPrevia(): string {
		return raioParaPx(this.previa().border_radius);
	}

	public fontePrevia(): string {
		return fontePorValor(this.previa().font_family).css;
	}

	private preencher(config: IdentidadeVisual): void {
		this.formulario.reset({
			...config,
			subtitle: config.subtitle ?? '',
			phone: config.phone ?? '',
			whatsapp: config.whatsapp ?? '',
			instagram: config.instagram ?? '',
		});
		this.previa.set(this.formulario.getRawValue());
	}

	private normalizar(valores: IdentidadeVisual): DesignSettingsUpdate {
		const textoOuNulo = (valor: string | null) => (valor && valor.trim() ? valor.trim() : null);
		return {
			...valores,
			shop_name: valores.shop_name.trim(),
			subtitle: textoOuNulo(valores.subtitle),
			phone: textoOuNulo(valores.phone),
			whatsapp: textoOuNulo(valores.whatsapp),
			instagram: textoOuNulo((valores.instagram ?? '').trim().replace(/^@/, '')),
			logo: valores.logo || null,
			primary_color: valores.primary_color.toLowerCase(),
			secondary_color: valores.secondary_color.toLowerCase(),
			background_color: valores.background_color.toLowerCase(),
			surface_color: valores.surface_color.toLowerCase(),
			text_color: valores.text_color.toLowerCase(),
			border_color: valores.border_color.toLowerCase(),
		};
	}

	private coresValidas(config: IdentidadeVisual): boolean {
		return this.cores.every(({ campo }) => /^#[0-9a-fA-F]{6}$/.test(config[campo]));
	}
}
