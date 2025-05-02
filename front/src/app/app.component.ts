import { Component, OnInit } from '@angular/core';
import { GrapColouringComponent } from './components/grap-colouring/grap-colouring.component';
import { GraphColoringService } from './services/graph-coloring.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GrapColouringComponent],
  providers: [GraphColoringService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'front';

  constructor(private graphColoringService: GraphColoringService) {}

  ngOnInit(): void {
    // Wake up the server when the app starts
    this.wakeUpServer();
  }

  private wakeUpServer(): void {
    console.log('Waking up server...');
    this.graphColoringService.checkService().subscribe({
      next: (response) => {
        console.log('Server is awake:', response);
      },
      error: (err) => {
        console.warn('Failed to wake up server:', err);
      },
    });
  }
}
