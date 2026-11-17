import { Component, OnDestroy, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { TemaService } from '../../../services/tema.service';

interface ItemNavegacao {
	label: string;
	icone: string;
	rota: string;
}

const AGENDA: ItemNavegacao = { label: 'Agenda', icone: 'pi pi-calendar', rota: '/administracao/agenda' };
const OS: ItemNavegacao = { label: 'OS', icone: 'pi pi-file-edit', rota: '/administracao/ordem-servico' };
const ESTOQUE: ItemNavegacao = { label: 'Estoque', icone: 'pi pi-box', rota: '/administracao/estoque' };
const CLIENTES: ItemNavegacao = { label: 'Clientes', icone: 'pi pi-users', rota: '/administracao/clientes' };

@Component({
	selector: 'app-base',
	standalone: false,
	templateUrl: './base.component.html',
})
export class BaseComponent implements OnDestroy {
	/** Atalhos da barra inferior (o 5º item é o botão "Menu"). */
	public readonly itensBarra: ItemNavegacao[] = [AGENDA, OS, ESTOQUE, CLIENTES];

	/** Todas as áreas, no menu lateral. */
	public readonly itensMenu: ItemNavegacao[] = [
		AGENDA,
		{ ...OS, label: 'Ordens de serviço' },
		ESTOQUE,
		CLIENTES,
		{ label: 'Financeiro', icone: 'pi pi-wallet', rota: '/administracao/financeiro' },
		{ label: 'Serviços', icone: 'pi pi-wrench', rota: '/administracao/servicos' },
		{ label: 'Aparência', icone: 'pi pi-palette', rota: '/administracao/configuracoes' },
	];

	public menuAberto = signal(false);

	private readonly navegacao: Subscription;

	constructor(
		public temaService: TemaService,
		private router: Router,
	) {
		this.navegacao = this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)).subscribe(() => this.fecharMenu());
	}

	ngOnDestroy(): void {
		this.navegacao.unsubscribe();
	}

	public abrirMenu(): void {
		this.menuAberto.set(true);
	}

	public fecharMenu(): void {
		this.menuAberto.set(false);
	}
}
