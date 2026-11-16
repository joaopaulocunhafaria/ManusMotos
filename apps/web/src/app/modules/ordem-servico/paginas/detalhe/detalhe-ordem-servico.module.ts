import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { ComponentsModule } from '../../../../components/components.module';
import { OrdemServicoComponentesModule } from '../../_componentes/ordem-servico-componentes.module';
import { DetalheOrdemServicoRoutingModule } from './detalhe-ordem-servico-routing.module';
import { DetalheOrdemServicoComponent } from './detalhe-ordem-servico.component';

@NgModule({
	declarations: [DetalheOrdemServicoComponent],
	imports: [
		CommonModule,
		DetalheOrdemServicoRoutingModule,
		ComponentsModule,
		OrdemServicoComponentesModule,
		ButtonModule,
		CardModule,
		ConfirmDialogModule,
		DrawerModule,
		MenuModule,
		TagModule,
	],
})
export class DetalheOrdemServicoModule {}
