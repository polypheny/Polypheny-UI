import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphicalQueryingComponent } from './graphical-querying.component';

describe('GraphicalQueryingComponent', () => {
  let component: GraphicalQueryingComponent;
  let fixture: ComponentFixture<GraphicalQueryingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GraphicalQueryingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphicalQueryingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
