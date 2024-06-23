import { Component, OnInit ,Input,
  Output,EventEmitter,HostListener} from '@angular/core';
import Reveal from 'reveal.js';

import {NotebookWrapper} from '../notebook-wrapper';
import {KatexOptions, MarkdownService} from 'ngx-markdown';
import { Slides } from '../../../models/peresentions';
import { Router } from '@angular/router';
import { HighlightService } from '../../../services/highlight.service'
import { CellErrorOutput, CellStreamOutput, NotebookCell} from '../../../models/notebook.model';
import {DomSanitizer} from '@angular/platform-browser';
import {default as AnsiUp} from 'ansi_up';

@Component({
  selector: 'app-presentation-cells',
  templateUrl: './presentation-cells.component.html',
  styleUrls: ['./presentation-cells.component.scss']
})

export class PresentationCellsComponent implements OnInit {
  @Output() closeShow = new EventEmitter<void>(); // true: below, false: above
  @Input() nb: NotebookWrapper;
  
  slides: Slides[]=[];
  theme = 'vs-dark';


  private highlighted: boolean = false
  private ansi_up = new AnsiUp();

constructor(private _markdown: MarkdownService,
  public router:Router,
  private highlightService: HighlightService,
  private _sanitizer: DomSanitizer,) {
}

  ngOnInit(): void {
    
    console.log(   this.nb.cells)
    this.slides=[];
    this.nb.cells.forEach(item=>{
     
      /* store data for presention */
      let type=this.nb.getCellPresent(item);
      let codeType=this.nb.getCellType(item);
      let isTrusted=this.nb.trustedCellIds.has(item.id)
      if(type!="skip")
      {
        let language=""
        if(codeType=='poly')
        {
          language="sql"
        }
        else if (codeType=="code")
        {
          language="py";
          const output = item?.outputs.find(o => o.output_type === 'error');
          if (output) {
              var errorHtml= this.renderError(<CellErrorOutput>output);
          }
          const stream = item?.outputs.find(o => o.output_type === 'stream');
          if (stream) {
              var streamHtml =this.renderStream(<CellStreamOutput>stream);
          }
        }
        if(type=="slide" || this.slides.length==0)
        {
            this.slides.push({source:item.source,children:[{source:item.source,children:[],fragments:[],type:item.cell_type,language:language,
              isTrusted:isTrusted,outputs:item?.outputs,errorHtml:errorHtml,streamHtml:streamHtml}],fragments:[],type:item.cell_type,language:language,isTrusted:isTrusted,outputs:item?.outputs,errorHtml:errorHtml,streamHtml:streamHtml});

        }
        else if (type=="fragment")
        {
          let len=this.slides[this.slides.length-1].children.length;
       
            this.slides[this.slides.length-1].children[len-1].fragments.push({text:item.source,type:item.cell_type,language:language});

        }
        else {
        
            this.slides[this.slides.length-1].children.push({source:item.source,children:[],fragments:[],type:item.cell_type,language:language,isTrusted:isTrusted,outputs:item?.outputs,errorHtml:errorHtml,streamHtml:streamHtml});
        }
      }
    })
    console.log(   this.slides)

  }
  
  ngAfterViewInit(){  
    Reveal.initialize({
      parallaxBackgroundImage: '',
      parallaxBackgroundSize: '',
      parallaxBackgroundHorizontal: 200,
      parallaxBackgroundVertical: 50,
      minScale: 0.2,
      maxScale: 1.0,
      width: 960,
      height: 700,
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
  renderError(output: CellErrorOutput) {
    if (output) {
      return this._sanitizer.bypassSecurityTrustHtml(this.ansi_up.ansi_to_html(output.traceback.join('\n')));
    }
    return null;
  }

  renderStream(output: CellStreamOutput) {
      if (output) {
          const text = Array.isArray(output.text) ? output.text.join('\n') : output.text;
          return this._sanitizer.bypassSecurityTrustHtml(this.ansi_up.ansi_to_html(text));
      }
      return null;
  }

}
