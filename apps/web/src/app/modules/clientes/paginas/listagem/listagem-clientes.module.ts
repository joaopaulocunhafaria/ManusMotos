import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ComponentsModule } from '../../../../components/components.module';
import { ListagemClientesRoutingModule } from './listagem-clientes-routing.module';
import { ListagemClientesComponent } from './listagem-clientes.component';

@NgModule({
	declarations: [ListagemClientesComponent],
	imports: [
		CommonModule,
		ListagemClientesRoutingModule,
		ComponentsModule,
		ButtonModule,
		IconFieldModule,
		InputIconModule,
		InputTextModule,
	],
})
export class ListagemClientesModule {}
