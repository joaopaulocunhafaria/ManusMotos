import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
	declarations: [HomeComponent],
	imports: [CommonModule, RouterModule, HomeRoutingModule, ButtonModule, CardModule],
})
export class HomeModule {}
