import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ComponentsModule } from '../../../../components/components.module';
import { FormularioPecaRoutingModule } from './formulario-peca-routing.module';
import { FormularioPecaComponent } from './formulario-peca.component';

@NgModule({
	declarations: [FormularioPecaComponent],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormularioPecaRoutingModule,
		ComponentsModule,
		ButtonModule,
		ConfirmDialogModule,
		InputNumberModule,
		InputTextModule,
	],
})
export class FormularioPecaModule {}
