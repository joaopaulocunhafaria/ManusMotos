import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { APP_INITIALIZER, DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { ToastModule } from 'primeng/toast';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TemaService } from './services/tema.service';
import { TemaManusMotos } from './TemaManusMotos';

registerLocaleData(localePt, 'pt');

/** Aplica a identidade visual (cache local na hora, banco em segundo plano) sem bloquear o boot. */
export function inicializarTema(temaService: TemaService): () => void {
	return () => temaService.inicializar();
}

@NgModule({
	declarations: [AppComponent],
	imports: [BrowserModule, AppRoutingModule, ToastModule],
	providers: [
		{ provide: LOCALE_ID, useValue: 'pt' },
		{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
		provideAnimationsAsync(),
		providePrimeNG({
			theme: {
				preset: TemaManusMotos,
				options: { ripple: true, darkModeSelector: false },
			},
		}),
		MessageService,
		{ provide: APP_INITIALIZER, useFactory: inicializarTema, deps: [TemaService], multi: true },
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
