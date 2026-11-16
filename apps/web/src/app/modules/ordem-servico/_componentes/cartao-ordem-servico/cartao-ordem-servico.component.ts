import { Component, Input } from '@angular/core';
import type { StatusOrdemServico } from '@manus/shared';
import { LABEL_STATUS, SEVERIDADE_STATUS } from '../../_enums/ordem-servico.enums';
import { OrdemServicoResumo } from '../../_modelos/ordem-servico.model';

/** Card de uma OS na listagem (toque abre o detalhe). */
@Component({
	selector: 'app-cartao-ordem-servico',
	standalone: false,
	templateUrl: './cartao-ordem-servico.component.html',
})
export class CartaoOrdemServicoComponent {
	@Input({ required: true }) ordem!: OrdemServicoResumo;

	public readonly labelStatus = LABEL_STATUS;
	public readonly severidadeStatus = SEVERIDADE_STATUS;

	public get status(): StatusOrdemServico {
		return this.ordem.status as StatusOrdemServico;
	}
}
