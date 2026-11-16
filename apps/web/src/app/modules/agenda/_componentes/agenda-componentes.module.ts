import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ComponentsModule } from '../../../components/components.module';
import { FormularioAgendamentoComponent } from './formulario-agendamento/formulario-agendamento.component';

/** Componentes compartilhados da agenda. */
@NgModule({
	declarations: [FormularioAgendamentoComponent],
	imports: [CommonModule, ReactiveFormsModule, ComponentsModule, AutoCompleteModule, ButtonModule, InputTextModule, SelectModule],
	exports: [FormularioAgendamentoComponent],
})
export class AgendaComponentesModule {}
