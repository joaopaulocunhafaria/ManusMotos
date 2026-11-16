import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IdentidadeVisualComponent } from './identidade-visual.component';

const routes: Routes = [{ path: '', component: IdentidadeVisualComponent }];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class IdentidadeVisualRoutingModule {}
