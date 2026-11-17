import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/** Filhos de `/administracao/financeiro`. */
const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		loadChildren: () => import('./paginas/painel/painel-financeiro.module').then((m) => m.PainelFinanceiroModule),
	},
	{
		path: 'lancamentos/novo',
		loadChildren: () => import('./paginas/lancamento/formulario-lancamento.module').then((m) => m.FormularioLancamentoModule),
	},
	{
		path: 'lancamentos/:id',
		loadChildren: () => import('./paginas/lancamento/formulario-lancamento.module').then((m) => m.FormularioLancamentoModule),
	},
	{ path: '**', redirectTo: '' },
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class FinanceiroRoutingModule {}
