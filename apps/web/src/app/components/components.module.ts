import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PipesModule } from '../utils/_pipes/pipes.module';
import { EstadoComponent } from './estado/estado.component';

/** Componentes reutilizáveis em todo o app (reexporta os pipes globais). */
@NgModule({
	declarations: [EstadoComponent],
	imports: [CommonModule, ButtonModule, ProgressSpinnerModule],
	exports: [EstadoComponent, PipesModule],
})
export class ComponentsModule {}
