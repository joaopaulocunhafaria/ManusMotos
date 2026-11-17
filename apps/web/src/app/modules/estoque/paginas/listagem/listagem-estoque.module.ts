import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ComponentsModule } from '../../../../components/components.module';
import { EstoqueComponentesModule } from '../../_componentes/estoque-componentes.module';
import { ListagemEstoqueRoutingModule } from './listagem-estoque-routing.module';
import { ListagemEstoqueComponent } from './listagem-estoque.component';

@NgModule({
	declarations: [ListagemEstoqueComponent],
	imports: [
		CommonModule,
		RouterModule,
		ListagemEstoqueRoutingModule,
		ComponentsModule,
		DrawerModule,
		EstoqueComponentesModule,
		ButtonModule,
		IconFieldModule,
		InputIconModule,
		InputTextModule,
		TagModule,
	],
})
export class ListagemEstoqueModule {}
