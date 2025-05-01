import { Component } from '@angular/core';
import {MaxFlowComponent} from './components/max-flow/max-flow.component';

@Component({
  selector: 'app-root',
  imports: [ MaxFlowComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'front';
}
