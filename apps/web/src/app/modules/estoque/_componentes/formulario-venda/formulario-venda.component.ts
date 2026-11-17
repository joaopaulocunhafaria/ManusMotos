import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { MovimentoPeca, Peca } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { VALOR_MAXIMO } from '../../../../utils/_constantes/valores';
import { campoInvalido, textoOuNulo } from '../../../../utils/_formularios/campos';
import { deDataIso, hojeIso } from '../../../../utils/_metodos/datas';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstoqueService } from '../../_servicos/estoque.service';

/** Venda de uma peça (quantidade, preço, data e observação). Usado dentro de um `p-drawer` inferior. */
@Component({
	selector: 'app-formulario-venda',
	standalone: false,
	templateUrl: './formulario-venda.component.html',
})
export class FormularioVendaComponent implements OnChanges {
	@Input({ required: true }) peca!: Peca;
	@Output() vendida = new EventEmitter<MovimentoPeca>();
	@Output() cancelado = new EventEmitter<void>();

	public formulario: FormGroup;
	public salvando = signal(false);
	public readonly valorMaximo = VALOR_MAXIMO;

	constructor(
		private formBuilder: FormBuilder,
		private estoqueService: EstoqueService,
		private messageService: MessageService,
	) {
		this.formulario = this.formBuilder.group({
			quantidade: [1 as number | null, [Validators.required, Validators.min(1)]],
			preco: [null as number | null, [Validators.required, Validators.min(0), Validators.max(VALOR_MAXIMO)]],
			data: ['', [Validators.required, (c: { value: string }) => (deDataIso(c.value) ? null : { data: true })]],
			observacao: ['', [Validators.maxLength(300)]],
		});
	}

	ngOnChanges(): void {
		const quantidade = this.formulario.get('quantidade')!;
		quantidade.setValidators([Validators.required, Validators.min(1), Validators.max(this.peca.quantity)]);
		this.formulario.reset({ quantidade: 1, preco: this.peca.sale_price, data: hojeIso(), observacao: '' });
	}

	/** Total da venda com os valores digitados. */
	public total(): number {
		return Math.round((this.formulario.get('quantidade')?.value ?? 0) * (this.formulario.get('preco')?.value ?? 0) * 100) / 100;
	}

	/** Lucro previsto: total − quantidade × valor de compra. */
	public lucro(): number {
		return Math.round((this.total() - (this.formulario.get('quantidade')?.value ?? 0) * this.peca.purchase_price) * 100) / 100;
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}

	public erro(campo: string, erro: string): boolean {
		return this.invalido(campo) && !!this.formulario.get(campo)?.hasError(erro);
	}

	public vender(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			return;
		}
		const valores = this.formulario.getRawValue();
		this.salvando.set(true);
		this.estoqueService
			.vender(this.peca.id, {
				quantidade: valores.quantidade,
				precoUnitario: valores.preco,
				data: valores.data,
				observacao: textoOuNulo(valores.observacao),
			})
			.subscribe({
				next: (venda) => {
					this.salvando.set(false);
					this.messageService.add({ severity: 'success', summary: 'Venda registrada.' });
					this.vendida.emit(venda);
				},
				error: (erro: unknown) => {
					this.salvando.set(false);
					this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível registrar a venda.') });
				},
			});
	}
}
