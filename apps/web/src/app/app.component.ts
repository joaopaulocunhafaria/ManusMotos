import { Component } from '@angular/core';

@Component({
	selector: 'app-root',
	standalone: false,
	template: `
		<p-toast position="top-center" />
		<router-outlet></router-outlet>
	`,
})
export class AppComponent {}
