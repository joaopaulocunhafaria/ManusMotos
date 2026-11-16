import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ComponentsModule } from '../../../../components/components.module';
import { ClientesComponentesModule } from '../../../clientes/_componentes/clientes-componentes.module';
import { FormularioOrdemServicoRoutingModule } from './formulario-ordem-servico-routing.module';
import { FormularioOrdemServicoComponent } from './formulario-ordem-servico.component';

@NgModule({
	declarations: [FormularioOrdemServicoComponent],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormularioOrdemServicoRoutingModule,
		ComponentsModule,
		ClientesComponentesModule,
		AutoCompleteModule,
		ButtonModule,
		CardModule,
		DrawerModule,
		InputNumberModule,
		InputTextModule,
		SelectModule,
		SelectButtonModule,
		TextareaModule,
	],
})
export class FormularioOrdemServicoModule {}
