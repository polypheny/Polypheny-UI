import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {GraphComponent} from './graph/graph.component';
import {ChartsModule} from 'ng2-charts';
import {TypeaheadModule} from 'ngx-bootstrap';

@NgModule({
  imports: [
    CommonModule,
    ChartsModule,
    TypeaheadModule.forRoot()
  ],
  declarations: [
    GraphComponent
  ],
  exports: [
    GraphComponent
  ]
})
export class ComponentsModule { }
