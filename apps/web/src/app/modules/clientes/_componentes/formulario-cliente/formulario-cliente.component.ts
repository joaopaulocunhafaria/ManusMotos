import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { campoInvalido, textoOuNulo } from '../../../../utils/_formularios/campos';
import { cpfCnpj, placa, telefone } from '../../../../utils/_formularios/validadores';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { formatarDocumento, formatarPlaca, formatarTelefone, normalizarPlaca, somenteDigitos } from '../../../../utils/_metodos/texto';
import { ClienteComMotos, MotoFormulario } from '../../_modelos/cliente.model';
import { ClientesService } from '../../_servicos/clientes.service';

/** Formulário de cliente + motos. Grava sozinho e emite o cliente salvo. Usado na página de clientes e na OS. */
@Component({
	selector: 'app-formulario-cliente',
	standalone: false,
	templateUrl: './formulario-cliente.component.html',
})
export class FormularioClienteComponent implements OnChanges {
	/** Cliente a editar; vazio = novo. */
	@Input() cliente: ClienteComMotos | null = null;
	@Input() rotuloSalvar = 'Salvar cliente';
	@Output() salvo = new EventEmitter<ClienteComMotos>();

	public formulario: FormGroup;
	public salvando = signal(false);
	private motosRemovidas: string[] = [];

	constructor(
		private formBuilder: FormBuilder,
		private clientesService: ClientesService,
		private messageService: MessageService,
	) {
		this.formulario = this.formBuilder.nonNullable.group({
			name: ['', [Validators.required, Validators.maxLength(120)]],
			phone: ['', [Validators.required, telefone()]],
			document: ['', [Validators.required, cpfCnpj()]],
			address: ['', [Validators.maxLength(300)]],
			motos: this.formBuilder.array<FormGroup>([], [Validators.required]),
		});
		this.adicionarMoto();
	}

	ngOnChanges(): void {
		this.preencher();
	}

	public get motos(): FormArray<FormGroup> {
		return this.formulario.get('motos') as FormArray<FormGroup>;
	}

	public adicionarMoto(moto?: Partial<MotoFormulario>): void {
		this.motos.push(
			this.formBuilder.nonNullable.group({
				id: [moto?.id ?? (null as string | null)],
				model: [moto?.model ?? '', [Validators.required, Validators.maxLength(80)]],
				color: [moto?.color ?? '', [Validators.required, Validators.maxLength(40)]],
				plate: [moto?.plate ? formatarPlaca(moto.plate) : '', [Validators.required, placa()]],
			}),
		);
	}

	public removerMoto(indice: number): void {
		const id = this.motos.at(indice).get('id')?.value as string | null;
		if (id) this.motosRemovidas.push(id);
		this.motos.removeAt(indice);
		this.formulario.markAsDirty();
	}

	public formatar(campo: 'phone' | 'document'): void {
		const controle = this.formulario.get(campo);
		if (!controle?.value) return;
		controle.setValue(campo === 'phone' ? formatarTelefone(controle.value) : formatarDocumento(controle.value));
	}

	public formatarPlacaDa(grupo: AbstractControl): void {
		const controle = grupo.get('plate');
		if (controle?.value) controle.setValue(formatarPlaca(controle.value));
	}

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			this.messageService.add({
				severity: 'warn',
				summary: this.motos.length ? 'Confira os campos destacados.' : 'Cadastre ao menos uma moto.',
			});
			return;
		}
		const valores = this.formulario.getRawValue();
		const motos: MotoFormulario[] = (valores.motos as MotoFormulario[]).map((moto) => ({
			id: moto.id,
			model: moto.model.trim(),
			color: moto.color.trim(),
			plate: normalizarPlaca(moto.plate),
		}));

		this.salvando.set(true);
		this.clientesService
			.salvar(
				this.cliente?.id ?? null,
				{
					name: valores.name.trim(),
					phone: somenteDigitos(valores.phone),
					document: somenteDigitos(valores.document),
					address: textoOuNulo(valores.address),
				},
				motos,
				this.motosRemovidas,
			)
			.subscribe({
				next: (cliente) => {
					this.salvando.set(false);
					this.cliente = cliente;
					this.preencher();
					this.messageService.add({ severity: 'success', summary: 'Cliente salvo.' });
					this.salvo.emit(cliente);
				},
				error: (erro: unknown) => {
					this.salvando.set(false);
					this.messageService.add({
						severity: 'error',
						summary: mensagemErro(erro, 'Não foi possível salvar o cliente.'),
						detail: 'CPF/CNPJ e placa não podem se repetir; motos com OS não podem ser removidas.',
					});
				},
			});
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}

	public motoInvalida(grupo: AbstractControl, campo: string): boolean {
		return campoInvalido(grupo.get(campo));
	}

	private preencher(): void {
		this.motosRemovidas = [];
		this.motos.clear();
		const cliente = this.cliente;
		this.formulario.reset({
			name: cliente?.name ?? '',
			phone: formatarTelefone(cliente?.phone),
			document: formatarDocumento(cliente?.document),
			address: cliente?.address ?? '',
		});
		if (cliente?.motorcycles.length) cliente.motorcycles.forEach((moto) => this.adicionarMoto(moto));
		else this.adicionarMoto();
	}
}
