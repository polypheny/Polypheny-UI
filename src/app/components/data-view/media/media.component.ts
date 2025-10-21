import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
// @ts-ignore
import {default as Plyr} from 'plyr';

@Component({
    selector: 'app-media',
    templateUrl: './media.component.html',
    styleUrls: ['./media.component.scss'],
    standalone: false
})
export class MediaComponent implements OnInit, AfterViewInit {

    @Input() src: string;
    @Input() type: string;
    @Input() style?: any;
    @ViewChild('video') video: ElementRef;
    @ViewChild('audio') audio: ElementRef;

    plyr: Plyr;

    constructor() {
    }

    ngOnInit(): void {
    }

    ngAfterViewInit() {
        const options = {
            controls: ['play-large', 'play', 'progress', 'current-time', 'pip', 'fullscreen']
        };
        if (this.video) {
            this.plyr = new Plyr(this.video.nativeElement, options);
        }
        if (this.audio) {
            this.plyr = new Plyr(this.audio.nativeElement, options);
        }
    }

    getStyle() {
        if (this.plyr && this.plyr.fullscreen.active) {
            return;
        }
        return this.style ? this.style : {};
    }

}
