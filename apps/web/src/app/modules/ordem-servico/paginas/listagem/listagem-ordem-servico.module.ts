import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ComponentsModule } from '../../../../components/components.module';
import { OrdemServicoComponentesModule } from '../../_componentes/ordem-servico-componentes.module';
import { ListagemOrdemServicoRoutingModule } from './listagem-ordem-servico-routing.module';
import { ListagemOrdemServicoComponent } from './listagem-ordem-servico.component';

@NgModule({
	declarations: [ListagemOrdemServicoComponent],
	imports: [
		CommonModule,
		FormsModule,
		ListagemOrdemServicoRoutingModule,
		ComponentsModule,
		OrdemServicoComponentesModule,
		ButtonModule,
		IconFieldModule,
		InputIconModule,
		InputTextModule,
		SelectModule,
	],
})
export class ListagemOrdemServicoModule {}
