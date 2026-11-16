import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'administracao' },
	{
		// Área administrativa da mecânica. Quando houver login, entra aqui o guard de autenticação/papel.
		path: 'administracao',
		loadChildren: () => import('./modules/common/base/base.module').then((m) => m.BaseModule),
	},
	{ path: '**', redirectTo: 'administracao' },
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule],
})
export class AppRoutingModule {}
