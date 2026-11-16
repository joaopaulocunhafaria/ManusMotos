import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ComponentsModule } from '../../../../components/components.module';
import { IdentidadeVisualRoutingModule } from './identidade-visual-routing.module';
import { IdentidadeVisualComponent } from './identidade-visual.component';

@NgModule({
	declarations: [IdentidadeVisualComponent],
	imports: [
		CommonModule,
		ReactiveFormsModule,
		IdentidadeVisualRoutingModule,
		ComponentsModule,
		ButtonModule,
		CardModule,
		ConfirmDialogModule,
		InputTextModule,
		MessageModule,
		SelectModule,
		SelectButtonModule,
	],
})
export class IdentidadeVisualModule {}
