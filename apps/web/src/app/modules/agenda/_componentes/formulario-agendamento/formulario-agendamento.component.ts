import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { Agendamento, AgendamentoInsert, Moto } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { Subscription } from 'rxjs';
import { campoInvalido, textoOuNulo } from '../../../../utils/_formularios/campos';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { ClienteComMotos } from '../../../clientes/_modelos/cliente.model';
import { ClientesService } from '../../../clientes/_servicos/clientes.service';
import { MotosService } from '../../../clientes/_servicos/motos.service';
import { ServicosService } from '../../../servicos/_servicos/servicos.service';
import { DURACAO_PADRAO, DURACOES } from '../../_constantes/agenda';
import { minutosDoHorario } from '../../_metodos/datas';
import { ContextoFormulario } from '../../_modelos/agendamento.model';
import { AgendamentosService } from '../../_servicos/agendamentos.service';

/**
 * Cria/edita um agendamento. Cliente, moto e serviço são texto livre, com sugestões dos cadastros.
 * Usado dentro de um `p-drawer` na tela da semana.
 */
@Component({
	selector: 'app-formulario-agendamento',
	standalone: false,
	templateUrl: './formulario-agendamento.component.html',
})
export class FormularioAgendamentoComponent implements OnChanges, OnDestroy {
	@Input({ required: true }) contexto!: ContextoFormulario;
	@Output() salvo = new EventEmitter<Agendamento>();
	@Output() excluido = new EventEmitter<void>();

	public readonly duracoes = DURACOES;
	public formulario: FormGroup;
	public salvando = signal(false);
	public confirmandoExclusao = signal(false);

	public sugestoesClientes = signal<ClienteComMotos[]>([]);
	public sugestoesMotos = signal<string[]>([]);
	public sugestoesServicos = signal<string[]>([]);

	/** Cliente cadastrado escolhido pela sugestão (zera se o nome for editado). */
	private clienteId: string | null = null;
	private nomeClienteEscolhido: string | null = null;
	private motosDoCliente: Moto[] = [];
	private inscricaoNome: Subscription;

	constructor(
		private formBuilder: FormBuilder,
		private agendamentosService: AgendamentosService,
		private clientesService: ClientesService,
		private motosService: MotosService,
		private servicosService: ServicosService,
		private messageService: MessageService,
	) {
		this.formulario = this.formBuilder.nonNullable.group({
			client_name: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
			scheduled_date: ['', Validators.required],
			start_time: ['', Validators.required],
			duration_minutes: [DURACAO_PADRAO, Validators.required],
			motorcycle_model: ['', Validators.maxLength(80)],
			service: ['', Validators.maxLength(100)],
		});

		this.inscricaoNome = this.formulario.controls['client_name'].valueChanges.subscribe((valor: unknown) => {
			if (typeof valor === 'string' && valor !== this.nomeClienteEscolhido) this.definirCliente(null);
		});
	}

	ngOnChanges(): void {
		const agendamento = this.contexto.agendamento;
		this.confirmandoExclusao.set(false);
		this.formulario.reset({
			client_name: agendamento?.client_name ?? '',
			scheduled_date: agendamento?.scheduled_date ?? this.contexto.data,
			start_time: agendamento?.start_time.slice(0, 5) ?? this.contexto.horario,
			duration_minutes: agendamento?.duration_minutes ?? DURACAO_PADRAO,
			motorcycle_model: agendamento?.motorcycle_model ?? '',
			service: agendamento?.service ?? '',
		});
		this.nomeClienteEscolhido = agendamento?.client_id ? agendamento.client_name : null;
		this.definirCliente(agendamento?.client_id ?? null);
		if (this.clienteId) {
			this.motosService.buscarPorCliente(this.clienteId).subscribe({
				next: (motos) => (this.motosDoCliente = motos),
				error: () => (this.motosDoCliente = []),
			});
		}
	}

	ngOnDestroy(): void {
		this.inscricaoNome.unsubscribe();
	}

	public buscarClientes(evento: AutoCompleteCompleteEvent): void {
		this.clientesService.buscar(evento.query).subscribe({
			next: (clientes) => this.sugestoesClientes.set(clientes),
			error: () => this.sugestoesClientes.set([]),
		});
	}

	/** Guarda só o nome no campo e lembra o cliente para sugerir as motos dele. */
	public aoSelecionarCliente(evento: AutoCompleteSelectEvent): void {
		const cliente = evento.value as ClienteComMotos;
		this.nomeClienteEscolhido = cliente.name;
		this.formulario.controls['client_name'].setValue(cliente.name);
		this.definirCliente(cliente.id);
		this.motosDoCliente = cliente.motorcycles ?? [];
		const modelo = this.formulario.controls['motorcycle_model'];
		if (!modelo.value && this.motosDoCliente.length === 1) modelo.setValue(this.motosDoCliente[0].model);
	}

	public buscarMotos(evento: AutoCompleteCompleteEvent): void {
		const termo = evento.query.trim().toLowerCase();
		const modelos = Array.from(new Set(this.motosDoCliente.map((moto) => moto.model)));
		this.sugestoesMotos.set(modelos.filter((modelo) => modelo.toLowerCase().includes(termo)));
	}

	public buscarServicos(evento: AutoCompleteCompleteEvent): void {
		this.servicosService.buscarAtivos(evento.query).subscribe({
			next: (servicos) => this.sugestoesServicos.set(servicos.map((servico) => servico.name)),
			error: () => this.sugestoesServicos.set([]),
		});
	}

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			return;
		}
		const valores = this.formulario.getRawValue();
		const duracao = Number(valores.duration_minutes);
		const dados: AgendamentoInsert = {
			client_name: String(valores.client_name).trim(),
			client_id: this.clienteId,
			scheduled_date: valores.scheduled_date,
			start_time: valores.start_time,
			duration_minutes: duracao,
			motorcycle_model: textoOuNulo(valores.motorcycle_model),
			service: textoOuNulo(valores.service),
		};
		if (minutosDoHorario(dados.start_time) + duracao > 24 * 60) {
			this.messageService.add({ severity: 'warn', summary: 'O agendamento precisa terminar no mesmo dia.' });
			return;
		}
		const agendamento = this.contexto.agendamento;
		const requisicao = agendamento ? this.agendamentosService.atualizar(agendamento.id, dados) : this.agendamentosService.criar(dados);
		this.salvando.set(true);
		requisicao.subscribe({
			next: (salvo) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'success', summary: agendamento ? 'Agendamento atualizado.' : 'Agendamento criado.' });
				this.salvo.emit(salvo);
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar o agendamento.') });
			},
		});
	}

	public excluir(): void {
		const agendamento = this.contexto.agendamento;
		if (!agendamento) return;
		if (!this.confirmandoExclusao()) {
			this.confirmandoExclusao.set(true);
			return;
		}
		this.salvando.set(true);
		this.agendamentosService.excluir(agendamento.id).subscribe({
			next: () => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'success', summary: 'Agendamento excluído.' });
				this.excluido.emit();
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível excluir o agendamento.') });
			},
		});
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}

	private definirCliente(id: string | null): void {
		this.clienteId = id;
		if (!id) {
			this.nomeClienteEscolhido = null;
			this.motosDoCliente = [];
		}
	}
}
