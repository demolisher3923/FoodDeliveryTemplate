import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notfound',
  imports: [RouterLink,MatButtonModule],
  templateUrl: './notfound.html',
  styleUrl: './notfound.css',
})
export class Notfound {}
