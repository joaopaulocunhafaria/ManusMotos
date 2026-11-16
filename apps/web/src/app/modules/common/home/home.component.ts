import { Component } from '@angular/core';
import { TemaService } from '../../../services/tema.service';

@Component({
	selector: 'app-home',
	standalone: false,
	templateUrl: './home.component.html',
})
export class HomeComponent {
	public readonly atalhos = [
		{ label: 'Ordens de serviço', icone: 'pi pi-file-edit', rota: '/administracao/ordem-servico' },
		{ label: 'Clientes', icone: 'pi pi-users', rota: '/administracao/clientes' },
		{ label: 'Serviços', icone: 'pi pi-wrench', rota: '/administracao/servicos' },
		{ label: 'Aparência', icone: 'pi pi-palette', rota: '/administracao/configuracoes' },
	];

	constructor(public temaService: TemaService) {}
}
