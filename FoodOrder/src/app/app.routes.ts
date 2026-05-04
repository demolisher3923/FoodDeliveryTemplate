import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Menu } from './features/menu/menu';
import { Profile } from './features/user/profile/profile';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { AdminMenu } from './features/admin/admin-menu/admin-menu';
import { Notfound } from './features/notfound/notfound';

export const routes: Routes = [
    {path: '', component:Home},
    { path: 'login', component: Login },
	{ path: 'register', component: Register },
	{ path: 'menu', component: Menu },
    {
		path: 'profile',
		component: Profile,
		canActivate: [authGuard, roleGuard],
		data: { role: 'User' }
	},
    {
		path: 'admin/dashboard',
		component: AdminMenu,
		canActivate: [authGuard, roleGuard],
		data: { role: 'Admin' }
	},
	{
		path: 'admin/menu',
		component: AdminMenu,
		canActivate: [authGuard, roleGuard],
		data: { role: 'Admin' }
	},
    { path: '**', component: Notfound }
];
