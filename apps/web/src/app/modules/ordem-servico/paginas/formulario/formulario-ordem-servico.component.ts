import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { FormaPagamento, Moto, Servico } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Subscription } from 'rxjs';
import { campoInvalido, textoOuNulo } from '../../../../utils/_formularios/campos';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { ClienteComMotos } from '../../../clientes/_modelos/cliente.model';
import { ClientesService } from '../../../clientes/_servicos/clientes.service';
import { ServicosService } from '../../../servicos/_servicos/servicos.service';
import { MAXIMO_PARCELAS, OPCOES_FORMA_PAGAMENTO } from '../../_enums/ordem-servico.enums';
import { calcularTotal, hojeIso, saldoRestante, valorParcela } from '../../_metodos/ordem-servico';
import { DadosOrdemServico, ItemFormulario, OrdemServicoDetalhada } from '../../_modelos/ordem-servico.model';
import { OrdemServicoService } from '../../_servicos/ordem-servico.service';

type ServicoSelecionado = Pick<Servico, 'id' | 'name'>;

/** Entrada ≤ total e parcelas obrigatórias no parcelado. */
function validarPagamento(): ValidatorFn {
	return (grupo: AbstractControl): ValidationErrors | null => {
		const itens = (grupo.get('itens')?.value ?? []) as ItemFormulario[];
		const entrada = Number(grupo.get('down_payment')?.value) || 0;
		const erros: ValidationErrors = {};
		if (entrada > calcularTotal(itens)) erros['entradaMaiorQueTotal'] = true;
		if (grupo.get('payment_method')?.value === 'installments' && !grupo.get('installments')?.value) erros['parcelasObrigatorias'] = true;
		return Object.keys(erros).length ? erros : null;
	};
}

/** Páginas `/administracao/ordem-servico/nova` e `/administracao/ordem-servico/:id/editar`. */
@Component({
	selector: 'app-formulario-ordem-servico',
	standalone: false,
	templateUrl: './formulario-ordem-servico.component.html',
	styleUrl: './formulario-ordem-servico.component.scss',
})
export class FormularioOrdemServicoComponent implements OnInit, OnDestroy {
	public readonly opcoesFormaPagamento = OPCOES_FORMA_PAGAMENTO;
	public readonly id: string | null;

	public formulario: FormGroup;
	public estado = signal<EstadoTela>('carregando');
	public salvando = signal(false);
	public numero = signal<number | null>(null);

	public sugestoesClientes = signal<ClienteComMotos[]>([]);
	public sugestoesServicos = signal<Servico[]>([]);
	/** Item cujo autocomplete pediu a busca (cada item só mostra as próprias sugestões). */
	public itemBuscandoServico = signal<number | null>(null);
	public motos = signal<Moto[]>([]);

	/** Valores que alimentam o resumo (atualizados a cada mudança do formulário). */
	public total = signal(0);
	public entrada = signal(0);
	public parcelas = signal<number | null>(null);
	public formaPagamento = signal<FormaPagamento>('pix');
	public readonly saldo = computed(() => saldoRestante(this.total(), this.entrada()));
	public readonly valorDaParcela = computed(() => valorParcela(this.total(), this.entrada(), this.parcelas()));
	public readonly opcoesParcelas = computed(() =>
		Array.from({ length: MAXIMO_PARCELAS - 1 }, (_, i) => {
			const quantidade = i + 2;
			const valor = valorParcela(this.total(), this.entrada(), quantidade);
			return { label: `${quantidade}x de ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, valor: quantidade };
		}),
	);

	public drawerCliente = signal(false);
	public clienteEmEdicao = signal<ClienteComMotos | null>(null);
	public drawerServico = signal(false);
	public criandoServico = signal(false);
	public formularioServico: FormGroup;

	private assinaturas = new Subscription();

	constructor(
		private formBuilder: FormBuilder,
		private route: ActivatedRoute,
		private router: Router,
		private messageService: MessageService,
		private ordemServicoService: OrdemServicoService,
		private clientesService: ClientesService,
		private servicosService: ServicosService,
	) {
		this.id = this.route.snapshot.paramMap.get('id');
		this.formulario = this.formBuilder.group(
			{
				cliente: this.formBuilder.control<ClienteComMotos | null>(null, [Validators.required, this.clienteSelecionado()]),
				motorcycle_id: this.formBuilder.control<string | null>(null, [Validators.required]),
				mileage: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
				itens: this.formBuilder.array<FormGroup>([], [Validators.required]),
				payment_method: this.formBuilder.nonNullable.control<FormaPagamento>('pix', [Validators.required]),
				installments: this.formBuilder.control<number | null>(null),
				down_payment: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
				order_date: this.formBuilder.nonNullable.control(hojeIso(), [Validators.required]),
				estimated_time: this.formBuilder.nonNullable.control('', [Validators.maxLength(80)]),
				notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(2000)]),
				customer_notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(2000)]),
			},
			{ validators: [validarPagamento()] },
		);
		this.formularioServico = this.formBuilder.nonNullable.group({
			name: ['', [Validators.required, Validators.maxLength(100)]],
		});
	}

	ngOnInit(): void {
		this.assinaturas.add(this.formulario.valueChanges.subscribe(() => this.atualizarResumo()));
		this.assinaturas.add(
			this.formulario.get('payment_method')!.valueChanges.subscribe((forma: FormaPagamento) => {
				if (forma !== 'installments') this.formulario.get('installments')!.setValue(null, { emitEvent: false });
			}),
		);
		this.carregar();
	}

	ngOnDestroy(): void {
		this.assinaturas.unsubscribe();
	}

	public get itens(): FormArray<FormGroup> {
		return this.formulario.get('itens') as FormArray<FormGroup>;
	}

	public carregar(): void {
		if (!this.id) {
			this.adicionarItem();
			this.estado.set('carregado');
			return;
		}
		this.estado.set('carregando');
		this.ordemServicoService.buscarPorId(this.id).subscribe({
			next: (ordem) => {
				this.preencher(ordem);
				this.estado.set('carregado');
			},
			error: () => this.estado.set('erro'),
		});
	}

	// ---------- Cliente e moto ----------

	public buscarClientes(evento: AutoCompleteCompleteEvent): void {
		this.clientesService.buscar(evento.query).subscribe({
			next: (clientes) => this.sugestoesClientes.set(clientes),
			error: () => this.sugestoesClientes.set([]),
		});
	}

	public aoSelecionarCliente(cliente: ClienteComMotos): void {
		this.motos.set(cliente.motorcycles);
		this.formulario.get('motorcycle_id')!.setValue(cliente.motorcycles.length === 1 ? cliente.motorcycles[0].id : null);
	}

	public aoLimparCliente(): void {
		this.motos.set([]);
		this.formulario.get('motorcycle_id')!.setValue(null);
	}

	public get clienteAtual(): ClienteComMotos | null {
		const valor = this.formulario.get('cliente')!.value;
		return valor && typeof valor === 'object' ? valor : null;
	}

	public abrirCliente(editar: boolean): void {
		this.clienteEmEdicao.set(editar ? this.clienteAtual : null);
		this.drawerCliente.set(true);
	}

	public aoSalvarCliente(cliente: ClienteComMotos): void {
		const motoAtual = this.formulario.get('motorcycle_id')!.value as string | null;
		this.formulario.get('cliente')!.setValue(cliente);
		this.motos.set(cliente.motorcycles);
		const motoAindaExiste = cliente.motorcycles.some((moto) => moto.id === motoAtual);
		const ultimaMoto = cliente.motorcycles[cliente.motorcycles.length - 1];
		this.formulario.get('motorcycle_id')!.setValue(motoAindaExiste ? motoAtual : (ultimaMoto?.id ?? null));
		this.drawerCliente.set(false);
	}

	// ---------- Serviços ----------

	public adicionarItem(servico: ServicoSelecionado | null = null, preco: number | null = null): void {
		this.itens.push(
			this.formBuilder.group({
				servico: this.formBuilder.control<ServicoSelecionado | null>(servico, [Validators.required, this.servicoSelecionado()]),
				price: this.formBuilder.control<number | null>(preco, [Validators.required, Validators.min(0)]),
			}),
		);
	}

	public removerItem(indice: number): void {
		this.itens.removeAt(indice);
		this.formulario.markAsDirty();
	}

	public buscarServicos(evento: AutoCompleteCompleteEvent, indice: number): void {
		this.itemBuscandoServico.set(indice);
		this.servicosService.buscarAtivos(evento.query).subscribe({
			next: (servicos) => this.sugestoesServicos.set(servicos),
			error: () => this.sugestoesServicos.set([]),
		});
	}

	public abrirNovoServico(): void {
		this.formularioServico.reset({ name: '' });
		this.drawerServico.set(true);
	}

	/** Cadastra no catálogo e já adiciona à OS (num item vazio, se houver). */
	public criarServico(): void {
		if (this.formularioServico.invalid) {
			this.formularioServico.markAllAsTouched();
			return;
		}
		this.criandoServico.set(true);
		this.servicosService.criar(this.formularioServico.getRawValue().name).subscribe({
			next: (servico) => {
				this.criandoServico.set(false);
				this.drawerServico.set(false);
				const vazio = this.itens.controls.find((grupo) => !grupo.get('servico')!.value);
				if (vazio) vazio.get('servico')!.setValue(servico);
				else this.adicionarItem(servico);
				this.messageService.add({ severity: 'success', summary: 'Serviço cadastrado no catálogo.' });
			},
			error: (erro: unknown) => {
				this.criandoServico.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível cadastrar o serviço.') });
			},
		});
	}

	// ---------- Salvar ----------

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			this.itens.controls.forEach((grupo) => grupo.markAllAsTouched());
			this.messageService.add({ severity: 'warn', summary: this.mensagemInvalido() });
			return;
		}
		const valores = this.formulario.getRawValue();
		const cliente = this.clienteAtual!;
		const dados: DadosOrdemServico = {
			client_id: cliente.id,
			motorcycle_id: valores.motorcycle_id,
			mileage: valores.mileage ?? null,
			payment_method: valores.payment_method,
			installments: valores.payment_method === 'installments' ? valores.installments : null,
			down_payment: Number(valores.down_payment) || 0,
			order_date: valores.order_date,
			estimated_time: textoOuNulo(valores.estimated_time),
			notes: textoOuNulo(valores.notes),
			customer_notes: textoOuNulo(valores.customer_notes),
		};
		const itens = (valores.itens as ItemFormulario[]).map((item) => ({ service_id: item.servico!.id, price: Number(item.price) || 0 }));

		this.salvando.set(true);
		this.ordemServicoService.salvar(this.id, dados, itens).subscribe({
			next: (id) => {
				this.salvando.set(false);
				this.messageService.add({
					severity: 'success',
					summary: this.id ? 'Ordem de serviço atualizada.' : 'Ordem de serviço criada.',
				});
				this.router.navigate(['/administracao/ordem-servico', id], { replaceUrl: true });
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar a ordem de serviço.') });
			},
		});
	}

	public voltar(): void {
		this.router.navigate(this.id ? ['/administracao/ordem-servico', this.id] : ['/administracao/ordem-servico']);
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}

	public itemInvalido(grupo: AbstractControl, campo: string): boolean {
		return campoInvalido(grupo.get(campo));
	}

	public erroGrupo(erro: 'entradaMaiorQueTotal' | 'parcelasObrigatorias', campo: string): boolean {
		const controle = this.formulario.get(campo);
		return !!this.formulario.errors?.[erro] && !!controle && (controle.touched || controle.dirty);
	}

	// ---------- Internos ----------

	private atualizarResumo(): void {
		const valores = this.formulario.getRawValue();
		this.total.set(calcularTotal(valores.itens as ItemFormulario[]));
		this.entrada.set(Number(valores.down_payment) || 0);
		this.parcelas.set(valores.installments);
		this.formaPagamento.set(valores.payment_method);
	}

	private preencher(ordem: OrdemServicoDetalhada): void {
		this.numero.set(ordem.number);
		this.itens.clear();
		ordem.service_order_items.forEach((item) => this.adicionarItem({ id: item.service_id, name: item.service_name }, item.price));
		this.formulario.patchValue({
			cliente: { ...ordem.clients, motorcycles: [] },
			motorcycle_id: ordem.motorcycle_id,
			mileage: ordem.mileage,
			payment_method: ordem.payment_method as FormaPagamento,
			installments: ordem.installments,
			down_payment: ordem.down_payment || null,
			order_date: ordem.order_date,
			estimated_time: ordem.estimated_time ?? '',
			notes: ordem.notes ?? '',
			customer_notes: ordem.customer_notes ?? '',
		});
		this.motos.set([ordem.motorcycles]);
		// Carrega todas as motos do cliente para permitir trocar.
		this.clientesService.buscarPorId(ordem.client_id).subscribe({
			next: (cliente) => {
				this.formulario.get('cliente')!.setValue(cliente, { emitEvent: false });
				this.motos.set(cliente.motorcycles);
			},
		});
		this.atualizarResumo();
	}

	private mensagemInvalido(): string {
		if (!this.clienteAtual) return 'Selecione o cliente.';
		if (!this.formulario.get('motorcycle_id')!.value) return 'Selecione a moto.';
		if (!this.itens.length) return 'Adicione ao menos um serviço.';
		if (this.formulario.errors?.['entradaMaiorQueTotal']) return 'A entrada não pode ser maior que o total.';
		if (this.formulario.errors?.['parcelasObrigatorias']) return 'Escolha a quantidade de parcelas.';
		return 'Confira os campos destacados.';
	}

	/** O autocomplete guarda texto enquanto o usuário digita: só vale um cliente escolhido da lista. */
	private clienteSelecionado(): ValidatorFn {
		return (controle) => (controle.value && typeof controle.value !== 'object' ? { clienteNaoSelecionado: true } : null);
	}

	private servicoSelecionado(): ValidatorFn {
		return (controle) => (controle.value && typeof controle.value !== 'object' ? { servicoNaoSelecionado: true } : null);
	}
}
