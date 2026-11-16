import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListagemOrdemServicoComponent } from './listagem-ordem-servico.component';

const routes: Routes = [{ path: '', component: ListagemOrdemServicoComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ListagemOrdemServicoRoutingModule {}
