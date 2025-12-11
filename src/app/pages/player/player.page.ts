import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { usernameValidator, inviteCodeValidator } from '../../utils/validators';
import { ThreeBackgroundComponent } from "src/app/components/three-background/three-background.component";

@Component({
  selector: 'app-player',
  templateUrl: './player.page.html',
  styleUrls: ['./player.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, ThreeBackgroundComponent],
})
export class PlayerPage implements OnInit, OnDestroy {
  roomId = '';
  username = '';
  joined = false;
  waiting = true;
  currentQuestion: any = null;
  selectedAnswer: number | null = null;
  leaderboard: any[] = [];
  countdown = 0;
  subs: Subscription[] = [];
  
  resultMessage: string | null = null;
  showQuestion = false; // controls showing question/options
  isGameStarting = false;
  earnedPoints: number = 0;
  totalPoints: number = 0;
  rank: number = 0;
  aheadOfMe: string | null = null;
  errorMessage = '';



  constructor(private socketService: SocketService) {}

  ngOnInit() {
    this.socketService.connect();

    // Room joined successfully
    this.subs.push(
      this.socketService.on('game:successJoin').subscribe(() => {
        this.joined = true;
        this.waiting = true;
      })
    );

    // Game status updates
    this.subs.push(
      this.socketService.on<any>('game:status').subscribe(status => {
        switch (status.name) {
          case 'SHOW_START':
            this.waiting = true;
            this.isGameStarting = true;
            this.startCountdown(status.data.time);
            break;
            case 'SHOW_PREPARED': // show prep / question only
            case 'SHOW_QUESTION':
              this.currentQuestion = {
                question: status.data.questionNumber ? `Question ${status.data.questionNumber}` : status.data.question,
                image: status.data.image || null,
                answers: [] // no options yet
              };
              this.waiting = true;
              this.selectedAnswer = null;
              this.resultMessage = null;
              this.showQuestion = false;
              break;
  
            case 'SELECT_ANSWER': // show question + options
              this.currentQuestion = status.data;
              this.waiting = false;
              this.selectedAnswer = null;
              this.resultMessage = null;
              this.showQuestion = true;
              this.isGameStarting = false;
              this.startCountdown(status.data.time);
              break;

              case 'SHOW_RESULT':
                this.currentQuestion = null; 
                this.showQuestion = false; // hide question/options
                this.resultMessage = status.data.message; // "Nice!" or "Too bad"
                this.earnedPoints = status.data.points;    // round points
                this.totalPoints = status.data.myPoints;   // accumulated points
                this.rank = status.data.rank;
                this.aheadOfMe = status.data.aheadOfMe;
                this.waiting = false; 
                this.countdown = 0; 
                this.waiting = false; 
                break;

          case 'WAIT':
            this.waiting = true;
            break;
          case 'SHOW_LEADERBOARD':
            this.leaderboard = status.data.leaderboard;
            this.currentQuestion = null;
            break;
          case 'FINISH':
            this.leaderboard = status.data.top;
            this.currentQuestion = null;
            this.resultMessage = null;
            this.showQuestion = false;
            this.waiting = true;
            break;
        }
      })
    );
  }

  showError(message: string) {
    this.errorMessage = message;
  
    // auto-clear after 2 sec
    setTimeout(() => {
      this.errorMessage = '';
    }, 2000);
  }

  
  joinRoom() {
    if (!this.username || !this.roomId) {
      alert('Enter username and room code');
      return;
    }
    try {
      usernameValidator.validateSync(this.username);
      inviteCodeValidator.validateSync(this.roomId);
    } catch (error: any) {
      this.showError(error.message); 
      return;
    }
    this.socketService.emit('player:join', { username: this.username, room: this.roomId });
  }

  selectAnswer(i: number) {
    if (this.selectedAnswer !== null) return;
    this.selectedAnswer = i;
    this.socketService.emit('player:selectedAnswer', i);
  }

  startCountdown(seconds: number) {
    this.countdown = seconds;
    const sub = timer(0, 1000).subscribe(t => {
      this.countdown = seconds - t;
      if (this.countdown <= 0) {
        sub.unsubscribe();
        // Do not reset anything here — countdown stays 0 until question comes
      }
    });
  }  

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.socketService.disconnect();
  }
}
