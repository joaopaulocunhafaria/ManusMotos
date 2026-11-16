import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { Servico } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { campoInvalido } from '../../../../utils/_formularios/campos';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { ServicosService } from '../../_servicos/servicos.service';

@Component({
	selector: 'app-listagem-servicos',
	standalone: false,
	templateUrl: './listagem-servicos.component.html',
})
export class ListagemServicosComponent implements OnInit, OnDestroy {
	public servicos = signal<Servico[]>([]);
	public total = signal(0);
	public estado = signal<EstadoTela>('carregando');
	public carregandoMais = signal(false);
	public busca = '';

	public drawerAberto = signal(false);
	public emEdicao = signal<Servico | null>(null);
	public salvando = signal(false);
	public formulario: FormGroup;

	private pagina = 0;
	private temporizadorBusca?: ReturnType<typeof setTimeout>;

	constructor(
		private formBuilder: FormBuilder,
		private servicosService: ServicosService,
		private messageService: MessageService,
	) {
		this.formulario = this.formBuilder.nonNullable.group({
			name: ['', [Validators.required, Validators.maxLength(100)]],
		});
	}

	ngOnInit(): void {
		this.carregar();
	}

	ngOnDestroy(): void {
		clearTimeout(this.temporizadorBusca);
	}

	public carregar(): void {
		this.pagina = 0;
		this.estado.set('carregando');
		this.servicosService.buscarPaginado(0, this.busca).subscribe({
			next: ({ itens, total }) => {
				this.servicos.set(itens);
				this.total.set(total);
				this.estado.set(itens.length ? 'carregado' : 'vazio');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public carregarMais(): void {
		this.carregandoMais.set(true);
		this.servicosService.buscarPaginado(this.pagina + 1, this.busca).subscribe({
			next: ({ itens, total }) => {
				this.pagina++;
				this.servicos.update((atuais) => [...atuais, ...itens]);
				this.total.set(total);
				this.carregandoMais.set(false);
			},
			error: (erro: unknown) => {
				this.carregandoMais.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível carregar mais serviços.') });
			},
		});
	}

	public aoDigitarBusca(valor: string): void {
		this.busca = valor;
		clearTimeout(this.temporizadorBusca);
		this.temporizadorBusca = setTimeout(() => this.carregar(), 500);
	}

	public abrirNovo(): void {
		this.emEdicao.set(null);
		this.formulario.reset({ name: '' });
		this.drawerAberto.set(true);
	}

	public abrirEdicao(servico: Servico): void {
		this.emEdicao.set(servico);
		this.formulario.reset({ name: servico.name });
		this.drawerAberto.set(true);
	}

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			return;
		}
		const nome: string = this.formulario.getRawValue().name;
		const servico = this.emEdicao();
		const requisicao = servico ? this.servicosService.atualizar(servico.id, nome) : this.servicosService.criar(nome);
		this.salvando.set(true);
		requisicao.subscribe({
			next: () => {
				this.salvando.set(false);
				this.drawerAberto.set(false);
				this.messageService.add({ severity: 'success', summary: servico ? 'Serviço atualizado.' : 'Serviço cadastrado.' });
				this.carregar();
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar o serviço.') });
			},
		});
	}

	/** Ativa/desativa: serviços inativos não aparecem para novas OS, mas continuam nas antigas. */
	public alternarAtivo(): void {
		const servico = this.emEdicao();
		if (!servico) return;
		this.salvando.set(true);
		this.servicosService.alterarAtivo(servico.id, !servico.active).subscribe({
			next: (atualizado) => {
				this.salvando.set(false);
				this.drawerAberto.set(false);
				this.messageService.add({ severity: 'success', summary: atualizado.active ? 'Serviço ativado.' : 'Serviço desativado.' });
				this.carregar();
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível alterar o serviço.') });
			},
		});
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}
}
