import { Component, computed, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Agendamento } from '@manus/shared';
import { Subscription } from 'rxjs';
import { EstadoTela } from '../../../../utils/_models/estado-tela';
import { ALTURA_HORA_PX } from '../../_constantes/agenda';
import {
	adicionarDias,
	deDataIso,
	horarioDeMinutos,
	inicioDaSemana,
	paraDataIso,
	proximaHoraCheia,
	rotuloSemana,
} from '../../_metodos/datas';
import { faixaHoras, montarBlocosDoDia } from '../../_metodos/layout-grade';
import { BlocoAgendamento, ContextoFormulario, DiaGrade } from '../../_modelos/agendamento.model';
import { AgendamentosService } from '../../_servicos/agendamentos.service';

/** Agenda semanal em grade (dias × horas). Cada página é uma semana, de segunda a domingo. */
@Component({
	selector: 'app-semana-agenda',
	standalone: false,
	templateUrl: './semana-agenda.component.html',
	styleUrl: './semana-agenda.component.scss',
})
export class SemanaAgendaComponent implements OnInit, OnDestroy {
	@ViewChild('ancoraRolagem') private ancoraRolagem?: ElementRef<HTMLElement>;

	public readonly alturaHora = ALTURA_HORA_PX;
	public estado = signal<EstadoTela>('carregando');
	public inicioSemana = signal(inicioDaSemana(new Date()));
	public agendamentos = signal<Agendamento[]>([]);
	public agora = signal(new Date());

	public drawerAberto = signal(false);
	public contexto = signal<ContextoFormulario | null>(null);

	public readonly rotulo = computed(() => rotuloSemana(this.inicioSemana()));
	public readonly semanaAtual = computed(() => paraDataIso(this.inicioSemana()) === paraDataIso(inicioDaSemana(this.agora())));
	public readonly faixa = computed(() => faixaHoras(this.agendamentos()));
	public readonly horas = computed(() => {
		const [inicio, fim] = this.faixa();
		return Array.from({ length: fim - inicio }, (_, indice) => inicio + indice);
	});
	public readonly alturaGrade = computed(() => this.horas().length * ALTURA_HORA_PX);
	public readonly dias = computed<DiaGrade[]>(() => {
		const hoje = paraDataIso(this.agora());
		const [horaInicio] = this.faixa();
		return Array.from({ length: 7 }, (_, indice) => {
			const data = adicionarDias(this.inicioSemana(), indice);
			const iso = paraDataIso(data);
			const doDia = this.agendamentos().filter((agendamento) => agendamento.scheduled_date === iso);
			return { data, iso, hoje: iso === hoje, blocos: montarBlocosDoDia(doDia, horaInicio, ALTURA_HORA_PX) };
		});
	});
	/** Posição (px) da linha da hora atual, ou `null` fora da faixa exibida. */
	public readonly topoAgora = computed(() => {
		const [inicio, fim] = this.faixa();
		const minutos = this.agora().getHours() * 60 + this.agora().getMinutes();
		return minutos < inicio * 60 || minutos > fim * 60 ? null : ((minutos - inicio * 60) / 60) * ALTURA_HORA_PX;
	});
	/** Topo da âncora para onde a grade rola ao abrir: 1h antes da hora atual (semana atual) ou 8h. */
	public readonly topoAncora = computed(() => {
		const [inicio] = this.faixa();
		const hora = this.semanaAtual() ? this.agora().getHours() - 1 : 8;
		return Math.max(hora - inicio, 0) * ALTURA_HORA_PX;
	});

	private inscricaoRota?: Subscription;
	private inscricaoBusca?: Subscription;
	private relogio?: ReturnType<typeof setInterval>;
	private deveRolar = true;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private agendamentosService: AgendamentosService,
	) {}

	ngOnInit(): void {
		this.relogio = setInterval(() => this.agora.set(new Date()), 60_000);
		this.inscricaoRota = this.route.queryParamMap.subscribe((parametros) => {
			const semana = deDataIso(parametros.get('semana'));
			this.inicioSemana.set(inicioDaSemana(semana ?? new Date()));
			this.deveRolar = true;
			this.agendamentos.set([]);
			this.carregar();
		});
	}

	ngOnDestroy(): void {
		clearInterval(this.relogio);
		this.inscricaoRota?.unsubscribe();
		this.inscricaoBusca?.unsubscribe();
	}

	public carregar(): void {
		const inicio = this.inicioSemana();
		this.estado.set('carregando');
		this.inscricaoBusca?.unsubscribe();
		this.inscricaoBusca = this.agendamentosService
			.buscarPorPeriodo(paraDataIso(inicio), paraDataIso(adicionarDias(inicio, 6)))
			.subscribe({
				next: (agendamentos) => {
					this.agendamentos.set(agendamentos);
					this.estado.set('carregado');
					this.rolarParaHorario();
				},
				error: () => this.estado.set('erro'),
			});
	}

	public mudarSemana(deslocamento: number): void {
		this.irParaSemana(adicionarDias(this.inicioSemana(), deslocamento * 7));
	}

	public irParaHoje(): void {
		this.irParaSemana(null);
	}

	/** Novo agendamento: hoje (ou a segunda da semana exibida) no próximo horário cheio. */
	public abrirNovo(): void {
		const data = this.semanaAtual() ? this.agora() : this.inicioSemana();
		this.abrirFormulario({ agendamento: null, data: paraDataIso(data), horario: proximaHoraCheia(this.agora()) });
	}

	/** Toque num espaço vazio da coluna: novo agendamento naquele dia, arredondado para a meia hora. */
	public aoTocarDia(evento: MouseEvent, dia: DiaGrade): void {
		const coluna = (evento.currentTarget as HTMLElement).getBoundingClientRect();
		const meiasHoras = Math.floor(((evento.clientY - coluna.top) / ALTURA_HORA_PX) * 2);
		const minutos = Math.min(this.faixa()[0] * 60 + Math.max(meiasHoras, 0) * 30, 23 * 60 + 30);
		this.abrirFormulario({ agendamento: null, data: dia.iso, horario: horarioDeMinutos(minutos) });
	}

	public abrirAgendamento(evento: MouseEvent, bloco: BlocoAgendamento): void {
		evento.stopPropagation();
		const agendamento = bloco.agendamento;
		this.abrirFormulario({ agendamento, data: agendamento.scheduled_date, horario: agendamento.start_time.slice(0, 5) });
	}

	public aoConcluirFormulario(): void {
		this.drawerAberto.set(false);
		this.carregar();
	}

	public rotuloBloco(bloco: BlocoAgendamento): string {
		const { client_name, motorcycle_model, service } = bloco.agendamento;
		return [`${bloco.inicio}–${bloco.fim}`, client_name, motorcycle_model, service].filter(Boolean).join(', ');
	}

	public identificarDia(_: number, dia: DiaGrade): string {
		return dia.iso;
	}

	public identificarBloco(_: number, bloco: BlocoAgendamento): string {
		return bloco.agendamento.id;
	}

	private abrirFormulario(contexto: ContextoFormulario): void {
		this.contexto.set(contexto);
		this.drawerAberto.set(true);
	}

	private irParaSemana(data: Date | null): void {
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { semana: data && paraDataIso(data) !== paraDataIso(inicioDaSemana(new Date())) ? paraDataIso(data) : null },
		});
	}

	/** Ao trocar de semana, rola a página até o horário de trabalho (a grade é maior que a tela). */
	private rolarParaHorario(): void {
		if (!this.deveRolar) return;
		this.deveRolar = false;
		setTimeout(() => this.ancoraRolagem?.nativeElement.scrollIntoView({ block: 'start' }));
	}
}
