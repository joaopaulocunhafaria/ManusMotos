import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { DesignSettings } from '@manus/shared';
import { ConfirmationService, MessageService } from 'primeng/api';
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

	it('salva o Instagram sem @ e o logo escolhido', () => {
		componente.formulario.patchValue({ instagram: ' @Oficina.Teste_1 ', logo: 'data:image/png;base64,AAAA' });
		componente.salvar();
		expect(temaService.atualizar).toHaveBeenCalledWith(
			jasmine.objectContaining({ instagram: 'Oficina.Teste_1', logo: 'data:image/png;base64,AAAA' }),
		);
	});

	it('não salva Instagram com caracteres inválidos', () => {
		componente.formulario.patchValue({ instagram: 'oficina teste!' });
		componente.salvar();
		expect(temaService.atualizar).not.toHaveBeenCalled();
	});

	it('remover logo grava nulo', () => {
		componente.formulario.patchValue({ logo: 'data:image/png;base64,AAAA' });
		componente.removerLogo();
		componente.salvar();
		expect(temaService.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ logo: null }));
	});

	it('restaurar padrão mantém logo e Instagram', () => {
		componente.formulario.patchValue({ instagram: 'oficina', logo: 'data:image/png;base64,AAAA', primary_color: '#000000' });
		const confirmacao = fixture.debugElement.injector.get(ConfirmationService);
		spyOn(confirmacao, 'confirm').and.callFake((opcoes) => {
			opcoes.accept?.();
			return confirmacao;
		});
		componente.restaurarPadrao();
		expect(componente.formulario.get('instagram')?.value).toBe('oficina');
		expect(componente.formulario.get('logo')?.value).toBe('data:image/png;base64,AAAA');
		expect(componente.formulario.get('primary_color')?.value).toBe(IDENTIDADE_PADRAO.primary_color);
	});
});
