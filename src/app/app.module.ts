import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Shared components
import { QuestionCardComponent } from './components/question-card/question-card.component';
import { PlayerListComponent } from './components/player-list/player-list.component';
import { TimerComponent } from './components/timer/timer.component';
import { AnswerButtonComponent } from './components/answer-button/answer-button.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    QuestionCardComponent,
    PlayerListComponent,
    TimerComponent,
    AnswerButtonComponent
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent],
})
export class AppModule {}
