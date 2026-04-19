import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MenuItem } from '../../../../models/menu.model';
import { environment } from '../../../../../environments/environment.development';

@Component({
  selector: 'app-menu-item-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './menu-item-card.html',
  styleUrl: './menu-item-card.css',
})
export class MenuItemCard {
  @Input({ required: true }) item!: MenuItem;
  @Input() isAdmin = false;
  @Input() isUser = false;
  @Input() quantity = 1;
  @Input() isAdding = false;

  @Output() edit = new EventEmitter<MenuItem>();
  @Output() remove = new EventEmitter<MenuItem>();
  @Output() decrement = new EventEmitter<string>();
  @Output() increment = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<MenuItem>();

  get imageSrc(): string | null {
    const imageUrl = this.item?.imageUrl;
    if (!imageUrl) {
      return null;
    }

    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    return `${environment.apiUrl.replace('/api', '')}${imageUrl}`;
  }
}
