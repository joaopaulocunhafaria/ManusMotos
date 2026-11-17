import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ComponentsModule } from '../../../components/components.module';
import { FormularioVendaComponent } from './formulario-venda/formulario-venda.component';
import { HistoricoPecaComponent } from './historico-peca/historico-peca.component';

/** Componentes compartilhados do estoque (venda e histórico de movimentações). */
@NgModule({
	declarations: [FormularioVendaComponent, HistoricoPecaComponent],
	imports: [CommonModule, ReactiveFormsModule, ComponentsModule, ButtonModule, InputNumberModule, InputTextModule, TagModule],
	exports: [FormularioVendaComponent, HistoricoPecaComponent],
})
export class EstoqueComponentesModule {}
