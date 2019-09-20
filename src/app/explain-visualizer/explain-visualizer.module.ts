import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DurationPipe, DurationUnitPipe, MomentDatePipe} from './pipes';
import {PlanNodeComponent} from './components/plan-node/plan-node.component';
import {PlanViewComponent} from './components/plan-view/plan-view.component';
import {PlanService} from './services/plan.service';
import {SyntaxHighlightService} from './services/syntax-highlight.service';
import {HelpService} from './services/help.service';
import {ColorService} from './services/color.service';
import {FormsModule} from '@angular/forms';

@NgModule({
  declarations: [
    PlanNodeComponent,
    PlanViewComponent,
    MomentDatePipe,
    DurationPipe,
    DurationUnitPipe
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  providers: [
    PlanService,
    SyntaxHighlightService,
    HelpService,
    ColorService
  ],
  exports: [
    PlanNodeComponent,
    MomentDatePipe,
    DurationPipe,
    DurationUnitPipe,
    PlanViewComponent
  ]
})
export class ExplainVisualizerModule { }
