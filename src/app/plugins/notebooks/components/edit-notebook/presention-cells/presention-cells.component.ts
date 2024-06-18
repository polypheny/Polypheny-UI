import { Component, OnInit ,Input,
  Output,EventEmitter,HostListener} from '@angular/core';
import Reveal from 'reveal.js';

import {NotebookWrapper} from '../notebook-wrapper';
import {KatexOptions, MarkdownService} from 'ngx-markdown';
import { Slides } from '../../../models/peresentions';
import { Router } from '@angular/router';
import { HighlightService } from '../../../services/highlight.service'

@Component({
  selector: 'app-presention-cells',
  templateUrl: './presention-cells.component.html',
  styleUrls: ['./presention-cells.component.scss']
})

export class PresentionCellsComponent implements OnInit {
  @Output() closeShow = new EventEmitter<void>(); // true: below, false: above
  @Input() nb: NotebookWrapper;
  
  slides: Slides[]=[];
  theme = 'vs-dark';


  private highlighted: boolean = false

constructor(private _markdown: MarkdownService,
  public router:Router,
  private highlightService: HighlightService) {
}

  ngOnInit(): void {
    this.slides=[];
    this.nb.cells.forEach(item=>{
      let type=this.nb.getCellPresent(item);
      let codeType=this.nb.getCellType(item);
      if(type!="skip")
      {
        let language=""
        if(codeType=='poly')
        {
          language="sql"
        }
        else if (codeType=="code")
        {
          language="py"
        }
        if(type=="slide" || this.slides.length==0)
        {
          if(language=="")
          {
            this.slides.push({source:item.source,children:[{source:item.source,children:[],fragments:[],type:item.cell_type}],fragments:[],type:item.cell_type});
          }
          else{
            this.slides.push({source:item.source,children:[{source:item.source,children:[],fragments:[],type:item.cell_type,language:language}],fragments:[],type:item.cell_type,language:language});

          }
        }
        else if (type=="fragment")
        {
          let len=this.slides[this.slides.length-1].children.length;
          if(language=="")
          {
          this.slides[this.slides.length-1].children[len-1].fragments.push({text:item.source,type:item.cell_type});
          }
          else{
            this.slides[this.slides.length-1].children[len-1].fragments.push({text:item.source,type:item.cell_type,language:language});

          }
        }
        else {
          if(language=="")
          {
          this.slides[this.slides.length-1].children.push({source:item.source,children:[],fragments:[],type:item.cell_type});
          }
          else{
            this.slides[this.slides.length-1].children.push({source:item.source,children:[],fragments:[],type:item.cell_type,language:language});
          }
        }
      }
    })
  }
  
  ngAfterViewInit(){  
    Reveal.initialize({
      parallaxBackgroundImage: '',
      parallaxBackgroundSize: '',
      parallaxBackgroundHorizontal: 200,
      parallaxBackgroundVertical: 50
    })
    
  }
  ngAfterViewChecked() {
    if (!this.highlighted) {
      this.highlightService.highlightAll()
      this.highlighted = true
    }
  }
  ngOnDestroy(){
    window.location.reload();
  }
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
  
      window.location.reload();
      
    }
  }
 

}
