import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {UmlComponent} from './uml/uml.component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import {TableViewComponent} from './table-view/table-view.component';
import {SchemaEditingComponent} from './schema-editing/schema-editing.component';
import {MonitoringComponent} from './monitoring/monitoring.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {QueryingComponent} from './querying/querying.component';
import {AdaptersComponent} from './adapters/adapters.component';
import {AboutComponent} from './about/about.component';
import {QueryInterfacesComponent} from './query-interfaces/query-interfaces.component';
import {NotebooksComponent} from '../plugins/notebooks/components/notebooks.component';
import {UnsavedChangesGuard} from '../plugins/notebooks/services/unsaved-changes.guard';
import {DockerconfigComponent} from './dockerconfig/dockerconfig.component';
import {WorkflowsDashboardComponent} from '../plugins/workflows/components/workflows-dashboard/workflows-dashboard.component';
import {WorkflowSessionComponent} from '../plugins/workflows/components/workflow-session/workflow-session.component';

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
        path: 'dashboard',
        component: DashboardComponent,
        data: {
            title: 'Dashboard'
        }
    },
    {
        path: 'dashboard/:id',
        component: DashboardComponent,
        data: {
            title: 'Dashboard'
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
            title: 'Namespaces'
        }
    },
    {
        path: 'schema-editing/:id/statistics-column',
        component: SchemaEditingComponent,
        data: {
            title: 'Statistics'
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
        path: 'config/dockerConfig',
        component: DockerconfigComponent,
        data: {
            title: 'Docker Setup'
        }
    },
    {
        path: 'config/dockerPage',
        component: DockerconfigComponent,
        data: {
            title: 'Docker Setup'
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
        path: 'notebooks',
        children: [
            {
                path: '**',
                component: NotebooksComponent,
                data: {
                    title: 'Notebooks'
                },
                canDeactivate: [UnsavedChangesGuard]
            }
        ]
    },
    {
        path: 'workflows',
        redirectTo: 'workflows/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'workflows/sessions/:sessionId',
        component: WorkflowSessionComponent,
        data: {
            title: 'Workflow Session',
            isFullWidth: true
        }
    },
    {
        path: 'workflows/:route',
        component: WorkflowsDashboardComponent,
        data: {
            title: 'Workflows Dashboard'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ViewsRoutingModule {
}
