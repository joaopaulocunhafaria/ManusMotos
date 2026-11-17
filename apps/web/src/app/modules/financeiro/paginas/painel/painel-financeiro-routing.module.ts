import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PainelFinanceiroComponent } from './painel-financeiro.component';

const routes: Routes = [{ path: '', component: PainelFinanceiroComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class PainelFinanceiroRoutingModule {}
