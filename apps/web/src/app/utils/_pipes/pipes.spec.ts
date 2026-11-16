import { DocumentoPipe } from './documento.pipe';
import { PlacaPipe } from './placa.pipe';
import { TelefonePipe } from './telefone.pipe';

describe('pipes de formatação', () => {
	it('documento', () => expect(new DocumentoPipe().transform('52998224725')).toBe('529.982.247-25'));
	it('telefone', () => expect(new TelefonePipe().transform('31987654321')).toBe('(31) 98765-4321'));
	it('placa', () => expect(new PlacaPipe().transform('hgt4521')).toBe('HGT-4521'));
});
