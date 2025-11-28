import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule] 
})
export class TimerComponent implements OnChanges, OnDestroy {
  @Input() seconds = 0;
  @Input() running = false;
  remaining = 0;
  private id: any = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['seconds']) this.remaining = this.seconds;
    if (this.running) this.start(); else this.stop();
  }

  start() {
    this.stop();
    this.id = setInterval(() => {
      if (this.remaining > 0) this.remaining -= 1;
      else this.stop();
    }, 1000);
  }

  stop() {
    if (this.id) { clearInterval(this.id); this.id = null; }
  }

  ngOnDestroy() { this.stop(); }
}