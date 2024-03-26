import {Component, inject, Input, OnInit, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import {DataModel} from '../../../models/ui-request.model';
import {PaginationElement} from '../models/pagination-element.model';
import {UiColumnDefinition} from '../models/result-set.model';
import {SortDirection, SortState} from '../models/sort-state.model';
import {CrudService} from '../../../services/crud.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../../services/catalog.service';
import {DataTemplateComponent} from '../data-template/data-template.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';


@Component({
    selector: 'app-data-table',
    templateUrl: './data-table.component.html',
    styleUrls: ['./data-table.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DataTableComponent extends DataTemplateComponent implements OnInit {

    public readonly _crud = inject(CrudService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _settings = inject(WebuiSettingsService);
    public readonly _sidebar = inject(LeftSidebarService);
    public readonly _catalog = inject(CatalogService);

    constructor() {
        super();

    }

    @ViewChild('decisionTree', {static: false}) public decisionTree: TemplateRef<any>;
    @ViewChild('sql', {static: false}) public sql: TemplateRef<any>;
    @ViewChild('editorGenerated', {static: false}) editorGenerated;
    @ViewChild('tutorial', {static: false}) public tutorial: TemplateRef<any>;


    @Input() tutorialMode: boolean;

    columns = [];
    userInput = {};

    protected readonly NamespaceType = DataModel;

    trackByFn(index: any, item: any) {
        return index;
    }

    ngOnInit() {
        super.ngOnInit();
    }


    filterTable(e, filterVal, col: UiColumnDefinition) {
        this.$result().currentPage = 1;
        if (e.keyCode === 27) { //esc
            $('.table-filter').val('');
            this.filter.clear();
            this.getEntityData();
            return;
        }
        if (col.collectionsType || col.dataType.includes('ARRAY')) {
            if (this.isValidArray(filterVal) || !filterVal) {
                this.filter.set(col.name, filterVal);
            }
        } else {
            this.filter.set(col.name, filterVal);
        }
        this.focusId = 'search-' + col.name;
        this.getEntityData();
    }

    paginate(p: PaginationElement) {
        this.$result().currentPage = p.page;
        this.currentPage.set(p.page);
        this.getEntityData();
    }

    sortTable(s: SortState) {
        //todo primary ordering, secondary ordering
        if (s.sorting === false) {
            s.sorting = true;
            s.direction = SortDirection.ASC;
        } else {
            if (s.direction === SortDirection.ASC) {
                s.direction = SortDirection.DESC;
            } else {
                s.direction = SortDirection.ASC;
                s.sorting = false;
            }
        }
        this.getEntityData();
    }

    isValidArray(val: string): boolean {
        if (val.startsWith('[') && val.endsWith(']')) {
            try {
                JSON.parse(val);
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    isValidFilter(val, col: UiColumnDefinition) {
        if (!val) {
            return;
        }
        if (col.collectionsType || col.dataType.includes('ARRAY')) {
            if (!this.isValidArray(val)) {
                return 'is-invalid';
            }
        }
    }


    getTooltip(col: UiColumnDefinition): string {
        if (!col) {
            return '';
        }
        let out = 'name: ' + col.name;
        out += '\ntype: ' + col.dataType;
        if (col.collectionsType) {
            out += '\ncollection: ' + col.collectionsType;
        }
        if (col.primary) {
            out += '\nprimary';
        }
        if (col.unique) {
            out += '\nunique: ' + col.unique;
        }
        if (col.nullable) {
            out += '\nnullable: ' + col.nullable;
        }
        if (col.defaultValue) {
            out += '\ndefaultValue: ' + col.defaultValue;
        }

        if (col.precision) {
            out += '\nprecision: ' + col.precision;
        }
        if (col.scale) {
            out += '\nscale: ' + col.scale;
        }
        if (col.dimension) {
            out += '\ndimension: ' + col.dimension;
        }
        if (col.cardinality) {
            out += '\ncardinality: ' + col.cardinality;
        }
        return out;
    }

    /**
     * returns true if a columns can be ordered
     */
    canOrder(col: UiColumnDefinition) {
        return !this._types.isMultimedia(col.dataType) && !col.collectionsType;
    }
}
