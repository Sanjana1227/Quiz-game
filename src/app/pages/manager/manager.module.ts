import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { Routes, RouterModule } from '@angular/router';

import { ManagerPageRoutingModule } from './manager-routing.module';

import { ManagerPage } from './manager.page';

const routes: Routes = [{ path: '', component: ManagerPage }];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManagerPageRoutingModule,
    ManagerPage,
    RouterModule.forChild(routes)
  ],
  // declarations: [ManagerPage]
})
export class ManagerPageModule {}
