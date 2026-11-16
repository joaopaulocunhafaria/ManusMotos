import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BaseRoutingModule } from './base-routing.module';
import { BaseComponent } from './base.component';

/** Layout do app: topo + conteúdo + navegação inferior (mobile-first). */
@NgModule({
	declarations: [BaseComponent],
	imports: [CommonModule, BaseRoutingModule],
})
export class BaseModule {}
