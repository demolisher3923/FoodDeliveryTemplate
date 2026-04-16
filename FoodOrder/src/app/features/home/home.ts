import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-home',
  imports: [RouterLink,MatButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
