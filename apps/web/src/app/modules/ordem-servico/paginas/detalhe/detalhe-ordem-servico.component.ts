import { Component, computed, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { FormaPagamento, OrdemServico, StatusOrdemServico } from '@manus/shared';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { TemaService } from '../../../../services/tema.service';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { linkWhatsapp } from '../../../../utils/_metodos/texto';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import {
	LABEL_FORMA_PAGAMENTO,
	LABEL_STATUS,
	SEVERIDADE_STATUS,
	STATUS_CANCELAVEIS,
	TransicaoStatus,
	TRANSICOES_STATUS,
} from '../../_enums/ordem-servico.enums';
import {
	formatarCronometro,
	formatarMinutos,
	juntarHorasMinutos,
	MAXIMO_TEMPO_GASTO_SEGUNDOS,
	progressoTrabalho,
	saldoRestante,
	tempoGastoSegundos,
	valorParcela,
} from '../../_metodos/ordem-servico';
import { OrdemServicoDetalhada } from '../../_modelos/ordem-servico.model';
import { OrdemServicoService } from '../../_servicos/ordem-servico.service';

/** Status em que o cronômetro não pode ser ligado (o banco pausa ao entrar neles). */
const STATUS_SEM_CRONOMETRO: StatusOrdemServico[] = ['completed', 'rejected', 'canceled'];

/** Página `/administracao/ordem-servico/:id`: versão interna completa, cronômetro de trabalho e versão do cliente. */
@Component({
	selector: 'app-detalhe-ordem-servico',
	standalone: false,
	templateUrl: './detalhe-ordem-servico.component.html',
	providers: [ConfirmationService],
})
export class DetalheOrdemServicoComponent implements OnInit, OnDestroy {
	@ViewChild('cartaoCliente') private cartaoCliente?: ElementRef<HTMLElement>;

	public readonly labelStatus = LABEL_STATUS;
	public readonly severidadeStatus = SEVERIDADE_STATUS;

	public ordem = signal<OrdemServicoDetalhada | null>(null);
	public estado = signal<EstadoTela>('carregando');
	public alterandoStatus = signal(false);
	public versaoClienteAberta = signal(false);
	public gerandoImagem = signal(false);
	public imagem = signal<File | null>(null);

	/** Relógio local que faz o cronômetro andar na tela (o tempo oficial vem do banco). */
	public agora = signal(Date.now());
	public salvandoCronometro = signal(false);
	public ajusteAberto = signal(false);
	public salvandoAjuste = signal(false);
	public formularioAjuste: FormGroup;

	public readonly status = computed(() => (this.ordem()?.status ?? 'draft') as StatusOrdemServico);
	public readonly transicoes = computed<TransicaoStatus[]>(() => TRANSICOES_STATUS[this.status()]);
	public readonly formaPagamento = computed(() => {
		const forma = this.ordem()?.payment_method as FormaPagamento | undefined;
		return forma ? LABEL_FORMA_PAGAMENTO[forma] : '';
	});
	public readonly saldo = computed(() => {
		const ordem = this.ordem();
		return ordem ? saldoRestante(ordem.total, ordem.down_payment) : 0;
	});
	public readonly parcela = computed(() => {
		const ordem = this.ordem();
		return ordem ? valorParcela(ordem.total, ordem.down_payment, ordem.installments) : 0;
	});
	public readonly cronometroLigado = computed(() => !!this.ordem()?.work_started_at);
	public readonly tempoGasto = computed(() => {
		const ordem = this.ordem();
		return ordem ? tempoGastoSegundos(ordem, this.agora()) : 0;
	});
	public readonly cronometro = computed(() => formatarCronometro(this.tempoGasto()));
	public readonly estimativa = computed(() => formatarMinutos(this.ordem()?.work_estimate_minutes));
	public readonly progresso = computed(() => progressoTrabalho(this.tempoGasto(), this.ordem()?.work_estimate_minutes));
	public readonly podeLigarCronometro = computed(() => !STATUS_SEM_CRONOMETRO.includes(this.status()));
	public readonly itensMenu = computed<MenuItem[]>(() => [
		{ label: 'Editar', icon: 'pi pi-pencil', command: () => this.editar() },
		...(STATUS_CANCELAVEIS.includes(this.status())
			? [
					{
						label: 'Cancelar OS',
						icon: 'pi pi-ban',
						command: () => this.confirmarStatus({ status: 'canceled', label: 'Cancelar OS', icone: '' }),
					},
				]
			: []),
		{ separator: true },
		{ label: 'Excluir', icon: 'pi pi-trash', styleClass: 'text-red-600', command: () => this.confirmarExclusao() },
	]);

	private readonly id: string;
	private intervaloRelogio: ReturnType<typeof setInterval> | null = null;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private ordemServicoService: OrdemServicoService,
		private messageService: MessageService,
		private confirmationService: ConfirmationService,
		private temaService: TemaService,
		private formBuilder: FormBuilder,
	) {
		this.id = this.route.snapshot.paramMap.get('id')!;
		this.formularioAjuste = this.formBuilder.group({
			horas: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(1000)]),
			minutos: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(59)]),
		});
	}

	ngOnInit(): void {
		this.carregar();
	}

	ngOnDestroy(): void {
		this.pararRelogio();
	}

	public carregar(): void {
		this.estado.set('carregando');
		this.ordemServicoService.buscarPorId(this.id).subscribe({
			next: (ordem) => {
				this.ordem.set(ordem);
				this.estado.set('carregado');
				this.sincronizarRelogio();
			},
			error: () => this.estado.set('erro'),
		});
	}

	public voltar(): void {
		this.router.navigate(['/administracao/ordem-servico']);
	}

	public editar(): void {
		this.router.navigate(['/administracao/ordem-servico', this.id, 'editar']);
	}

	public linkWhatsappCliente(): string {
		const ordem = this.ordem();
		return ordem ? linkWhatsapp(ordem.clients.phone) : '';
	}

	// ---------- Status ----------

	public aoEscolherTransicao(transicao: TransicaoStatus): void {
		if (transicao.confirmar) this.confirmarStatus(transicao);
		else this.alterarStatus(transicao.status);
	}

	public alterarStatus(status: StatusOrdemServico): void {
		this.alterandoStatus.set(true);
		this.ordemServicoService.atualizarStatus(this.id, status).subscribe({
			next: ({ completed_at }) => {
				this.alterandoStatus.set(false);
				this.ordem.update((ordem) => (ordem ? { ...ordem, status, completed_at } : ordem));
				this.messageService.add({ severity: 'success', summary: `Status: ${LABEL_STATUS[status]}.` });
				// Concluir/recusar/cancelar pausa o cronômetro no banco: traz o tempo acumulado.
				if (STATUS_SEM_CRONOMETRO.includes(status) && this.cronometroLigado()) this.recarregarCronometro();
			},
			error: (erro: unknown) => {
				this.alterandoStatus.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível alterar o status.') });
			},
		});
	}

	private confirmarStatus(transicao: TransicaoStatus): void {
		this.confirmationService.confirm({
			header: transicao.label,
			message: `Alterar o status da OS para "${LABEL_STATUS[transicao.status]}"?`,
			acceptLabel: 'Confirmar',
			rejectLabel: 'Voltar',
			rejectButtonProps: { variant: 'outlined' },
			accept: () => this.alterarStatus(transicao.status),
		});
	}

	private confirmarExclusao(): void {
		this.confirmationService.confirm({
			header: 'Excluir ordem de serviço',
			message: 'A OS e seus serviços serão apagados definitivamente. Prefira "Cancelar OS" para manter o histórico.',
			acceptLabel: 'Excluir',
			rejectLabel: 'Voltar',
			acceptButtonProps: { severity: 'danger' },
			rejectButtonProps: { variant: 'outlined' },
			accept: () =>
				this.ordemServicoService.excluir(this.id).subscribe({
					next: () => {
						this.messageService.add({ severity: 'success', summary: 'Ordem de serviço excluída.' });
						this.voltar();
					},
					error: (erro: unknown) =>
						this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível excluir.') }),
				}),
		});
	}

	// ---------- Cronômetro de trabalho ----------

	/** Play/pause. O banco registra o horário (now()), então trocar de aparelho não perde o tempo. */
	public alternarCronometro(): void {
		const ligado = this.cronometroLigado();
		const acao = ligado ? this.ordemServicoService.pausarCronometro(this.id) : this.ordemServicoService.iniciarCronometro(this.id);
		this.salvandoCronometro.set(true);
		acao.subscribe({
			next: (linha) => {
				this.salvandoCronometro.set(false);
				this.aplicarCronometro(linha);
			},
			error: (erro: unknown) => {
				this.salvandoCronometro.set(false);
				const padrao = ligado ? 'Não foi possível pausar o cronômetro.' : 'Não foi possível iniciar o cronômetro.';
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, padrao) });
			},
		});
	}

	/** Abre o ajuste manual já preenchido com o tempo atual (em minutos inteiros). */
	public abrirAjuste(): void {
		const minutos = Math.floor(this.tempoGasto() / 60);
		this.formularioAjuste.reset({ horas: Math.floor(minutos / 60), minutos: minutos % 60 });
		this.ajusteAberto.set(true);
	}

	public salvarAjuste(): void {
		const { horas, minutos } = this.formularioAjuste.getRawValue();
		const totalMinutos = juntarHorasMinutos(horas, minutos) ?? 0;
		if (this.formularioAjuste.invalid || totalMinutos * 60 > MAXIMO_TEMPO_GASTO_SEGUNDOS) {
			this.formularioAjuste.markAllAsTouched();
			this.messageService.add({ severity: 'warn', summary: 'Use até 1000 h, com minutos de 0 a 59.' });
			return;
		}
		this.salvandoAjuste.set(true);
		this.ordemServicoService.ajustarTempo(this.id, totalMinutos * 60).subscribe({
			next: (linha) => {
				this.salvandoAjuste.set(false);
				this.ajusteAberto.set(false);
				this.aplicarCronometro(linha);
				this.messageService.add({ severity: 'success', summary: 'Tempo de trabalho ajustado.' });
			},
			error: (erro: unknown) => {
				this.salvandoAjuste.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível ajustar o tempo.') });
			},
		});
	}

	public ajusteInvalido(campo: 'horas' | 'minutos'): boolean {
		const controle = this.formularioAjuste.get(campo);
		return !!controle && controle.invalid && (controle.touched || controle.dirty);
	}

	private aplicarCronometro(linha: OrdemServico): void {
		this.ordem.update((ordem) =>
			ordem
				? {
						...ordem,
						work_seconds: linha.work_seconds,
						work_started_at: linha.work_started_at,
						work_estimate_minutes: linha.work_estimate_minutes,
					}
				: ordem,
		);
		this.sincronizarRelogio();
	}

	private recarregarCronometro(): void {
		this.ordemServicoService.buscarPorId(this.id).subscribe({
			next: (linha) => this.aplicarCronometro(linha),
			error: () => {
				// Mantém o que está na tela; o próximo carregamento corrige.
			},
		});
	}

	/** Só deixa o relógio rodando (1 s) enquanto o cronômetro está ligado: poupa CPU no aparelho. */
	private sincronizarRelogio(): void {
		this.agora.set(Date.now());
		if (this.cronometroLigado() && !this.intervaloRelogio) {
			this.intervaloRelogio = setInterval(() => this.agora.set(Date.now()), 1000);
		} else if (!this.cronometroLigado()) {
			this.pararRelogio();
		}
	}

	private pararRelogio(): void {
		if (this.intervaloRelogio) clearInterval(this.intervaloRelogio);
		this.intervaloRelogio = null;
	}

	// ---------- Versão do cliente ----------

	public abrirVersaoCliente(): void {
		this.imagem.set(null);
		this.versaoClienteAberta.set(true);
	}

	/**
	 * Gera o PNG assim que o painel abre: o Safari só permite `navigator.share` logo após o toque,
	 * então a imagem precisa estar pronta antes do clique em "Compartilhar".
	 */
	public async prepararImagem(): Promise<void> {
		const elemento = this.cartaoCliente?.nativeElement;
		const ordem = this.ordem();
		if (!elemento || !ordem) return;

		this.gerandoImagem.set(true);
		try {
			const { toBlob } = await import('html-to-image');
			const opcoes = { pixelRatio: 3, backgroundColor: '#ffffff', skipFonts: true, cacheBust: true };
			// O Safari às vezes devolve a 1ª captura incompleta: a primeira chamada só "aquece".
			await toBlob(elemento, opcoes);
			const blob = await toBlob(elemento, opcoes);
			if (!blob) throw new Error('Falha ao gerar a imagem.');
			this.imagem.set(new File([blob], `ordem-servico-${ordem.number}.png`, { type: 'image/png' }));
		} catch {
			this.messageService.add({ severity: 'error', summary: 'Não foi possível gerar a imagem.' });
		} finally {
			this.gerandoImagem.set(false);
		}
	}

	/** Abre o compartilhamento do sistema (WhatsApp no iPhone); sem suporte, baixa o PNG. */
	public async compartilharImagem(): Promise<void> {
		const arquivo = this.imagem();
		if (!arquivo) return;
		try {
			if (navigator.canShare?.({ files: [arquivo] })) {
				await navigator.share({ files: [arquivo], title: `Ordem de serviço nº ${this.ordem()?.number}` });
			} else {
				this.baixar(arquivo, arquivo.name);
			}
			this.sugerirMarcarEnviada();
		} catch (erro) {
			if (erro instanceof DOMException && erro.name === 'AbortError') return; // usuário fechou o compartilhamento
			this.baixar(arquivo, arquivo.name);
		}
	}

	/** Imprime só a versão do cliente (no iPhone: Imprimir → Compartilhar → salvar PDF). */
	public salvarPdf(): void {
		const elemento = this.cartaoCliente?.nativeElement;
		if (!elemento) return;
		document.querySelectorAll('.area-impressao').forEach((anterior) => anterior.remove());
		const area = document.createElement('div');
		area.className = 'area-impressao';
		area.appendChild(elemento.cloneNode(true));
		document.body.appendChild(area);
		const tituloOriginal = document.title;
		document.title = `Ordem de serviço nº ${this.ordem()?.number}`;
		const limpar = () => {
			area.remove();
			document.title = tituloOriginal;
			window.removeEventListener('afterprint', limpar);
		};
		window.addEventListener('afterprint', limpar);
		// Se o afterprint não disparar (Safari iOS), a área fica oculta na tela e é trocada na próxima impressão.
		window.print();
		this.sugerirMarcarEnviada();
	}

	/** Abre a conversa com o cliente no WhatsApp com uma mensagem pronta (para anexar a imagem/PDF). */
	public abrirWhatsapp(): void {
		const ordem = this.ordem();
		if (!ordem) return;
		const oficina = this.temaService.config().shop_name;
		const texto = `Olá, ${ordem.clients.name.split(' ')[0]}! Segue o orçamento da OS #${ordem.number} da ${oficina}. Pode me responder se aprova o serviço?`;
		window.open(linkWhatsapp(ordem.clients.phone, texto), '_blank', 'noopener');
	}

	private sugerirMarcarEnviada(): void {
		if (this.status() !== 'draft') return;
		this.confirmationService.confirm({
			header: 'Enviou ao cliente?',
			message: 'Marcar a OS como "Aguardando aprovação"?',
			acceptLabel: 'Sim, marcar',
			rejectLabel: 'Agora não',
			rejectButtonProps: { variant: 'outlined' },
			accept: () => this.alterarStatus('awaiting_approval'),
		});
	}

	private baixar(blob: Blob, nomeArquivo: string): void {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = nomeArquivo;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
}
