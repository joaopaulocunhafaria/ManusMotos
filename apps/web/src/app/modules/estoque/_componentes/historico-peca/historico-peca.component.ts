import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import type { MovimentoPeca, Peca, TipoMovimentoPeca } from '@manus/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { formatarDataIso } from '../../../../utils/_metodos/datas';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { TIPO_MOVIMENTO_LABEL, TIPO_MOVIMENTO_SEVERIDADE } from '../../_enums/tipo-movimento';
import { EstoqueService } from '../../_servicos/estoque.service';

/**
 * Histórico de movimentações (compras, vendas, ajustes) de uma peça, com estorno de venda.
 * Precisa de um `ConfirmationService` + `p-confirmDialog` na página.
 */
@Component({
	selector: 'app-historico-peca',
	standalone: false,
	templateUrl: './historico-peca.component.html',
})
export class HistoricoPecaComponent implements OnChanges {
	@Input({ required: true }) pecaId!: string;
	/** Peça atualizada depois de um estorno. */
	@Output() estornada = new EventEmitter<Peca>();

	public movimentos = signal<MovimentoPeca[]>([]);
	public total = signal(0);
	public estado = signal<EstadoTela>('carregando');
	public carregandoMais = signal(false);
	public estornando = signal<string | null>(null);

	public readonly formatarData = formatarDataIso;

	private pagina = 0;

	constructor(
		private estoqueService: EstoqueService,
		private messageService: MessageService,
		private confirmationService: ConfirmationService,
	) {}

	ngOnChanges(): void {
		this.carregar();
	}

	public carregar(): void {
		this.pagina = 0;
		this.estado.set('carregando');
		this.estoqueService.buscarMovimentos(this.pecaId, 0).subscribe({
			next: ({ itens, total }) => {
				this.movimentos.set(itens);
				this.total.set(total);
				this.estado.set(itens.length ? 'carregado' : 'vazio');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public carregarMais(): void {
		this.carregandoMais.set(true);
		this.estoqueService.buscarMovimentos(this.pecaId, this.pagina + 1).subscribe({
			next: ({ itens, total }) => {
				this.pagina++;
				this.movimentos.update((atuais) => [...atuais, ...itens]);
				this.total.set(total);
				this.carregandoMais.set(false);
			},
			error: (erro: unknown) => {
				this.carregandoMais.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível carregar o histórico.') });
			},
		});
	}

	public rotulo(tipo: string): string {
		return TIPO_MOVIMENTO_LABEL[tipo as TipoMovimentoPeca] ?? tipo;
	}

	public severidade(tipo: string): 'info' | 'success' | 'secondary' {
		return TIPO_MOVIMENTO_SEVERIDADE[tipo as TipoMovimentoPeca] ?? 'secondary';
	}

	public confirmarEstorno(movimento: MovimentoPeca): void {
		this.confirmationService.confirm({
			header: 'Estornar venda',
			message: `A venda de ${movimento.quantity} ${movimento.quantity === 1 ? 'unidade' : 'unidades'} será apagada e as unidades voltam ao estoque.`,
			acceptLabel: 'Estornar',
			rejectLabel: 'Voltar',
			acceptButtonProps: { severity: 'danger' },
			rejectButtonProps: { variant: 'outlined' },
			accept: () => this.estornar(movimento),
		});
	}

	private estornar(movimento: MovimentoPeca): void {
		this.estornando.set(movimento.id);
		this.estoqueService.estornarVenda(movimento.id).subscribe({
			next: (peca) => {
				this.estornando.set(null);
				this.messageService.add({ severity: 'success', summary: 'Venda estornada.' });
				if (peca) this.estornada.emit(peca);
				this.carregar();
			},
			error: (erro: unknown) => {
				this.estornando.set(null);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível estornar a venda.') });
			},
		});
	}
}
