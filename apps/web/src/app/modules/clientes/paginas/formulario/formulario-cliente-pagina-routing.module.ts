import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormularioClientePaginaComponent } from './formulario-cliente-pagina.component';

const routes: Routes = [{ path: '', component: FormularioClientePaginaComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class FormularioClientePaginaRoutingModule {}
