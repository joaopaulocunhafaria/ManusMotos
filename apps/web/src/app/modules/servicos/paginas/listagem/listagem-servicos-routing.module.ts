import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListagemServicosComponent } from './listagem-servicos.component';

const routes: Routes = [{ path: '', component: ListagemServicosComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ListagemServicosRoutingModule {}
