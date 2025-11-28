import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-player-list',
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule] 
})
export class PlayerListComponent {
  @Input() players: Array<{ id?: string; username: string; score?: number }> = [];
}
