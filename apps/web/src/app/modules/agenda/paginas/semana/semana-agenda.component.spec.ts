import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import type { Agendamento } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AgendamentosService } from '../../_servicos/agendamentos.service';
import { SemanaAgendaComponent } from './semana-agenda.component';
import { SemanaAgendaModule } from './semana-agenda.module';

describe('SemanaAgendaComponent', () => {
	let fixture: ComponentFixture<SemanaAgendaComponent>;
	let componente: SemanaAgendaComponent;
	let agendamentosService: jasmine.SpyObj<AgendamentosService>;
	let router: jasmine.SpyObj<Router>;
	const parametros = new BehaviorSubject(convertToParamMap({ semana: '2026-11-18' }));

	const agendamento: Agendamento = {
		id: '1',
		client_name: 'Maria',
		client_id: null,
		scheduled_date: '2026-11-17',
		start_time: '09:00:00',
		duration_minutes: 60,
		motorcycle_model: 'CG 160',
		service: null,
		created_at: '',
		updated_at: '',
	};

	beforeEach(async () => {
		agendamentosService = jasmine.createSpyObj<AgendamentosService>('AgendamentosService', ['buscarPorPeriodo']);
		agendamentosService.buscarPorPeriodo.and.returnValue(of([agendamento]));
		router = jasmine.createSpyObj<Router>('Router', ['navigate']);

		await TestBed.configureTestingModule({
			imports: [SemanaAgendaModule],
			providers: [
				provideNoopAnimations(),
				MessageService,
				{ provide: AgendamentosService, useValue: agendamentosService },
				{ provide: ActivatedRoute, useValue: { queryParamMap: parametros } },
				{ provide: Router, useValue: router },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(SemanaAgendaComponent);
		componente = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('carrega a semana da query string (segunda a domingo)', () => {
		expect(agendamentosService.buscarPorPeriodo).toHaveBeenCalledWith('2026-11-16', '2026-11-22');
		expect(componente.rotulo()).toBe('16 – 22 nov');
		expect(componente.estado()).toBe('carregado');
	});

	it('exibe o agendamento na coluna do dia', () => {
		const terca = componente.dias()[1];
		expect(terca.iso).toBe('2026-11-17');
		expect(terca.blocos.length).toBe(1);
		expect(fixture.nativeElement.textContent).toContain('Maria');
	});

	it('navega para a próxima semana', () => {
		componente.mudarSemana(1);
		expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { semana: '2026-11-23' } }));
	});

	it('abre o formulário ao tocar no bloco', () => {
		componente.abrirAgendamento(new MouseEvent('click'), componente.dias()[1].blocos[0]);
		expect(componente.drawerAberto()).toBeTrue();
		expect(componente.contexto()?.agendamento?.id).toBe('1');
	});

	it('mostra erro quando a busca falha', () => {
		agendamentosService.buscarPorPeriodo.and.returnValue(throwError(() => new Error('falha')));
		componente.carregar();
		expect(componente.estado()).toBe('erro');
	});
});
