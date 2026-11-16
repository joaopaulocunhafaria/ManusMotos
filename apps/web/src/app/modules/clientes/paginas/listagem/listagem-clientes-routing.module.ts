import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListagemClientesComponent } from './listagem-clientes.component';

const routes: Routes = [{ path: '', component: ListagemClientesComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ListagemClientesRoutingModule {}
