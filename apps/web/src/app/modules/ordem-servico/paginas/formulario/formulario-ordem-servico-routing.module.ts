import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormularioOrdemServicoComponent } from './formulario-ordem-servico.component';

const routes: Routes = [{ path: '', component: FormularioOrdemServicoComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class FormularioOrdemServicoRoutingModule {}
