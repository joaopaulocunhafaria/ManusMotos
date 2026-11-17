import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Peca } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { formatarAnos } from '../../_metodos/margem';
import { EstoqueService } from '../../_servicos/estoque.service';

/** Página `/administracao/estoque`. */
@Component({
	selector: 'app-listagem-estoque',
	standalone: false,
	templateUrl: './listagem-estoque.component.html',
})
export class ListagemEstoqueComponent implements OnInit, OnDestroy {
	public pecas = signal<Peca[]>([]);
	public total = signal(0);
	public estado = signal<EstadoTela>('carregando');
	public carregandoMais = signal(false);
	/** Peças com ajuste de quantidade em andamento (botões desabilitados). */
	public ajustando = signal<ReadonlySet<string>>(new Set());
	public busca = '';

	public readonly formatarAnos = formatarAnos;

	private pagina = 0;
	private temporizadorBusca?: ReturnType<typeof setTimeout>;

	constructor(
		private router: Router,
		private estoqueService: EstoqueService,
		private messageService: MessageService,
	) {}

	ngOnInit(): void {
		this.carregar();
	}

	ngOnDestroy(): void {
		clearTimeout(this.temporizadorBusca);
	}

	public carregar(): void {
		this.pagina = 0;
		this.estado.set('carregando');
		this.estoqueService.buscarPaginado(0, this.busca).subscribe({
			next: ({ itens, total }) => {
				this.pecas.set(itens);
				this.total.set(total);
				this.estado.set(itens.length ? 'carregado' : 'vazio');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public carregarMais(): void {
		this.carregandoMais.set(true);
		this.estoqueService.buscarPaginado(this.pagina + 1, this.busca).subscribe({
			next: ({ itens, total }) => {
				this.pagina++;
				this.pecas.update((atuais) => [...atuais, ...itens]);
				this.total.set(total);
				this.carregandoMais.set(false);
			},
			error: (erro: unknown) => {
				this.carregandoMais.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível carregar mais peças.') });
			},
		});
	}

	public aoDigitarBusca(valor: string): void {
		this.busca = valor;
		clearTimeout(this.temporizadorBusca);
		this.temporizadorBusca = setTimeout(() => this.carregar(), 500);
	}

	public abrirNova(): void {
		this.router.navigate(['/administracao/estoque/nova']);
	}

	public ajustarQuantidade(peca: Peca, delta: number): void {
		this.ajustando.update((ids) => new Set(ids).add(peca.id));
		const concluir = () =>
			this.ajustando.update((ids) => {
				const restantes = new Set(ids);
				restantes.delete(peca.id);
				return restantes;
			});
		this.estoqueService.ajustarQuantidade(peca.id, delta).subscribe({
			next: (atualizada) => {
				this.pecas.update((pecas) => pecas.map((p) => (p.id === atualizada.id ? atualizada : p)));
				concluir();
			},
			error: (erro: unknown) => {
				concluir();
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível alterar a quantidade.') });
			},
		});
	}

	public severidadeMargem(peca: Peca): 'success' | 'danger' | 'secondary' {
		if (peca.profit_margin === null) return 'secondary';
		return peca.profit_margin < 0 ? 'danger' : 'success';
	}
}
