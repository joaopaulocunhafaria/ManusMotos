import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { ClienteComMotos } from '../../_modelos/cliente.model';
import { ClientesService } from '../../_servicos/clientes.service';

@Component({
	selector: 'app-listagem-clientes',
	standalone: false,
	templateUrl: './listagem-clientes.component.html',
})
export class ListagemClientesComponent implements OnInit, OnDestroy {
	public clientes = signal<ClienteComMotos[]>([]);
	public total = signal(0);
	public estado = signal<EstadoTela>('carregando');
	public carregandoMais = signal(false);
	public busca = '';

	private pagina = 0;
	private temporizadorBusca?: ReturnType<typeof setTimeout>;

	constructor(
		private clientesService: ClientesService,
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
		this.clientesService.buscarPaginado(0, this.busca).subscribe({
			next: ({ itens, total }) => {
				this.clientes.set(itens);
				this.total.set(total);
				this.estado.set(itens.length ? 'carregado' : 'vazio');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public carregarMais(): void {
		this.carregandoMais.set(true);
		this.clientesService.buscarPaginado(this.pagina + 1, this.busca).subscribe({
			next: ({ itens, total }) => {
				this.pagina++;
				this.clientes.update((atuais) => [...atuais, ...itens]);
				this.total.set(total);
				this.carregandoMais.set(false);
			},
			error: (erro: unknown) => {
				this.carregandoMais.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível carregar mais clientes.') });
			},
		});
	}

	public aoDigitarBusca(valor: string): void {
		this.busca = valor;
		clearTimeout(this.temporizadorBusca);
		this.temporizadorBusca = setTimeout(() => this.carregar(), 500);
	}

	public abrir(cliente?: ClienteComMotos): void {
		this.router.navigate(['/administracao/clientes', cliente ? cliente.id : 'novo']);
	}
}
