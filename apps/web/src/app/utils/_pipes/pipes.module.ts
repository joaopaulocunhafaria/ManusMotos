import { NgModule } from '@angular/core';
import { DocumentoPipe } from './documento.pipe';
import { PlacaPipe } from './placa.pipe';
import { TelefonePipe } from './telefone.pipe';

/** Pipes globais de formatação. Exportado também pelo ComponentsModule. */
@NgModule({
	declarations: [DocumentoPipe, PlacaPipe, TelefonePipe],
	exports: [DocumentoPipe, PlacaPipe, TelefonePipe],
})
export class PipesModule {}
