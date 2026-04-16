import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="not-found-page">
      <h1>404</h1>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist or was moved.</p>
      <div class="actions">
        <button mat-raised-button color="primary" routerLink="/">Go Home</button>
        <button mat-stroked-button color="primary" routerLink="/menu">Go to Menu</button>
      </div>
    </section>
  `,
  styles: [
    `
      .not-found-page {
        min-height: 60vh;
        display: grid;
        place-content: center;
        text-align: center;
        gap: 10px;
        padding: 24px;
      }

      h1 {
        margin: 0;
        font-size: 4rem;
        color: #1d4ed8;
      }

      h2 {
        margin: 0;
      }

      p {
        margin: 0;
        color: #5f6e7f;
      }

      .actions {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 8px;
      }
    `,
  ],
})
export class NotFound {}
