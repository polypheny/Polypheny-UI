import {
  Component, OnInit, Input,
  Output, EventEmitter, HostListener
} from '@angular/core';
import Reveal from 'reveal.js';

import { NotebookWrapper } from '../notebook-wrapper';
import { KatexOptions, MarkdownService } from 'ngx-markdown';
import { Slides } from '../../../models/peresentions';
import { Router } from '@angular/router';
import { HighlightService } from '../../../services/highlight.service'
import { CellErrorOutput, CellStreamOutput, NotebookCell } from '../../../models/notebook.model';
import { default as AnsiUp } from 'ansi_up';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-presentation-cells',
  templateUrl: './presentation-cells.component.html',
  styleUrls: ['./presentation-cells.component.scss']
})

export class PresentationCellsComponent implements OnInit {
  @Input() nb: NotebookWrapper;
  @Input() backgroundColor: string;
  @Input() color: string;

  slides: Slides[] = [];


  private highlighted: boolean = false
  private ansi_up = new AnsiUp();

  constructor(private _markdown: MarkdownService,
    public router: Router,
    private highlightService: HighlightService,
    private _sanitizer: DomSanitizer,) {
  }

  ngOnInit(): void {

    this.slides = [];
    this.nb.cells.forEach(item => {

      /* store data for presention */
      let type = this.nb.getCellPresent(item);
      let codeType = this.nb.getCellType(item);
      let isTrusted = this.nb.trustedCellIds.has(item.id);
      let showOutput = item?.showOutput;
      if (type != "skip") {
        let language = ""
        if (codeType == 'poly') {
          language = "sql"
        }
        else if (codeType == "code") {
          language = "py";
          const output = item?.outputs.find(o => o.output_type === 'error');
          if (output) {
            var errorHtml = this.renderError(<CellErrorOutput>output);
          }
          const stream = item?.outputs.find(o => o.output_type === 'stream');
          if (stream) {
            var streamHtml = this.renderStream(<CellStreamOutput>stream);
          }
        }
        if (type == "slide" || this.slides.length == 0) {

          if (item.cell_type == 'markdown') {
            let sourceText = this.handelImageLinks('image', item.source);
            let [sourceTextClean, videoLinks] = this.extractVideoLinks('video', sourceText);
            this.slides.push({
              source: sourceTextClean, children: [{
                source: sourceTextClean, children: [], fragments: [], type: item.cell_type, language: language,
                isTrusted: isTrusted, outputs: item?.outputs, errorHtml: errorHtml, streamHtml: streamHtml, showOutput: showOutput, videoUrl: videoLinks
              }],
              fragments: [], type: item.cell_type, language: language, isTrusted: isTrusted, outputs: item?.outputs, errorHtml: errorHtml, streamHtml: streamHtml, showOutput: showOutput
            });
          }
          else {
            this.slides.push({
              source: item.source, children: [{
                source: item.source, children: [], fragments: [], type: item.cell_type, language: language,
                isTrusted: isTrusted, outputs: item?.outputs, errorHtml: errorHtml, streamHtml: streamHtml, showOutput: showOutput
              }], fragments: [], type: item.cell_type, language: language, isTrusted: isTrusted, outputs: item?.outputs, errorHtml: errorHtml, streamHtml: streamHtml, showOutput: showOutput
            });

          }

        }
        else if (type == "fragment") {
          let len = this.slides[this.slides.length - 1].children.length;
          if (item.cell_type == 'markdown') {
            let sourceText = this.handelImageLinks('image', item.source);
            let [sourceTextClean, videoLinks] = this.extractVideoLinks('video', sourceText);
            this.slides[this.slides.length - 1].children[len - 1].fragments.push({
              text: sourceTextClean, type: item.cell_type, language: language,
              videoUrl: videoLinks
            });
          }
          else {
            this.slides[this.slides.length - 1].children[len - 1].fragments.push({ text: item.source, type: item.cell_type, language: language });
          }
        }
        else {
          if (item.cell_type == 'markdown') {
            let sourceText = this.handelImageLinks('image', item.source);
            let [sourceTextClean, videoLinks] = this.extractVideoLinks('video', sourceText);
            this.slides[this.slides.length - 1].children.push({
              source: sourceTextClean, children: [], fragments: [], type: item.cell_type, language: language, isTrusted: isTrusted,
              outputs: item?.outputs, errorHtml: errorHtml, streamHtml: streamHtml, showOutput: showOutput, videoUrl: videoLinks
            });
          }
          else {
            this.slides[this.slides.length - 1].children.push({ source: item.source, children: [], fragments: [], type: item.cell_type, language: language, isTrusted: isTrusted, outputs: item?.outputs, errorHtml: errorHtml, streamHtml: streamHtml, showOutput: showOutput });
          }
        }
      }

    })
  }

  ngAfterViewInit() {
    Reveal.initialize({
      parallaxBackgroundImage: '',
      parallaxBackgroundSize: '',
      parallaxBackgroundHorizontal: 200,
      parallaxBackgroundVertical: 50,
      minScale: 0.2,
      maxScale: 1.0,
    })

  }
  ngAfterViewChecked() {
    if (!this.highlighted) {
      this.highlightService.highlightAll()
      this.highlighted = true
    }
  }
  ngOnDestroy() {
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

  // extract video links from text
  extractVideoLinks(mediaType: string, text: string | any[]): [string | any[], { url: SafeResourceUrl; width: number; height: number }[]] {
    if (typeof (text) != 'string') {
      return [text, [{ url: '', width: 0, height: 0 }]]
    }
    // regular expression to match YouTube video links

    const mediaRegex = new RegExp(`!\\[${mediaType}\\]\\((.*?)\\)`, 'g');
    const widthRegex = /width=(\d+)/;
    const heightRegex = /height=(\d+)/;

    let extractedLinks = [];
    const filteredLines = text.split('\n').filter(line => {
      const match = line.match(mediaRegex);
      if (match) {
        let str = match[0];
        str = str.substring(9, str.length - 1);
        const widthMatch = line.match(widthRegex);
        let width = widthMatch ? parseInt(widthMatch[1], 10) : 400; // default to 400 if no width specified
        const heightMatch = line.match(heightRegex);
        let height = heightMatch ? parseInt(heightMatch[1], 10) : 300; // default height to 300 if not specified
        extractedLinks.push({
          url: this._sanitizer.bypassSecurityTrustResourceUrl(str),
          width: width,
          height: height
        });
        return false;
      }
      return true;
    });

    // join the filtered lines back into a single string
    const filteredText = filteredLines.join('\n');
    return [filteredText, extractedLinks];
  }

  // show images inside text
  handelImageLinks(mediaType: string, text: string | any[]): any {
    if (typeof text !== 'string') {
      return text;
    }

    // regular expression to match image or video links
    const mediaRegex = new RegExp(
      `!\\[${mediaType}\\]\\((.*?)\\)(?:\\s+width=(\\d+))?(?:\\s+height=(\\d+))?`,
      'g'
    );
    // replace the media markers in the text with HTML tags
    const replacedText = text.replace(mediaRegex, (match, url,imgWidth, imgHeight): any => {
      const width = imgWidth ? parseInt(imgWidth, 10) : 400;
      const height = imgHeight ? parseInt(imgHeight, 10) : 300;
      if (mediaType == 'image') {
        return `<img src="${url}" width="${width}" height="${height}" class="media" data-preload allowfullscreen />`;
      }
      return match;
    });

    return replacedText;
  }


}
