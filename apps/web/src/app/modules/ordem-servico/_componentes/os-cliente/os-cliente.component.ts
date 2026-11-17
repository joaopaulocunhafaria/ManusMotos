import { Component, Input } from '@angular/core';
import type { FormaPagamento } from '@manus/shared';
import { TemaService } from '../../../../services/tema.service';
import { IdentidadeVisual } from '../../../../utils/_metodos/tema';
import { LABEL_FORMA_PAGAMENTO } from '../../_enums/ordem-servico.enums';
import { numeroDocumento, saldoRestante, valorParcela } from '../../_metodos/ordem-servico';
import { OrdemServicoDetalhada } from '../../_modelos/ordem-servico.model';

/**
 * Documento formal da OS enviado ao cliente (imagem/PDF): logo e contatos da oficina, dados do cliente e da moto,
 * serviços, condições de pagamento, previsão de entrega e campo de autorização.
 * Não mostra endereço, observação interna, tempo de trabalho nem status.
 * Usa só cores fixas e fonte do sistema para a captura em imagem sair igual em qualquer aparelho.
 */
@Component({
	selector: 'app-os-cliente',
	standalone: false,
	templateUrl: './os-cliente.component.html',
	styleUrl: './os-cliente.component.scss',
})
export class OsClienteComponent {
	@Input({ required: true }) ordem!: OrdemServicoDetalhada;

	constructor(public temaService: TemaService) {}

	public get oficina(): IdentidadeVisual {
		return this.temaService.config();
	}

	public get numero(): string {
		return numeroDocumento(this.ordem.number);
	}

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
