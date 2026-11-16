import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { ClienteComMotos } from '../../_modelos/cliente.model';
import { ClientesService } from '../../_servicos/clientes.service';

/** Página `/administracao/clientes/novo` e `/administracao/clientes/:id`. */
@Component({
	selector: 'app-formulario-cliente-pagina',
	standalone: false,
	templateUrl: './formulario-cliente-pagina.component.html',
})
export class FormularioClientePaginaComponent implements OnInit {
	public cliente = signal<ClienteComMotos | null>(null);
	public estado = signal<EstadoTela>('carregando');
	private readonly id: string | null;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private clientesService: ClientesService,
	) {
		this.id = this.route.snapshot.paramMap.get('id');
	}

	ngOnInit(): void {
		this.carregar();
	}

	public carregar(): void {
		if (!this.id) {
			this.estado.set('carregado');
			return;
		}
		this.estado.set('carregando');
		this.clientesService.buscarPorId(this.id).subscribe({
			next: (cliente) => {
				this.cliente.set(cliente);
				this.estado.set('carregado');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public aoSalvar(cliente: ClienteComMotos): void {
		if (!this.id) this.router.navigate(['/administracao/clientes', cliente.id], { replaceUrl: true });
		else this.cliente.set(cliente);
	}

	public voltar(): void {
		this.router.navigate(['/administracao/clientes']);
	}
}
