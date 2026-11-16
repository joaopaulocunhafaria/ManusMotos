import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ComponentsModule } from '../../../components/components.module';
import { CartaoOrdemServicoComponent } from './cartao-ordem-servico/cartao-ordem-servico.component';
import { OsClienteComponent } from './os-cliente/os-cliente.component';

/** Componentes do domínio de ordem de serviço. */
@NgModule({
	declarations: [CartaoOrdemServicoComponent, OsClienteComponent],
	imports: [CommonModule, RouterModule, ComponentsModule, TagModule],
	exports: [CartaoOrdemServicoComponent, OsClienteComponent],
})
export class OrdemServicoComponentesModule {}
