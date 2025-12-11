import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;

  // connect(): void {
  //   if (!this.socket) {
  //     this.socket = io('http://localhost:5505', {
  //       transports: ['websocket']
  //     }); 
  //   }
  // }

   connect() {
    if (this.socket && this.socket.connected) return;

    // Replace with your Render backend URL
    const BACKEND = 'https://quiz-game-09iu.onrender.com';

    this.socket = io(BACKEND, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => console.log('Socket connected', this.socket?.id));
    this.socket.on('disconnect', reason => console.warn('Socket disconnected:', reason));
    this.socket.on('connect_error', (err) => console.error('Socket connect_error', err));
  }



  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.socket?.on(event, (data: T) => subscriber.next(data));
      return () => this.socket?.off(event);
    });
  }
}
