import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'manager', loadChildren: () => import('./pages/manager/manager.module').then(m => m.ManagerPageModule) },
  { path: 'player', loadChildren: () => import('./pages/player/player.module').then( m => m.PlayerPageModule)},
  { path: '**', redirectTo: 'player' },
  {
    path: 'three-background',
    loadChildren: () => import('../app/components/three-background/three-background.component').then( m => m.ThreeBackgroundComponent)
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
