import {Routes} from '@angular/router';
import {
  GrapColouringComponent
} from './components/grap-colouring/grap-colouring.component';
import {MaxFlowComponent} from './components/max-flow/max-flow.component';

export const routes: Routes = [
  {
    path: 'problem1',
    component: MaxFlowComponent
  },
  {
    path: 'problem2',
    component: GrapColouringComponent
  },
  {
    path: "**",
    redirectTo: "problem1",
  }
];
