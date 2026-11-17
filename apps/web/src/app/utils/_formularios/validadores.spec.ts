import { FormControl, FormGroup } from '@angular/forms';
import { anosMoto, corHex, cpfCnpj, placa, telefone } from './validadores';

describe('validadores', () => {
	it('corHex aceita #rrggbb e rejeita outros formatos', () => {
		expect(corHex()(new FormControl('#A1b2C3'))).toBeNull();
		expect(corHex()(new FormControl(''))).toBeNull();
		expect(corHex()(new FormControl('#abc'))).toEqual({ corHex: true });
		expect(corHex()(new FormControl('vermelho'))).toEqual({ corHex: true });
	});

	it('telefone aceita 10 ou 11 dígitos ignorando máscara', () => {
		expect(telefone()(new FormControl('(31) 3333-4444'))).toBeNull();
		expect(telefone()(new FormControl('31999998888'))).toBeNull();
		expect(telefone()(new FormControl('1234'))).toEqual({ telefone: true });
	});

	it('cpfCnpj valida dígitos verificadores de CPF e CNPJ', () => {
		expect(cpfCnpj()(new FormControl('529.982.247-25'))).toBeNull();
		expect(cpfCnpj()(new FormControl('11.444.777/0001-61'))).toBeNull();
		expect(cpfCnpj()(new FormControl(''))).toBeNull();
		expect(cpfCnpj()(new FormControl('529.982.247-24'))).toEqual({ cpfCnpj: true });
		expect(cpfCnpj()(new FormControl('111.111.111-11'))).toEqual({ cpfCnpj: true });
		expect(cpfCnpj()(new FormControl('11444777000160'))).toEqual({ cpfCnpj: true });
	});

	it('placa aceita formato antigo e Mercosul', () => {
		expect(placa()(new FormControl('abc-1234'))).toBeNull();
		expect(placa()(new FormControl('ABC1D23'))).toBeNull();
		expect(placa()(new FormControl('AB12345'))).toEqual({ placa: true });
	});

	it('anosMoto: ano final opcional, exige o inicial e não pode ser menor', () => {
		const grupo = (inicio: unknown, fim: unknown) =>
			anosMoto()(new FormGroup({ year_start: new FormControl(inicio), year_end: new FormControl(fim) }));
		expect(grupo(null, null)).toBeNull();
		expect(grupo('2015', '')).toBeNull();
		expect(grupo('2015', '2020')).toBeNull();
		expect(grupo('2018', '2018')).toBeNull();
		expect(grupo('', '2020')).toEqual({ anoFinalSemInicial: true });
		expect(grupo('2020', '2019')).toEqual({ anoFinalMenor: true });
	});
});
