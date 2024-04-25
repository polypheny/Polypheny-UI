import {Component, ElementRef, Injector, ViewChild} from '@angular/core';
import {createEditor} from '../../../components/polyalg/alg-editor';
import {PlanNode} from '../../../components/polyalg/models/polyalg-plan.model';

@Component({
    selector: 'app-polyalg',
    templateUrl: './polyalg.component.html',
    styleUrl: './polyalg.component.scss'
})
export class PolyalgComponent {
    samplePlan = '{"opName":"PROJECT","arguments":{"projects":{"type":"LIST","value":{"innerType":"REX","args":[{"type":"REX","value":{"rex":"employeeno","alias":"employeeno"}},{"type":"REX","value":{"rex":"relationshipjoy","alias":"happiness"}}]}}},"inputs":[{"opName":"FILTER","arguments":{"condition":{"type":"REX","value":{"rex":"<(age0, 30)"}},"variables":{"type":"LIST","value":{"innerType":"LIST","args":[]}}},"inputs":[{"opName":"JOIN","arguments":{"type":{"type":"JOIN_TYPE_ENUM","value":{"arg":"INNER","enum":"JoinAlgType"},"isEnum":true},"semiJoinDone":{"type":"BOOLEAN","value":{"arg":false}},"variables":{"type":"LIST","value":{"innerType":"LIST","args":[]}},"condition":{"type":"REX","value":{"rex":"=(employeeno, employeeno0)"}}},"inputs":[{"opName":"SCAN","arguments":{"entity":{"type":"ENTITY","value":{"arg":"public.emp","namespaceId":0,"id":3}}},"inputs":[]},{"opName":"PROJECT#","arguments":{"projects":{"type":"LIST","value":{"innerType":"STRING","args":[{"type":"STRING","value":{"arg":"employeeno","alias":"employeeno0"}},{"type":"STRING","value":{"arg":"age","alias":"age0"}}]}}},"inputs":[{"opName":"PROJECT","arguments":{"projects":{"type":"LIST","value":{"innerType":"REX","args":[{"type":"REX","value":{"rex":"employeeno","alias":"employeeno"}},{"type":"REX","value":{"rex":"age","alias":"age"}}]}}},"inputs":[{"opName":"SCAN","arguments":{"entity":{"type":"ENTITY","value":{"arg":"public.emp","namespaceId":0,"id":3}}},"inputs":[]}]}]}]}]}]}';

    @ViewChild('rete') container!: ElementRef;

    constructor(private injector: Injector) {
    }

    initPlan() {
    }

    ngOnInit() {
        this.initPlan();
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            createEditor(el, this.injector, JSON.parse(this.samplePlan) as PlanNode, false);
        }
    }

}
