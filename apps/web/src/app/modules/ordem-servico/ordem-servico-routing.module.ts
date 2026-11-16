import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/** Filhos de `/administracao/ordem-servico`. */
const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		loadChildren: () => import('./paginas/listagem/listagem-ordem-servico.module').then((m) => m.ListagemOrdemServicoModule),
	},
	{
		path: 'nova',
		loadChildren: () => import('./paginas/formulario/formulario-ordem-servico.module').then((m) => m.FormularioOrdemServicoModule),
	},
	{
		path: ':id/editar',
		loadChildren: () => import('./paginas/formulario/formulario-ordem-servico.module').then((m) => m.FormularioOrdemServicoModule),
	},
	{
		path: ':id',
		loadChildren: () => import('./paginas/detalhe/detalhe-ordem-servico.module').then((m) => m.DetalheOrdemServicoModule),
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class OrdemServicoRoutingModule {}
