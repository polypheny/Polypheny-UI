import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {LeftSidebarComponent} from './left-sidebar.component';

describe('LeftSidebarComponent', () => {
    let component: LeftSidebarComponent;
    let fixture: ComponentFixture<LeftSidebarComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [LeftSidebarComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(LeftSidebarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
