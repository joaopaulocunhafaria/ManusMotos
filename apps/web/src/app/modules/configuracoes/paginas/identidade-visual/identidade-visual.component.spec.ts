import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { DesignSettings } from '@manus/shared';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { TemaService } from '../../../../services/tema.service';
import { IDENTIDADE_PADRAO } from '../../../../utils/_metodos/tema';
import { IdentidadeVisualModule } from './identidade-visual.module';
import { IdentidadeVisualComponent } from './identidade-visual.component';

describe('IdentidadeVisualComponent', () => {
	let fixture: ComponentFixture<IdentidadeVisualComponent>;
	let componente: IdentidadeVisualComponent;
	let temaService: jasmine.SpyObj<TemaService>;

	const config: DesignSettings = { ...IDENTIDADE_PADRAO, id: 1, updated_at: '', shop_name: 'Oficina Teste' };

	beforeEach(async () => {
		temaService = jasmine.createSpyObj<TemaService>('TemaService', ['buscar', 'atualizar']);
		temaService.buscar.and.returnValue(of(config));
		temaService.atualizar.and.returnValue(of(config));

		await TestBed.configureTestingModule({
			imports: [IdentidadeVisualModule, ReactiveFormsModule],
			providers: [provideNoopAnimations(), MessageService, { provide: TemaService, useValue: temaService }],
		}).compileComponents();

		fixture = TestBed.createComponent(IdentidadeVisualComponent);
		componente = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('carrega a identidade salva no formulário', () => {
		expect(componente.estado()).toBe('carregado');
		expect(componente.formulario.get('shop_name')?.value).toBe('Oficina Teste');
	});

	it('não salva com cor em formato inválido', () => {
		componente.formulario.patchValue({ primary_color: '#abc' });
		componente.salvar();
		expect(componente.formulario.invalid).toBeTrue();
		expect(temaService.atualizar).not.toHaveBeenCalled();
	});

	it('salva convertendo campos vazios em null', () => {
		componente.formulario.patchValue({ subtitle: '   ', primary_color: '#AABBCC' });
		componente.salvar();
		expect(temaService.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ subtitle: null, primary_color: '#aabbcc' }));
	});
});
