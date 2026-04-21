import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { OrderResponse } from '../../../../models/menu.model';

@Component({
  selector: 'app-user-orders',
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './user-orders.html',
  styleUrl: './user-orders.css',
})
export class UserOrders {
  @Input() myOrders: OrderResponse[] = [];
  @Output() refreshClicked = new EventEmitter<void>();

  readonly orderProgressSteps = ['Placed', 'Confirmed', 'Preparing', 'OutForDelivery', 'Delivered'];

  getOrderStatusChipClass(status: string): string {
    const normalized = this.toCanonicalStatus(status).toLowerCase();

    if (normalized === 'delivered') {
      return 'status-chip delivered';
    }

    if (normalized === 'cancelled') {
      return 'status-chip cancelled';
    }

    if (normalized === 'outfordelivery') {
      return 'status-chip out-for-delivery';
    }

    if (normalized === 'preparing') {
      return 'status-chip preparing';
    }

    if (normalized === 'confirmed') {
      return 'status-chip confirmed';
    }

    return 'status-chip placed';
  }

  isStepCompleted(status: string, step: string): boolean {
    const normalizedStatus = this.toCanonicalStatus(status);
    const normalizedStep = this.toCanonicalStatus(step);

    if (normalizedStatus === 'Cancelled') {
      return false;
    }

    return this.orderProgressSteps.indexOf(normalizedStep) <= this.orderProgressSteps.indexOf(normalizedStatus);
  }

  isStepCurrent(status: string, step: string): boolean {
    const normalizedStatus = this.toCanonicalStatus(status);
    const normalizedStep = this.toCanonicalStatus(step);

    if (normalizedStatus === 'Cancelled') {
      return false;
    }

    return normalizedStatus === normalizedStep;
  }

  private toCanonicalStatus(status: string): string {
    const normalized = (status ?? '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (normalized === 'outfordelivery') {
      return 'OutForDelivery';
    }

    if (normalized === 'delivered') {
      return 'Delivered';
    }

    if (normalized === 'preparing') {
      return 'Preparing';
    }

    if (normalized === 'confirmed') {
      return 'Confirmed';
    }

    if (normalized === 'cancelled') {
      return 'Cancelled';
    }

    return 'Placed';
  }
}
