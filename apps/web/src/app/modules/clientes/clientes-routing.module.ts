import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		loadChildren: () => import('./paginas/listagem/listagem-clientes.module').then((m) => m.ListagemClientesModule),
	},
	{
		path: 'novo',
		loadChildren: () => import('./paginas/formulario/formulario-cliente-pagina.module').then((m) => m.FormularioClientePaginaModule),
	},
	{
		path: ':id',
		loadChildren: () => import('./paginas/formulario/formulario-cliente-pagina.module').then((m) => m.FormularioClientePaginaModule),
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ClientesRoutingModule {}
