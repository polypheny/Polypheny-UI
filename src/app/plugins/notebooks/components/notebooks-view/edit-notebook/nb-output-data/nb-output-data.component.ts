import {Component, Input, OnInit} from '@angular/core';
import {KernelData} from '../../../../models/kernel-response.model';

@Component({
    selector: 'app-nb-output-data',
    templateUrl: './nb-output-data.component.html',
    styleUrls: ['./nb-output-data.component.scss']
})
export class NbOutputDataComponent implements OnInit {
  @Input() data: KernelData;

    constructor() {
    }

    ngOnInit(): void {
    }

}
