import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { LancamentoCaixa } from '@manus/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
import { VALOR_MAXIMO } from '../../../../utils/_constantes/valores';
import { campoInvalido, textoOuNulo } from '../../../../utils/_formularios/campos';
import { deDataIso, hojeIso } from '../../../../utils/_metodos/datas';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { LancamentoFormulario } from '../../_modelos/resumo-financeiro.model';
import { LancamentosService } from '../../_servicos/lancamentos.service';

/** Página `/administracao/financeiro/lancamentos/novo` (`?tipo=income|expense`) e `/lancamentos/:id`. */
@Component({
	selector: 'app-formulario-lancamento',
	standalone: false,
	templateUrl: './formulario-lancamento.component.html',
	styleUrl: './formulario-lancamento.component.scss',
	providers: [ConfirmationService],
})
export class FormularioLancamentoComponent implements OnInit {
	public lancamento = signal<LancamentoCaixa | null>(null);
	public estado = signal<EstadoTela>('carregando');
	public salvando = signal(false);
	public formulario: FormGroup;

	public readonly valorMaximo = VALOR_MAXIMO;
	public readonly opcoesTipo = [
		{ label: 'Entrada', valor: 'income' },
		{ label: 'Saída', valor: 'expense' },
	];
	public readonly id: string | null;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private formBuilder: FormBuilder,
		private lancamentosService: LancamentosService,
		private messageService: MessageService,
		private confirmationService: ConfirmationService,
	) {
		this.id = this.route.snapshot.paramMap.get('id');
		const tipo = this.route.snapshot.queryParamMap.get('tipo') === 'income' ? 'income' : 'expense';
		this.formulario = this.formBuilder.group({
			kind: [tipo, Validators.required],
			description: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
			amount: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(VALOR_MAXIMO)]],
			entry_date: [hojeIso(), [Validators.required, (c: { value: string }) => (deDataIso(c.value) ? null : { data: true })]],
			notes: ['', [Validators.maxLength(300)]],
		});
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
		this.lancamentosService.buscarPorId(this.id).subscribe({
			next: (lancamento) => {
				this.lancamento.set(lancamento);
				this.formulario.reset({
					kind: lancamento.kind,
					description: lancamento.description,
					amount: lancamento.amount,
					entry_date: lancamento.entry_date,
					notes: lancamento.notes ?? '',
				});
				this.estado.set('carregado');
			},
			error: () => this.estado.set('erro'),
		});
	}

	public salvar(): void {
		if (this.formulario.invalid) {
			this.formulario.markAllAsTouched();
			return;
		}
		const valores = this.formulario.getRawValue();
		const dados: LancamentoFormulario = {
			kind: valores.kind,
			description: valores.description.trim(),
			amount: valores.amount,
			entry_date: valores.entry_date,
			notes: textoOuNulo(valores.notes),
		};
		const atual = this.lancamento();
		const requisicao = atual ? this.lancamentosService.atualizar(atual.id, dados) : this.lancamentosService.criar(dados);
		this.salvando.set(true);
		requisicao.subscribe({
			next: () => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'success', summary: atual ? 'Lançamento atualizado.' : 'Lançamento registrado.' });
				this.voltar();
			},
			error: (erro: unknown) => {
				this.salvando.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar o lançamento.') });
			},
		});
	}

	public confirmarExclusao(): void {
		const lancamento = this.lancamento();
		if (!lancamento) return;
		this.confirmationService.confirm({
			header: 'Excluir lançamento',
			message: `"${lancamento.description}" será apagado definitivamente.`,
			acceptLabel: 'Excluir',
			rejectLabel: 'Voltar',
			acceptButtonProps: { severity: 'danger' },
			rejectButtonProps: { variant: 'outlined' },
			accept: () => {
				this.salvando.set(true);
				this.lancamentosService.excluir(lancamento.id).subscribe({
					next: () => {
						this.salvando.set(false);
						this.messageService.add({ severity: 'success', summary: 'Lançamento excluído.' });
						this.voltar();
					},
					error: (erro: unknown) => {
						this.salvando.set(false);
						this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível excluir o lançamento.') });
					},
				});
			},
		});
	}

	public voltar(): void {
		this.router.navigate(['/administracao/financeiro']);
	}

	public invalido(campo: string): boolean {
		return campoInvalido(this.formulario.get(campo));
	}
}
