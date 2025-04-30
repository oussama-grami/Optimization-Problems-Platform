import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrapColouringComponent } from './grap-colouring.component';

describe('GrapColouringComponent', () => {
  let component: GrapColouringComponent;
  let fixture: ComponentFixture<GrapColouringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrapColouringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrapColouringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
