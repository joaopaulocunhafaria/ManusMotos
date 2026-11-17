import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ComponentsModule } from '../../../../components/components.module';
import { FormularioLancamentoRoutingModule } from './formulario-lancamento-routing.module';
import { FormularioLancamentoComponent } from './formulario-lancamento.component';

@NgModule({
	declarations: [FormularioLancamentoComponent],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormularioLancamentoRoutingModule,
		ComponentsModule,
		ButtonModule,
		ConfirmDialogModule,
		InputNumberModule,
		InputTextModule,
		SelectButtonModule,
	],
})
export class FormularioLancamentoModule {}
