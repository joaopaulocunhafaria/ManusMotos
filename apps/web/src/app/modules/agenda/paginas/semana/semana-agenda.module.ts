import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ComponentsModule } from '../../../../components/components.module';
import { AgendaComponentesModule } from '../../_componentes/agenda-componentes.module';
import { SemanaAgendaRoutingModule } from './semana-agenda-routing.module';
import { SemanaAgendaComponent } from './semana-agenda.component';

@NgModule({
	declarations: [SemanaAgendaComponent],
	imports: [CommonModule, SemanaAgendaRoutingModule, ComponentsModule, AgendaComponentesModule, ButtonModule, DrawerModule],
})
export class SemanaAgendaModule {}
