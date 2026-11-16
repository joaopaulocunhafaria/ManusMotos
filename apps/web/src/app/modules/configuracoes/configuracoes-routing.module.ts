import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'identidade-visual' },
	{
		path: 'identidade-visual',
		loadChildren: () => import('./paginas/identidade-visual/identidade-visual.module').then((m) => m.IdentidadeVisualModule),
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ConfiguracoesRoutingModule {}
