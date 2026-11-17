import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListagemEstoqueComponent } from './listagem-estoque.component';

const routes: Routes = [{ path: '', component: ListagemEstoqueComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ListagemEstoqueRoutingModule {}
