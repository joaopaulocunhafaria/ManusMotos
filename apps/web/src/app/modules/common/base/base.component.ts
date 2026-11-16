import { Component } from '@angular/core';
import { TemaService } from '../../../services/tema.service';

interface ItemNavegacao {
	label: string;
	icone: string;
	rota: string;
}

@Component({
	selector: 'app-base',
	standalone: false,
	templateUrl: './base.component.html',
})
export class BaseComponent {
	public readonly itensNavegacao: ItemNavegacao[] = [
		{ label: 'Agenda', icone: 'pi pi-calendar', rota: '/administracao/agenda' },
		{ label: 'OS', icone: 'pi pi-file-edit', rota: '/administracao/ordem-servico' },
		{ label: 'Serviços', icone: 'pi pi-wrench', rota: '/administracao/servicos' },
		{ label: 'Clientes', icone: 'pi pi-users', rota: '/administracao/clientes' },
		{ label: 'Aparência', icone: 'pi pi-palette', rota: '/administracao/configuracoes' },
	];

	constructor(public temaService: TemaService) {}
}
