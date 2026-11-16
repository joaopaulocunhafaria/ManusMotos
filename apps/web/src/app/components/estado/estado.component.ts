import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EstadoTela } from '../../utils/_models/estado-tela';

/** Exibe carregando / vazio / erro de forma padronizada. Não renderiza nada no estado 'carregado'. */
@Component({
	selector: 'app-estado',
	standalone: false,
	templateUrl: './estado.component.html',
})
export class EstadoComponent {
	@Input({ required: true }) modo!: EstadoTela;
	@Input() mensagemVazio = 'Nenhum registro encontrado.';
	@Input() mensagemErro = 'Não foi possível carregar as informações.';
	@Output() recarregar = new EventEmitter<void>();
}
