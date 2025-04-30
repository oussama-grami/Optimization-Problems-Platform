import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaxFlowComponent } from './max-flow.component';

describe('MaxFlowComponent', () => {
  let component: MaxFlowComponent;
  let fixture: ComponentFixture<MaxFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaxFlowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaxFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
