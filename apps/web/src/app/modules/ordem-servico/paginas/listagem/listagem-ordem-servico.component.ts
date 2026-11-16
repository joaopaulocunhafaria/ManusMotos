import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { StatusOrdemServico } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { OPCOES_STATUS } from '../../_enums/ordem-servico.enums';
import { OrdemServicoResumo } from '../../_modelos/ordem-servico.model';
import { OrdemServicoService } from '../../_servicos/ordem-servico.service';

@Component({
	selector: 'app-listagem-ordem-servico',
	standalone: false,
	templateUrl: './listagem-ordem-servico.component.html',
})
export class ListagemOrdemServicoComponent implements OnInit, OnDestroy {
	public readonly opcoesStatus = OPCOES_STATUS;

	public ordens = signal<OrdemServicoResumo[]>([]);
	public total = signal(0);
	public estado = signal<EstadoTela>('carregando');
	public carregandoMais = signal(false);
	public busca = '';
	public status: StatusOrdemServico | null = null;

	private pagina = 0;
	private temporizadorBusca?: ReturnType<typeof setTimeout>;

	constructor(
		private ordemServicoService: OrdemServicoService,
		private messageService: MessageService,
		private router: Router,
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
		this.ordemServicoService.buscarPaginado(0, this.busca, this.status).subscribe({
			next: ({ itens, total }) => {
				this.ordens.set(itens);
				this.total.set(total);
				this.estado.set(itens.length ? 'carregado' : 'vazio');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public carregarMais(): void {
		this.carregandoMais.set(true);
		this.ordemServicoService.buscarPaginado(this.pagina + 1, this.busca, this.status).subscribe({
			next: ({ itens, total }) => {
				this.pagina++;
				this.ordens.update((atuais) => [...atuais, ...itens]);
				this.total.set(total);
				this.carregandoMais.set(false);
			},
			error: (erro: unknown) => {
				this.carregandoMais.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível carregar mais ordens.') });
			},
		});
	}

	public aoDigitarBusca(valor: string): void {
		this.busca = valor;
		clearTimeout(this.temporizadorBusca);
		this.temporizadorBusca = setTimeout(() => this.carregar(), 500);
	}

	public aoMudarStatus(): void {
		this.carregar();
	}

	public novaOrdem(): void {
		this.router.navigate(['/administracao/ordem-servico/nova']);
	}
}
