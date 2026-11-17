import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemaService } from '../../../../services/tema.service';
import { IDENTIDADE_PADRAO } from '../../../../utils/_metodos/tema';
import { OrdemServicoDetalhada } from '../../_modelos/ordem-servico.model';
import { OrdemServicoComponentesModule } from '../ordem-servico-componentes.module';
import { OsClienteComponent } from './os-cliente.component';

describe('OsClienteComponent', () => {
	let fixture: ComponentFixture<OsClienteComponent>;

	const ordem: OrdemServicoDetalhada = {
		id: 'o1',
		number: 7,
		client_id: 'c1',
		motorcycle_id: 'm1',
		mileage: 23500,
		status: 'draft',
		payment_method: 'installments',
		installments: 3,
		down_payment: 100,
		total: 400,
		order_date: '2026-11-16',
		estimated_time: '2 dias',
		work_estimate_minutes: 30,
		work_seconds: 4321,
		work_started_at: null,
		notes: 'NOTA INTERNA SECRETA',
		customer_notes: 'Peças inclusas.',
		created_at: '',
		updated_at: '',
		clients: {
			id: 'c1',
			name: 'Carlos',
			phone: '31987654321',
			document: '52998224725',
			address: 'Rua X',
			created_at: '',
			updated_at: '',
		},
		motorcycles: { id: 'm1', client_id: 'c1', model: 'CG 160', color: 'Vermelha', plate: 'ABC1D23', created_at: '', updated_at: '' },
		service_order_items: [
			{ id: 'i1', service_order_id: 'o1', service_id: 's1', service_name: 'Troca de óleo', price: 400, position: 0, created_at: '' },
		],
	};

	const logo = 'data:image/png;base64,iVBORw0KGgo=';

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [OrdemServicoComponentesModule] }).compileComponents();
		TestBed.inject(TemaService).config.set({
			...IDENTIDADE_PADRAO,
			shop_name: 'Oficina Teste',
			whatsapp: '37999095330',
			instagram: 'oficinateste',
			logo,
		});
		fixture = TestBed.createComponent(OsClienteComponent);
		fixture.componentInstance.ordem = ordem;
		fixture.detectChanges();
	});

	it('mostra o documento formal com cabeçalho da oficina, cliente, moto e serviços', () => {
		const texto: string = fixture.nativeElement.textContent;
		expect(texto).toContain('Ordem de serviço');
		expect(texto).toContain('000007');
		expect(texto).toContain('Oficina Teste');
		expect(texto).toContain('(37) 99909-5330');
		expect(texto).toContain('@oficinateste');
		expect(texto).toContain('529.982.247-25');
		expect(texto).toContain('ABC1D23');
		expect(texto).toContain('Previsão de entrega');
		expect(texto).toContain('2 dias');
		expect(texto).toContain('Troca de óleo');
		expect(texto).toContain('3x de');
		expect(texto).toContain('Peças inclusas.');
	});

	it('não expõe dados internos', () => {
		const texto: string = fixture.nativeElement.textContent;
		expect(texto).not.toContain('NOTA INTERNA SECRETA');
		expect(texto).not.toContain('0:30');
		expect(texto).not.toContain('1:12:01');
		expect(texto).not.toContain('Rua X');
		expect(texto).not.toContain('Rascunho');
	});

	it('mostra o logo da oficina', () => {
		const imagem: HTMLImageElement | null = fixture.nativeElement.querySelector('img.doc-logo');
		expect(imagem?.getAttribute('src')).toBe(logo);
	});

	it('sem logo, mostra só o nome da oficina', () => {
		TestBed.inject(TemaService).config.set({ ...IDENTIDADE_PADRAO, shop_name: 'Sem Logo' });
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('img.doc-logo')).toBeNull();
		expect(fixture.nativeElement.textContent).toContain('Sem Logo');
	});
});
