import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { MovimentoPeca, Peca } from '@manus/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { VALOR_MAXIMO } from '../../../../utils/_constantes/valores';
import { campoInvalido, textoOuNulo } from '../../../../utils/_formularios/campos';
import { anosMoto } from '../../../../utils/_formularios/validadores';
import { deDataIso, hojeIso } from '../../../../utils/_metodos/datas';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { calcularLucro, calcularMargem } from '../../_metodos/margem';
import { HistoricoPecaComponent } from '../../_componentes/historico-peca/historico-peca.component';
import { PecaEdicao, PecaFormulario } from '../../_modelos/peca.model';
import { EstoqueService } from '../../_servicos/estoque.service';

const ANO_MINIMO = 1950;
const ANO_MAXIMO = 2100;

/** Página `/administracao/estoque/nova` e `/administracao/estoque/:id`. */
@Component({
	selector: 'app-formulario-peca',
	standalone: false,
	templateUrl: './formulario-peca.component.html',
	providers: [ConfirmationService],
})
export class FormularioPecaComponent implements OnInit {
	public peca = signal<Peca | null>(null);
	public estado = signal<EstadoTela>('carregando');
	public salvando = signal(false);
	public vendendo = signal(false);
	public formulario: FormGroup;

	@ViewChild(HistoricoPecaComponent) private historico?: HistoricoPecaComponent;

	public readonly anoMinimo = ANO_MINIMO;
	public readonly anoMaximo = ANO_MAXIMO;
	public readonly valorMaximo = VALOR_MAXIMO;

	public readonly id: string | null;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private formBuilder: FormBuilder,
		private estoqueService: EstoqueService,
		private messageService: MessageService,
		private confirmationService: ConfirmationService,
	) {
		this.id = this.route.snapshot.paramMap.get('id');
		const ano = [Validators.pattern(/^\d{4}$/), Validators.min(ANO_MINIMO), Validators.max(ANO_MAXIMO)];
		this.formulario = this.formBuilder.group(
			{
				name: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
				motorcycle_model: ['', [Validators.maxLength(80)]],
				year_start: ['', ano],
				year_end: ['', ano],
				purchase_price: [null as number | null, [Validators.required, Validators.min(0), Validators.max(VALOR_MAXIMO)]],
				sale_price: [null as number | null, [Validators.required, Validators.min(0), Validators.max(VALOR_MAXIMO)]],
				purchase_date: [hojeIso(), [Validators.required, (c: { value: string }) => (deDataIso(c.value) ? null : { data: true })]],
				quantity: [0 as number | null, [Validators.required, Validators.min(0)]],
			},
			{ validators: anosMoto() },
		);
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
		this.estoqueService.buscarPorId(this.id).subscribe({
			next: (peca) => {
				this.peca.set(peca);
				this.formulario.reset({
					name: peca.name,
					motorcycle_model: peca.motorcycle_model ?? '',
					year_start: peca.year_start ? String(peca.year_start) : '',
					year_end: peca.year_end ? String(peca.year_end) : '',
					purchase_price: peca.purchase_price,
					sale_price: peca.sale_price,
					purchase_date: peca.purchase_date,
					quantity: peca.quantity,
				});
				// A quantidade só muda por movimentação (+/−, venda), para ficar registrada no financeiro.
				this.formulario.get('quantity')?.disable();
				this.estado.set('carregado');
			},
			error: () => this.estado.set('erro'),
		});
	}

	/** Margem (% sobre a venda) com os valores digitados; `null` sem valor de venda. */
	public margem(): number | null {
		return calcularMargem(this.formulario.get('purchase_price')?.value, this.formulario.get('sale_price')?.value);
	}

	public lucro(): number {
		return calcularLucro(this.formulario.get('purchase_price')?.value, this.formulario.get('sale_price')?.value);
	}

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			return;
		}
		const valores = this.formulario.getRawValue();
		const dados: PecaEdicao = {
			name: valores.name.trim(),
			motorcycle_model: textoOuNulo(valores.motorcycle_model),
			year_start: valores.year_start ? Number(valores.year_start) : null,
			year_end: valores.year_end ? Number(valores.year_end) : null,
			purchase_price: valores.purchase_price,
			sale_price: valores.sale_price,
			purchase_date: valores.purchase_date,
		};
		const peca = this.peca();
		const nova: PecaFormulario = { ...dados, quantity: valores.quantity };
		const requisicao = peca ? this.estoqueService.atualizar(peca.id, dados) : this.estoqueService.criar(nova);
		this.salvando.set(true);
		requisicao.subscribe({
			next: () => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'success', summary: peca ? 'Peça atualizada.' : 'Peça cadastrada.' });
				this.voltar();
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar a peça.') });
			},
		});
	}

	public confirmarExclusao(): void {
		const peca = this.peca();
		if (!peca) return;
		this.confirmationService.confirm({
			header: 'Excluir peça',
			message: `"${peca.name}" será apagada do estoque definitivamente.`,
			acceptLabel: 'Excluir',
			rejectLabel: 'Voltar',
			acceptButtonProps: { severity: 'danger' },
			rejectButtonProps: { variant: 'outlined' },
			accept: () => {
				this.salvando.set(true);
				this.estoqueService.excluir(peca.id).subscribe({
					next: () => {
						this.salvando.set(false);
						this.messageService.add({ severity: 'success', summary: 'Peça excluída.' });
						this.voltar();
					},
					error: (erro: unknown) => {
						this.salvando.set(false);
						this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível excluir a peça.') });
					},
				});
			},
		});
	}

	public abrirVenda(): void {
		this.vendendo.set(true);
	}

	public aoVender(venda: MovimentoPeca): void {
		this.vendendo.set(false);
		this.atualizarQuantidade(this.peca()!.quantity - venda.quantity);
		this.historico?.carregar();
	}

	public aoEstornar(peca: Peca): void {
		this.atualizarQuantidade(peca.quantity);
	}

	private atualizarQuantidade(quantidade: number): void {
		const peca = this.peca();
		if (!peca) return;
		this.peca.set({ ...peca, quantity: quantidade });
		this.formulario.get('quantity')?.setValue(quantidade);
	}

	public voltar(): void {
		this.router.navigate(['/administracao/estoque']);
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}

	/** Erro de grupo dos anos, exibido depois que o ano final foi tocado. */
	public erroAnos(erro: 'anoFinalSemInicial' | 'anoFinalMenor'): boolean {
		const fim = this.formulario.get('year_end');
		return !!this.formulario.errors?.[erro] && !!fim && (fim.touched || fim.dirty);
	}
}
