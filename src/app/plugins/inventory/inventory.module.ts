import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../../components/components.module';

import {BadgeComponent, BgColorDirective, ColComponent, ContainerComponent, RowComponent,} from '@coreui/angular';
import {InventoryComponent} from './components/inventory.component';


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ComponentsModule,
        ColComponent,
        BadgeComponent,
        ContainerComponent,
        BgColorDirective,
        RowComponent,
    ],
    declarations: [
        InventoryComponent,
    ],
    exports: [
        InventoryComponent
    ],
    providers: [

    ]
})
export class InventoryModule {
}

