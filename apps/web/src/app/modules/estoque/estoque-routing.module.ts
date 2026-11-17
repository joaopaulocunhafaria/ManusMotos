import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		loadChildren: () => import('./paginas/listagem/listagem-estoque.module').then((m) => m.ListagemEstoqueModule),
	},
	{
		path: 'nova',
		loadChildren: () => import('./paginas/formulario/formulario-peca.module').then((m) => m.FormularioPecaModule),
	},
	{
		path: ':id',
		loadChildren: () => import('./paginas/formulario/formulario-peca.module').then((m) => m.FormularioPecaModule),
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class EstoqueRoutingModule {}
