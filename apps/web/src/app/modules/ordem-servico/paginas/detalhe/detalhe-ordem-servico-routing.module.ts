import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetalheOrdemServicoComponent } from './detalhe-ordem-servico.component';

const routes: Routes = [{ path: '', component: DetalheOrdemServicoComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class DetalheOrdemServicoRoutingModule {}
