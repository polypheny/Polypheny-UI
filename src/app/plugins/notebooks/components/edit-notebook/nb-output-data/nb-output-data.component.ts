import {Component, Input, OnInit} from '@angular/core';
import {KernelData} from '../../../models/kernel-response.model';

@Component({
    selector: 'app-nb-output-data',
    templateUrl: './nb-output-data.component.html',
    styleUrls: ['./nb-output-data.component.scss'],
    standalone: false
})
export class NbOutputDataComponent implements OnInit {
    @Input() data: KernelData;
    @Input() isTrusted = false;

    constructor() {
    }

    ngOnInit(): void {
    }

}
