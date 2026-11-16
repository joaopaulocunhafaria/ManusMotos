import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormularioClienteComponent } from './formulario-cliente/formulario-cliente.component';

/** Componentes do domínio de clientes (reutilizados na OS). */
@NgModule({
	declarations: [FormularioClienteComponent],
	imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule],
	exports: [FormularioClienteComponent],
})
export class ClientesComponentesModule {}
