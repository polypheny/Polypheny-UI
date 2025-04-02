import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableSelectionDialogComponent } from './table-selection-dialog.component';

// @ts-ignore
describe('TableSelectionDialogComponent', () => {
  let component: TableSelectionDialogComponent;
  let fixture: ComponentFixture<TableSelectionDialogComponent>;

  // @ts-ignore
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSelectionDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableSelectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // @ts-ignore
  it('should create', () => {
    // @ts-ignore
    expect(component).toBeTruthy();
  });
});
