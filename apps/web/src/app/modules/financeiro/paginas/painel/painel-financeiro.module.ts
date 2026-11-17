import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ComponentsModule } from '../../../../components/components.module';
import { PainelFinanceiroRoutingModule } from './painel-financeiro-routing.module';
import { PainelFinanceiroComponent } from './painel-financeiro.component';

@NgModule({
	declarations: [PainelFinanceiroComponent],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
		PainelFinanceiroRoutingModule,
		ComponentsModule,
		ButtonModule,
		DrawerModule,
		InputNumberModule,
		InputTextModule,
	],
})
export class PainelFinanceiroModule {}
