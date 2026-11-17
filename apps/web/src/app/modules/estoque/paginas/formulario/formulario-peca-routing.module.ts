import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormularioPecaComponent } from './formulario-peca.component';

const routes: Routes = [{ path: '', component: FormularioPecaComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class FormularioPecaRoutingModule {}
