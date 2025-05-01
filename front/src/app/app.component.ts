import { Component } from '@angular/core';
import {MaxFlowComponent} from './components/max-flow/max-flow.component';
import { GrapColouringComponent } from './components/grap-colouring/grap-colouring.component';

@Component({
  selector: 'app-root',
  imports: [ MaxFlowComponent, GrapColouringComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'front';
}
