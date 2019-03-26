import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';

import { GlobalRoutingModule } from './global-routing.module';
import { GlobalComponent } from './global.component';

import { CollapseModule } from 'ngx-bootstrap/collapse';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import {ProgressbarModule} from 'ngx-bootstrap';
import {RenderItemComponent} from '../render-item/render-item.component';

@NgModule({
  declarations: [
    GlobalComponent,
    RenderItemComponent
  ],
  imports: [
    CommonModule,
    GlobalRoutingModule,
    CollapseModule,
    TooltipModule,
    ProgressbarModule.forRoot(),
    FormsModule
  ]
})
export class GlobalModule { }
