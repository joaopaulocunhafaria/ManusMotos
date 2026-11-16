import { Component, computed, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { FormaPagamento, StatusOrdemServico } from '@manus/shared';
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
import { saldoRestante, valorParcela } from '../../_metodos/ordem-servico';
import { OrdemServicoDetalhada } from '../../_modelos/ordem-servico.model';
import { OrdemServicoService } from '../../_servicos/ordem-servico.service';

/** Página `/administracao/ordem-servico/:id`: versão interna completa + versão do cliente. */
@Component({
	selector: 'app-detalhe-ordem-servico',
	standalone: false,
	templateUrl: './detalhe-ordem-servico.component.html',
	providers: [ConfirmationService],
})
export class DetalheOrdemServicoComponent implements OnInit {
	@ViewChild('cartaoCliente') private cartaoCliente?: ElementRef<HTMLElement>;

	public readonly labelStatus = LABEL_STATUS;
	public readonly severidadeStatus = SEVERIDADE_STATUS;

	public ordem = signal<OrdemServicoDetalhada | null>(null);
	public estado = signal<EstadoTela>('carregando');
	public alterandoStatus = signal(false);
	public versaoClienteAberta = signal(false);
	public gerandoImagem = signal(false);
	public imagem = signal<File | null>(null);

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

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private ordemServicoService: OrdemServicoService,
		private messageService: MessageService,
		private confirmationService: ConfirmationService,
		private temaService: TemaService,
	) {
		this.id = this.route.snapshot.paramMap.get('id')!;
	}

	ngOnInit(): void {
		this.carregar();
	}

	public carregar(): void {
		this.estado.set('carregando');
		this.ordemServicoService.buscarPorId(this.id).subscribe({
			next: (ordem) => {
				this.ordem.set(ordem);
				this.estado.set('carregado');
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
			next: () => {
				this.alterandoStatus.set(false);
				this.ordem.update((ordem) => (ordem ? { ...ordem, status } : ordem));
				this.messageService.add({ severity: 'success', summary: `Status: ${LABEL_STATUS[status]}.` });
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
			const opcoes = { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true, cacheBust: true };
			// O Safari às vezes devolve a 1ª captura incompleta: a primeira chamada só "aquece".
			await toBlob(elemento, opcoes);
			const blob = await toBlob(elemento, opcoes);
			if (!blob) throw new Error('Falha ao gerar a imagem.');
			this.imagem.set(new File([blob], `orcamento-os-${ordem.number}.png`, { type: 'image/png' }));
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
				await navigator.share({ files: [arquivo], title: `Orçamento OS #${this.ordem()?.number}` });
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
		document.title = `Orçamento OS #${this.ordem()?.number}`;
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
