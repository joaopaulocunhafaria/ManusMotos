import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormularioLancamentoComponent } from './formulario-lancamento.component';

const routes: Routes = [{ path: '', component: FormularioLancamentoComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class FormularioLancamentoRoutingModule {}
