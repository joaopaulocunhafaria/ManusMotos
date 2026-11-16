import { Component, Input } from '@angular/core';
import type { FormaPagamento } from '@manus/shared';
import { TemaService } from '../../../../services/tema.service';
import { LABEL_FORMA_PAGAMENTO } from '../../_enums/ordem-servico.enums';
import { saldoRestante, valorParcela } from '../../_metodos/ordem-servico';
import { OrdemServicoDetalhada } from '../../_modelos/ordem-servico.model';

/**
 * Versão resumida da OS enviada ao cliente para aprovação (imagem/PDF).
 * Não mostra CPF/CNPJ, endereço, observação interna nem status.
 * Usa só cores fixas e fonte do sistema para a captura em imagem sair igual em qualquer aparelho.
 */
@Component({
	selector: 'app-os-cliente',
	standalone: false,
	templateUrl: './os-cliente.component.html',
})
export class OsClienteComponent {
	@Input({ required: true }) ordem!: OrdemServicoDetalhada;

	constructor(public temaService: TemaService) {}

	public get formaPagamento(): string {
		return LABEL_FORMA_PAGAMENTO[this.ordem.payment_method as FormaPagamento] ?? this.ordem.payment_method;
	}

	public get saldo(): number {
		return saldoRestante(this.ordem.total, this.ordem.down_payment);
	}

	public get parcela(): number {
		return valorParcela(this.ordem.total, this.ordem.down_payment, this.ordem.installments);
	}
}
