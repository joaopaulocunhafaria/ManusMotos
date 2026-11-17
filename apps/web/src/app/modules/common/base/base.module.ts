import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { BaseRoutingModule } from './base-routing.module';
import { BaseComponent } from './base.component';

/** Layout do app: topo com menu lateral (hambúrguer) + conteúdo + navegação inferior (mobile-first). */
@NgModule({
	declarations: [BaseComponent],
	imports: [CommonModule, BaseRoutingModule, DrawerModule],
})
export class BaseModule {}
