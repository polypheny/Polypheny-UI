import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import {KEYS, TREE_ACTIONS, TreeComponent, TreeModel, TreeNode } from 'angular-tree-component';

@Component({
  selector: 'app-left-sidebar',
  templateUrl: './left-sidebar.component.html',
  styleUrls: ['./left-sidebar.component.scss']
})
export class LeftSidebarComponent implements OnInit , AfterViewInit {

  @ViewChild('tree') treeComponent: TreeComponent;
  nodes;
  options;

  constructor() {
    this.nodes = nodes;
    this.options = options;
  }

  ngOnInit() {
    $('body').addClass('sidebar-lg-show');
  }

  ngAfterViewInit(): void {
    const treeModel: TreeModel = this.treeComponent.treeModel;
    // treeModel.setState({id: 1, name: 'test'});// not working yet

    // todo 2-way-binding https://angular2-tree.readme.io/docs/save-restore

    $('#search-tree').on('keyup', function(e) {
      if (e.which === 27) { // esc
        $(this).val('');
      }
      treeModel.filterNodes((node) => {
        return node.data.name.startsWith($(this).val());
      });
    });

  }

}

export const nodes = [
  {
    id: 1,
    name: 'root1',
    icon: 'fa fa-table',
    children: [
      { id: 2, name: 'child1.1' },
      {
        id: 3, name: 'child1.2', children: [
          { id: 8, name: 'child1.2.1', children: [
              { id: 9, name: 'child1.2.1.1', children: [
                  { id: 10, name: 'child1.2.1.1.1', children: [
                      { id: 11, name: 'child1.2.1.1.1.1', children: [
                          { id: 12, name: 'child1.2.1.1.1.1.1' }
                        ]}
                    ] }
                ]}
            ]}
        ]
      }
    ]
  },
  {
    id: 4,
    name: 'root2',
    icon: 'fa fa-table',
    children: [
      { id: 5, name: 'child2.1' },
      {
        id: 6,
        name: 'child2.2',
        children: [
          { id: 7, name: 'subsub', icon: 'icon-list' }
        ]
      }
    ]
  }
  // { id: 13, name: 'long'}, { id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'}, { id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'long'},{ id: 13, name: 'LAST'}
];
export const options = {
  actionMapping: {
    mouse: {
      dblClick: (tree, node, $event) => {
        if (node.hasChildren) TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    },
  },
  allowDrag: true,
  allowDrop: false
};
