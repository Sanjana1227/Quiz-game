import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { IonHeader, IonToolbar, IonTitle } from "@ionic/angular/standalone";
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inviteCodeValidator } from '../../utils/validators';
import * as THREE from 'three';
import { ThreeBackgroundComponent } from "src/app/components/three-background/three-background.component";

@Component({
  selector: 'app-manager',
  templateUrl: './manager.page.html',
  styleUrls: ['./manager.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, ThreeBackgroundComponent],
})
export class ManagerPage implements OnInit, OnDestroy {
  password = '';
  inviteCode: string | null = null;
  players: any[] = [];
  currentQuestion: any = null;
  leaderboard: any[] = [];
  waiting = true;
  playerAnswersCount = { correct: 0, wrong: 0 };
  countdown = 0;
  subs: Subscription[] = [];
  responses: any = null; // to store SHOW_RESPONSES
  showResponses = false; // flag to show responses only after time over
  isGameStarting = false;
  showLeaderboard = false;
  isFinalLeaderboard = false;
  errorMessage: string = ''; 

  constructor(private socketService: SocketService) {}

  ngOnInit() {
    this.socketService.connect();

    this.subs.push(
      this.socketService.on<string>('game:errorMessage').subscribe(msg => {
        this.showError(msg); 
        console.error("Error from backend:", msg);
      })
    );

    // Room code received
    this.subs.push(
      this.socketService.on<string>('manager:inviteCode').subscribe(code => this.inviteCode = code)
    );

    // New player joined
    this.subs.push(
      this.socketService.on<any>('manager:newPlayer').subscribe(player => this.players.push(player))
    );

    // Player kicked
    this.subs.push(
      this.socketService.on<string>('manager:playerKicked').subscribe(id => {
        this.players = this.players.filter(p => p.id !== id);
      })
    );

    // Game status updates
    this.subs.push(
      this.socketService.on<any>('game:status').subscribe(status => {
        switch (status.name) {
          case 'SHOW_START':
            this.waiting = true;
            this.startCountdown(status.data.time);
            this.responses = null;           // reset responses
            this.showResponses = false; 
            this.isGameStarting = true;
            break;
            
            case 'SHOW_PREPARED': // show prep / get ready message
            this.currentQuestion = {
              question: status.data.questionNumber ? `Question ${status.data.questionNumber}` : '',
              image: status.data.image || null,
              answers: [] // no answers yet
            };
            this.waiting = true; // optional: show "Get Ready"
            this.responses = null;           
            this.showResponses = false;     
            break;

          case 'SHOW_QUESTION': // optional if backend sends SHOW_QUESTION
            this.currentQuestion = {
              question: status.data.question || `Question ${status.data.questionNumber}`,
              image: status.data.image || null,
              answers: [] // still no options
            };
            this.waiting = true; // still prep phase
            this.showResponses = false;
            this.responses = null; 
            break;

          case 'SELECT_ANSWER': // show question + options
            this.currentQuestion = status.data; // contains question, image, answers
            this.waiting = false;
            this.showResponses = false; 
            this.responses = null;
            this.isGameStarting = false;
            // this.playerAnswersCount = { correct: 0, wrong: 0 };
            this.startCountdown(status.data.time); // countdown for answering
            break;

            case 'SHOW_RESPONSES':
            // Store data but don't show yet
            this.responses = status.data;
            this.showResponses = false;

            // Wait until countdown hits 0
            setTimeout(() => {
              this.showResponses = true;
              this.currentQuestion = null;
              this.showLeaderboard = false; 
            }, this.countdown * 1000);
            break;

            
          case 'WAIT':
            this.waiting = true;
            break;
          case 'SHOW_LEADERBOARD':
            this.leaderboard = status.data.leaderboard;
            this.currentQuestion = null;
            this.responses = null;
            this.showResponses = false;
            this.showLeaderboard = true;
            this.isFinalLeaderboard = false; 
            break;
          case 'FINISH':
            this.leaderboard = status.data.top;
            this.currentQuestion = null;
            this.waiting = true;
            this.responses = null;
            this.showResponses = false;
            this.isFinalLeaderboard = true; 
            this.showLeaderboard = true;
            console.log("📢 FINAL LEADERBOARD");
            this.leaderboard.forEach((p, i) => {
              console.log(`#${i + 1} - ${p.username} | ${p.points} pts`);
            });

            break;
        }
      })
    );

    // Player answers progress
    this.subs.push(
      this.socketService.on<any>('game:playerAnswer').subscribe(count => {
        this.playerAnswersCount.correct = count.correct ?? 0;
        this.playerAnswersCount.wrong = count.wrong ?? 0;
      })
    );
  }

  private showError(msg: string) {
    this.errorMessage = msg;
  
    // Auto-clear after 3 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 2000);
  }  

  getPercentage(index: number): number {
    const total = this.responses.responses.reduce((sum: number, val: number) => sum + (val || 0), 0);
    if (total === 0) return 0;
    return ((this.responses.responses[index] || 0) / total) * 100;
  }  

  createRoom() {
    try {
      if (!this.password) throw new Error('Password cannot be empty');
      // Optionally use a validator
      // usernameValidator.validateSync(this.password);
      this.socketService.emit('manager:createRoom', this.password);
      this.errorMessage = '';
    } catch (err: any) {
      this.showError(err.message);
    }
  }

  startGame() {
    this.socketService.emit('manager:startGame');
  }

  nextQuestion() {
    this.socketService.emit('manager:nextQuestion');
    this.showLeaderboard = false;
  }

  abortQuiz() {
    this.socketService.emit('manager:abortQuiz');
  }

  kickPlayer(id: string) {
    this.socketService.emit('manager:kickPlayer', id);
    this.players = this.players.filter(p => p.id !== id);
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

  showLeaderboardFromManager() {
    this.socketService.emit('manager:showLeaderboard');
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.socketService.disconnect();
  }
}
