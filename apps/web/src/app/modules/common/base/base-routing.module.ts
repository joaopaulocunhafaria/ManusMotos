import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BaseComponent } from './base.component';

/** Filhos de `/administracao`. */
const routes: Routes = [
	{
		path: '',
		component: BaseComponent,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'agenda' },
			{ path: 'inicio', pathMatch: 'full', redirectTo: 'agenda' },
			{
				path: 'agenda',
				loadChildren: () => import('../../agenda/agenda.module').then((m) => m.AgendaModule),
			},
			{
				path: 'ordem-servico',
				loadChildren: () => import('../../ordem-servico/ordem-servico.module').then((m) => m.OrdemServicoModule),
			},
			{
				path: 'estoque',
				loadChildren: () => import('../../estoque/estoque.module').then((m) => m.EstoqueModule),
			},
			{
				path: 'financeiro',
				loadChildren: () => import('../../financeiro/financeiro.module').then((m) => m.FinanceiroModule),
			},
			{
				path: 'servicos',
				loadChildren: () => import('../../servicos/servicos.module').then((m) => m.ServicosModule),
			},
			{
				path: 'clientes',
				loadChildren: () => import('../../clientes/clientes.module').then((m) => m.ClientesModule),
			},
			{
				path: 'configuracoes',
				loadChildren: () => import('../../configuracoes/configuracoes.module').then((m) => m.ConfiguracoesModule),
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class BaseRoutingModule {}
