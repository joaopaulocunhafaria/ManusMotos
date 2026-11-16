import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SemanaAgendaComponent } from './semana-agenda.component';

const routes: Routes = [{ path: '', component: SemanaAgendaComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class SemanaAgendaRoutingModule {}
