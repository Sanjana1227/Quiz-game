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

  //  connect() {
  //   if (this.socket && this.socket.connected) return;
  //   // adapt URL if needed
  //   this.socket = io('https://6a98f07e4fed.ngrok-free.app', { transports: ['websocket', 'polling'] });

  //   this.socket.on('disconnect', reason => {
  //   console.warn('Socket disconnected:', reason);
  // });
  // }

  connect() {
  if (this.socket && this.socket.connected) return;

  this.socket = io('http://localhost:5505', {
    transports: ['websocket','polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  this.socket.on('disconnect', reason => console.warn('Socket disconnected:', reason));
  this.socket.on('reconnect_attempt', n => console.log('reconnect attempt', n));
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
