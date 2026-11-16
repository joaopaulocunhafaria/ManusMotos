import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { ClienteComMotos } from '../../../clientes/_modelos/cliente.model';
import { ClientesService } from '../../../clientes/_servicos/clientes.service';
import { ServicosService } from '../../../servicos/_servicos/servicos.service';
import { OrdemServicoService } from '../../_servicos/ordem-servico.service';
import { FormularioOrdemServicoComponent } from './formulario-ordem-servico.component';
import { FormularioOrdemServicoModule } from './formulario-ordem-servico.module';

describe('FormularioOrdemServicoComponent', () => {
	let fixture: ComponentFixture<FormularioOrdemServicoComponent>;
	let componente: FormularioOrdemServicoComponent;
	let ordemServicoService: jasmine.SpyObj<OrdemServicoService>;
	let router: jasmine.SpyObj<Router>;

	const cliente: ClienteComMotos = {
		id: 'c1',
		name: 'Carlos',
		phone: '31987654321',
		document: '52998224725',
		address: null,
		created_at: '',
		updated_at: '',
		motorcycles: [{ id: 'm1', client_id: 'c1', model: 'CG 160', color: 'Vermelha', plate: 'ABC1D23', created_at: '', updated_at: '' }],
	};

	beforeEach(async () => {
		ordemServicoService = jasmine.createSpyObj<OrdemServicoService>('OrdemServicoService', ['buscarPorId', 'salvar']);
		ordemServicoService.salvar.and.returnValue(of('os-1'));
		router = jasmine.createSpyObj<Router>('Router', ['navigate']);

		await TestBed.configureTestingModule({
			imports: [FormularioOrdemServicoModule],
			providers: [
				provideNoopAnimations(),
				MessageService,
				{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
				{ provide: Router, useValue: router },
				{ provide: OrdemServicoService, useValue: ordemServicoService },
				{ provide: ClientesService, useValue: jasmine.createSpyObj('ClientesService', ['buscar', 'buscarPorId']) },
				{ provide: ServicosService, useValue: jasmine.createSpyObj('ServicosService', ['buscarAtivos', 'criar']) },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(FormularioOrdemServicoComponent);
		componente = fixture.componentInstance;
		fixture.detectChanges();
	});

	function preencherValido(): void {
		componente.formulario.get('cliente')!.setValue(cliente);
		componente.aoSelecionarCliente(cliente);
		componente.itens.at(0).patchValue({ servico: { id: 's1', name: 'Troca de óleo' }, price: 60 });
		componente.adicionarItem({ id: 's2', name: 'Relação' }, 250);
	}

	it('começa com um item e seleciona a moto única do cliente', () => {
		expect(componente.itens.length).toBe(1);
		preencherValido();
		expect(componente.formulario.get('motorcycle_id')!.value).toBe('m1');
	});

	it('calcula total, saldo e parcela', () => {
		preencherValido();
		componente.formulario.patchValue({ payment_method: 'installments', installments: 2, down_payment: 110 });
		expect(componente.total()).toBe(310);
		expect(componente.saldo()).toBe(200);
		expect(componente.valorDaParcela()).toBe(100);
	});

	it('não salva com entrada maior que o total', () => {
		preencherValido();
		componente.formulario.patchValue({ down_payment: 500 });
		componente.salvar();
		expect(componente.formulario.errors?.['entradaMaiorQueTotal']).toBeTrue();
		expect(ordemServicoService.salvar).not.toHaveBeenCalled();
	});

	it('exige parcelas no pagamento parcelado', () => {
		preencherValido();
		componente.formulario.patchValue({ payment_method: 'installments' });
		expect(componente.formulario.errors?.['parcelasObrigatorias']).toBeTrue();
	});

	it('envia os dados e itens para a RPC e abre o detalhe', () => {
		preencherValido();
		componente.formulario.patchValue({ mileage: 23500, notes: '  barulho  ' });
		componente.salvar();
		expect(ordemServicoService.salvar).toHaveBeenCalledWith(
			null,
			jasmine.objectContaining({
				client_id: 'c1',
				motorcycle_id: 'm1',
				mileage: 23500,
				payment_method: 'pix',
				installments: null,
				notes: 'barulho',
			}),
			[
				{ service_id: 's1', price: 60 },
				{ service_id: 's2', price: 250 },
			],
		);
		expect(router.navigate).toHaveBeenCalledWith(['/administracao/ordem-servico', 'os-1'], { replaceUrl: true });
	});
});
