import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ComponentsModule } from '../../../../components/components.module';
import { ClientesComponentesModule } from '../../_componentes/clientes-componentes.module';
import { FormularioClientePaginaRoutingModule } from './formulario-cliente-pagina-routing.module';
import { FormularioClientePaginaComponent } from './formulario-cliente-pagina.component';

@NgModule({
	declarations: [FormularioClientePaginaComponent],
	imports: [CommonModule, FormularioClientePaginaRoutingModule, ComponentsModule, ClientesComponentesModule, ButtonModule],
})
export class FormularioClientePaginaModule {}
