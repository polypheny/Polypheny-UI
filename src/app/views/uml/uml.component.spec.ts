import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';

import {UmlComponent} from './uml.component';

describe('UmlComponent', () => {
  let component: UmlComponent;
  let fixture: ComponentFixture<UmlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [UmlComponent]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UmlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
