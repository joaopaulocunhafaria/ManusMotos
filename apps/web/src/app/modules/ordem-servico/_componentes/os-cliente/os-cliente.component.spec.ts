import { ComponentFixture, TestBed } from '@angular/core/testing';
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

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [OrdemServicoComponentesModule] }).compileComponents();
		fixture = TestBed.createComponent(OsClienteComponent);
		fixture.componentInstance.ordem = ordem;
		fixture.detectChanges();
	});

	it('mostra o resumo para o cliente', () => {
		const texto: string = fixture.nativeElement.textContent;
		expect(texto).toContain('OS #7');
		expect(texto).toContain('Troca de óleo');
		expect(texto).toContain('3x de');
		expect(texto).toContain('Peças inclusas.');
	});

	it('não expõe dados internos', () => {
		const texto: string = fixture.nativeElement.textContent;
		expect(texto).not.toContain('NOTA INTERNA SECRETA');
		expect(texto).not.toContain('529.982.247-25');
		expect(texto).not.toContain('Rua X');
		expect(texto).not.toContain('Rascunho');
	});
});
