import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ComponentsModule } from '../../../../components/components.module';
import { ListagemServicosRoutingModule } from './listagem-servicos-routing.module';
import { ListagemServicosComponent } from './listagem-servicos.component';

@NgModule({
	declarations: [ListagemServicosComponent],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		ListagemServicosRoutingModule,
		ComponentsModule,
		ButtonModule,
		DrawerModule,
		IconFieldModule,
		InputIconModule,
		InputTextModule,
		TagModule,
	],
})
export class ListagemServicosModule {}
