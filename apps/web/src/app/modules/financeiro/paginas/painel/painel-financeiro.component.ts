import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { campoInvalido } from '../../../../utils/_formularios/campos';
import { deDataIso, formatarDataIso, hojeIso } from '../../../../utils/_metodos/datas';
import { mensagemErro } from '../../../../utils/_metodos/supabase';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { ORIGEM_EXTRATO_ICONE, ORIGEM_EXTRATO_LABEL, TIPO_PERIODO_LABEL } from '../../_enums/origem-extrato';
import { deslocarPeriodo, parametrosDoPeriodo, periodoDaUrl, periodoQueContem, rotuloPeriodo } from '../../_metodos/periodos';
import { ItemExtrato, Periodo, ResumoFinanceiro, TipoPeriodo } from '../../_modelos/resumo-financeiro.model';
import { FinanceiroService } from '../../_servicos/financeiro.service';

/** Limite de `numeric(12, 2)` do valor inicial do caixa. */
const CAIXA_LIMITE = 9_999_999_999.99;

/** Página `/administracao/financeiro`: balanço do período, caixa e extrato. */
@Component({
	selector: 'app-painel-financeiro',
	standalone: false,
	templateUrl: './painel-financeiro.component.html',
	styleUrl: './painel-financeiro.component.scss',
})
export class PainelFinanceiroComponent implements OnInit, OnDestroy {
	public periodo = signal<Periodo>(periodoQueContem('mes', new Date()));
	public resumo = signal<ResumoFinanceiro | null>(null);
	public estado = signal<EstadoTela>('carregando');

	public extrato = signal<ItemExtrato[]>([]);
	public totalExtrato = signal(0);
	public estadoExtrato = signal<EstadoTela>('carregando');
	public carregandoMais = signal(false);

	public configurandoCaixa = signal(false);
	public salvandoCaixa = signal(false);
	public formularioCaixa: FormGroup;

	/** Datas digitadas no período personalizado (antes de aplicar). */
	public personalizadoDe = '';
	public personalizadoAte = '';
	public erroPersonalizado = signal<string | null>(null);

	public readonly tipos: TipoPeriodo[] = ['semana', 'mes', 'ano', 'personalizado'];
	public readonly labelTipo = TIPO_PERIODO_LABEL;
	public readonly labelOrigem = ORIGEM_EXTRATO_LABEL;
	public readonly iconeOrigem = ORIGEM_EXTRATO_ICONE;
	public readonly formatarData = formatarDataIso;
	public readonly caixaLimite = CAIXA_LIMITE;

	public rotulo = computed(() => rotuloPeriodo(this.periodo()));

	private paginaExtrato = 0;
	/** Descarta respostas de um período que já não está na tela. */
	private versao = 0;
	private inscricaoUrl?: Subscription;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private formBuilder: FormBuilder,
		private financeiroService: FinanceiroService,
		private messageService: MessageService,
	) {
		this.formularioCaixa = this.formBuilder.group({
			opening_balance: [0 as number | null, [Validators.required, Validators.min(-CAIXA_LIMITE), Validators.max(CAIXA_LIMITE)]],
			opening_date: ['', [Validators.required, (c: { value: string }) => (deDataIso(c.value) ? null : { data: true })]],
		});
	}

	ngOnInit(): void {
		this.inscricaoUrl = this.route.queryParamMap.subscribe((parametros) => {
			const { periodo, valido } = periodoDaUrl(
				{ periodo: parametros.get('periodo'), de: parametros.get('de'), ate: parametros.get('ate') },
				new Date(),
			);
			if (!valido) {
				this.messageService.add({ severity: 'warn', summary: 'Período inválido. Mostrando o mês atual.' });
				this.irPara(periodo, true);
				return;
			}
			this.periodo.set(periodo);
			this.personalizadoDe = periodo.de;
			this.personalizadoAte = periodo.ate;
			this.erroPersonalizado.set(null);
			this.carregar();
		});
	}

	ngOnDestroy(): void {
		this.inscricaoUrl?.unsubscribe();
	}

	public carregar(): void {
		const { de, ate } = this.periodo();
		const versao = ++this.versao;
		this.estado.set('carregando');
		this.financeiroService.resumo(de, ate).subscribe({
			next: (resumo) => {
				if (versao !== this.versao) return;
				this.resumo.set(resumo);
				this.estado.set('carregado');
			},
			error: () => versao === this.versao && this.estado.set('erro'),
		});
		this.carregarExtrato(versao);
	}

	public carregarExtrato(versao = this.versao): void {
		const { de, ate } = this.periodo();
		this.paginaExtrato = 0;
		this.estadoExtrato.set('carregando');
		this.financeiroService.extrato(de, ate, 0).subscribe({
			next: ({ itens, total }) => {
				if (versao !== this.versao) return;
				this.extrato.set(itens);
				this.totalExtrato.set(total);
				this.estadoExtrato.set(itens.length ? 'carregado' : 'vazio');
			},
			error: () => versao === this.versao && this.estadoExtrato.set('erro'),
		});
	}

	public carregarMais(): void {
		const { de, ate } = this.periodo();
		const versao = this.versao;
		this.carregandoMais.set(true);
		this.financeiroService.extrato(de, ate, this.paginaExtrato + 1).subscribe({
			next: ({ itens, total }) => {
				this.carregandoMais.set(false);
				if (versao !== this.versao) return;
				this.paginaExtrato++;
				this.extrato.update((atuais) => [...atuais, ...itens]);
				this.totalExtrato.set(total);
			},
			error: (erro: unknown) => {
				this.carregandoMais.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível carregar mais lançamentos.') });
			},
		});
	}

	public escolherTipo(tipo: TipoPeriodo): void {
		if (tipo === this.periodo().tipo) return;
		if (tipo === 'personalizado') {
			this.irPara({ ...this.periodo(), tipo });
			return;
		}
		this.irPara(periodoQueContem(tipo, new Date()));
	}

	public deslocar(passo: number): void {
		this.irPara(deslocarPeriodo(this.periodo(), passo));
	}

	public aplicarPersonalizado(): void {
		const de = deDataIso(this.personalizadoDe);
		const ate = deDataIso(this.personalizadoAte);
		if (!de || !ate) {
			this.erroPersonalizado.set('Informe as duas datas.');
			return;
		}
		if (de > ate) {
			this.erroPersonalizado.set('A data inicial não pode ser depois da final.');
			return;
		}
		this.erroPersonalizado.set(null);
		this.irPara({ tipo: 'personalizado', de: this.personalizadoDe, ate: this.personalizadoAte });
	}

	/** Rota de detalhe do item do extrato (`null` quando não há o que abrir, ex.: peça excluída). */
	public rotaItem(item: ItemExtrato): string[] | null {
		if (item.source === 'os') return ['/administracao/ordem-servico', item.ref_id];
		if (item.source === 'income' || item.source === 'expense') return ['/administracao/financeiro/lancamentos', item.ref_id];
		return item.part_id ? ['/administracao/estoque', item.part_id] : null;
	}

	public abrirConfiguracaoCaixa(): void {
		const resumo = this.resumo();
		this.formularioCaixa.reset({ opening_balance: resumo?.opening_balance ?? 0, opening_date: resumo?.opening_date ?? hojeIso() });
		this.configurandoCaixa.set(true);
	}

	public salvarCaixa(): void {
		if (this.formularioCaixa.invalid) {
			this.formularioCaixa.markAllAsTouched();
			return;
		}
		const { opening_balance, opening_date } = this.formularioCaixa.getRawValue();
		this.salvandoCaixa.set(true);
		this.financeiroService.salvarCaixa(opening_balance, opening_date).subscribe({
			next: () => {
				this.salvandoCaixa.set(false);
				this.configurandoCaixa.set(false);
				this.messageService.add({ severity: 'success', summary: 'Caixa atualizado.' });
				this.carregar();
			},
			error: (erro: unknown) => {
				this.salvandoCaixa.set(false);
				this.messageService.add({ severity: 'error', summary: mensagemErro(erro, 'Não foi possível salvar o caixa.') });
			},
		});
	}

	public caixaInvalido(campo: string): boolean {
		return campoInvalido(this.formularioCaixa.get(campo));
	}

	public novoLancamento(tipo: 'income' | 'expense'): void {
		this.router.navigate(['/administracao/financeiro/lancamentos/novo'], { queryParams: { tipo } });
	}

	private irPara(periodo: Periodo, substituir = false): void {
		this.router.navigate([], { relativeTo: this.route, queryParams: parametrosDoPeriodo(periodo), replaceUrl: substituir });
	}
}
