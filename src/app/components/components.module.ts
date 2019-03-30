import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {GraphComponent} from './graph/graph.component';
import {ChartsModule} from 'ng2-charts';
import {TypeaheadModule} from 'ngx-bootstrap';
import { ToastComponent } from './toast/toast.component';

@NgModule({
  imports: [
    CommonModule,
    ChartsModule,
    TypeaheadModule.forRoot()
  ],
  declarations: [
    GraphComponent,
    ToastComponent
  ],
  exports: [
    GraphComponent,
    ToastComponent
  ]
})
export class ComponentsModule { }
