import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AdminOrderResponse } from '../../../../../models/menu.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-dashboard-panel',
  imports: [MatCardModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboardPanel implements AfterViewInit, OnChanges, OnDestroy {
  @Input() todaysOrdersCount = 0;
  @Input() todaysRevenue = 0;
  @Input() activeUsersCount = 0;
  @Input() orders: AdminOrderResponse[] = [];

  @ViewChild('kpiChart') kpiChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef?: ElementRef<HTMLCanvasElement>;

  private kpiChart?: Chart;
  private ordersChart?: Chart;
  private readonly orderStatusOptions = ['Placed', 'Confirmed', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'];

  ngAfterViewInit(): void {
    this.renderCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.kpiChartRef || !this.ordersChartRef) {
      return;
    }

    if (changes['todaysOrdersCount'] || changes['todaysRevenue'] || changes['activeUsersCount'] || changes['orders']) {
      this.renderCharts();
    }
  }

  ngOnDestroy(): void {
    this.kpiChart?.destroy();
    this.ordersChart?.destroy();
  }

  private renderCharts(): void {
    if (!this.kpiChartRef || !this.ordersChartRef) {
      return;
    }

    this.kpiChart?.destroy();
    this.ordersChart?.destroy();

    this.kpiChart = new Chart(this.kpiChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Today Orders', 'Today Revenue', 'Active Users (Page)'],
        datasets: [
          {
            label: 'Realtime Metrics',
            data: [this.todaysOrdersCount, this.todaysRevenue, this.activeUsersCount],
            backgroundColor: ['#2563eb', '#16a34a', '#f59e0b'],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
      },
    });

    const statusCounts = this.orderStatusOptions.map(
      (status) => this.orders.filter((x) => this.normalizeStatus(x.status) === status).length,
    );

    this.ordersChart = new Chart(this.ordersChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.orderStatusOptions,
        datasets: [
          {
            label: 'Order Status',
            data: statusCounts,
            backgroundColor: ['#2563eb', '#06b6d4', '#f59e0b', '#7c3aed', '#16a34a', '#dc2626'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  private normalizeStatus(status: string): string {
    const trimmed = (status ?? '').trim();
    const normalizedKey = trimmed.replace(/[^a-z0-9]/gi, '').toLowerCase();

    const match = this.orderStatusOptions.find(
      (x) => x.replace(/[^a-z0-9]/gi, '').toLowerCase() === normalizedKey,
    );

    return match ?? trimmed;
  }
}
