import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-answer-button',
  templateUrl: './answer-button.component.html',
  styleUrls: ['./answer-button.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule] 
})
export class AnswerButtonComponent {
  @Input() label = '';
  @Input() disabled = false;
  @Output() pick = new EventEmitter<void>();
}
