import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {UmlComponent} from './uml/uml.component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import {TableViewComponent} from './table-view/table-view.component';
import {SchemaEditingComponent} from './schema-editing/schema-editing.component';
import {MonitoringComponent} from './monitoring/monitoring.component';
import {QueryingComponent} from './querying/querying.component';
import {AdaptersComponent} from './adapters/adapters.component';
import {HubComponent} from './hub/hub.component';
import {AboutComponent} from './about/about.component';
import {QueryInterfacesComponent} from './query-interfaces/query-interfaces.component';

const routes: Routes = [
  {
    path: 'about',
    component: AboutComponent,
    data: {
      title: 'about'
    }
  },
  {
    path: 'monitoring',
    component: MonitoringComponent,
    data: {
      title: 'Monitoring'
    }
  },
  {
    path: 'monitoring/:id',
    component: MonitoringComponent,
    data: {
      title: 'Monitoring'
    }
  },
  {
    path: 'uml',
    redirectTo: 'uml/',
    pathMatch: 'full'
  },
  {
    path: 'uml/:id',
    component: UmlComponent,
    data: {
      title: 'UML'
    }
  },
  {
    path: 'querying',
    redirectTo: 'querying/console',
    pathMatch: 'full'
  },
  {
    path: 'querying/:route',
    component: QueryingComponent,
    data: {
      title: 'Querying'
    }
  },
  {
    path: 'data-table',
    redirectTo: 'data-table/',
    pathMatch: 'full'
  },
  {
    path: 'data-table/:id',
    component: TableViewComponent,
    data: {
      title: 'Data Table'
    }
  },
  {
    path: 'data-table/:id/:page',
    component: TableViewComponent,
    data: {
      title: 'Data Table'
    }
  },
  {
    path: 'schema-editing',
    redirectTo: 'schema-editing/',
    pathMatch: 'full'
  },
  {
    path: 'schema-editing/:id',
    component: SchemaEditingComponent,
    data: {
      title: 'Schema Editing'
    }
  },
  {
    path: 'config',
    component: FormGeneratorComponent,
    data: {
      title: 'Form Generator'
    }
  },
  {
    path: 'config/:page',
    component: FormGeneratorComponent,
    data: {
      title: 'Form Generator'
    }
  },
  {
    path: 'adapters',
    component: AdaptersComponent,
    data: {
      title: 'Adapters'
    }
  },
  {
    path: 'adapters/:action',
    component: AdaptersComponent,
    data: {
      title: 'Adapters'
    }
  },
  {
    path: 'queryInterfaces',
    component: QueryInterfacesComponent,
    data: {
      title: 'QueryInterfaces'
    }
  },
  {
    path: 'queryInterfaces/:action',
    component: QueryInterfacesComponent,
    data: {
      title: 'QueryInterfaces'
    }
  },
  {
    path: 'hub',
    component: HubComponent,
    data: {
      title: 'Polypheny-DB Hub'
    }
  },
  {
    path: 'hub/:sub',
    component: HubComponent,
    data: {
      title: 'Polypheny-DB Hub'
    }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewsRoutingModule {}
