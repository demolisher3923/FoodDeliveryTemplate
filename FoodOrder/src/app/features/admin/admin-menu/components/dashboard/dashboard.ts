import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart } from 'chart.js/auto';
import { MenuService } from '../../../../../core/services/menu-service';
import { UserService } from '../../../../../core/services/user-service';
import { AdminOrderResponse } from '../../../../../models/menu.model';

@Component({
  selector: 'app-admin-dashboard-panel',
  imports: [MatCardModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboardPanel implements AfterViewInit, OnInit, OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly userService = inject(UserService);
  private viewReady = false;

  todaysOrdersCount = 0;
  todaysRevenue = 0;
  activeUsersCount = 0;
  orders: AdminOrderResponse[] = [];

  @ViewChild('kpiChart') kpiChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef?: ElementRef<HTMLCanvasElement>;

  private kpiChart?: Chart;
  private ordersChart?: Chart;
  private readonly orderStatusOptions = ['Placed', 'Confirmed', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'];

  ngOnInit(): void {
    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.kpiChart?.destroy();
    this.ordersChart?.destroy();
  }

  private loadStats(): void {
    this.menuService.getAdminOrders().subscribe({
      next: (orders) => {
        this.orders = orders.map((order) => ({
          ...order,
          status: this.normalizeStatus(order.status),
        }));
        this.updateTodayStats();
        this.renderCharts();
      },
    });

    this.userService
      .getUsers({
        pageNumber: 1,
        pageSize: 8,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.activeUsersCount = response.items.filter((x) => x.isActive).length;
          this.renderCharts();
        },
      });
  }

  private renderCharts(): void {
    if (!this.viewReady || !this.kpiChartRef || !this.ordersChartRef) {
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

  private updateTodayStats(): void {
    const today = new Date();
    this.todaysOrdersCount = this.orders.filter((x) => this.isToday(new Date(x.createdAt), today)).length;
    this.todaysRevenue = this.orders
      .filter((x) => this.isToday(new Date(x.createdAt), today) && x.status !== 'Cancelled')
      .reduce((sum, x) => sum + x.totalPrice, 0);
  }

  private normalizeStatus(status: string): string {
    const trimmed = (status ?? '').trim();
    const normalizedKey = trimmed.replace(/[^a-z0-9]/gi, '').toLowerCase();

    const match = this.orderStatusOptions.find(
      (x) => x.replace(/[^a-z0-9]/gi, '').toLowerCase() === normalizedKey,
    );

    return match ?? trimmed;
  }

  private isToday(value: Date, today: Date): boolean {
    return value.getFullYear() === today.getFullYear()
      && value.getMonth() === today.getMonth()
      && value.getDate() === today.getDate();
  }
}
