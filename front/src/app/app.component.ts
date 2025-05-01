import {Component} from '@angular/core';
import {
  GrapColouringComponent
} from './components/grap-colouring/grap-colouring.component';

@Component({
  selector: 'app-root',
  imports: [GrapColouringComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'front';
}
