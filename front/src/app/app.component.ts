import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GrapColouringComponent } from './components/grap-colouring/grap-colouring.component';
import { MaxFlowComponent } from './components/max-flow/max-flow.component';

@Component({
  selector: 'app-root',
  imports: [GrapColouringComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'front';
}
