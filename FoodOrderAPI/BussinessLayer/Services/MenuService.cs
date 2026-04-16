using BussinessLayer.Interface;
using DataAccessLayer.Data;
using DataAccessLayer.Dto.Menu;
using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace BussinessLayer.Services
{
    public class MenuService : IMenuService
    {
        private readonly FoodDbContext _context;
        private static readonly string[] AllowedOrderStatuses = ["Placed", "Confirmed", "Preparing", "OutForDelivery", "Delivered", "Cancelled"];

        public MenuService(FoodDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<MenuItemResponse>> GetMenu(CancellationToken cancellationToken = default)
        {
            return await _context.MenuItems
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Name)
                .Select(x => new MenuItemResponse
                {
                    Id = x.Id,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    IsAvailable = x.IsAvailable,
                    ImageUrl = x.ImageUrl
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<MenuItemResponse> CreateMenuItem(MenuItemRequest request, string createdBy, CancellationToken cancellationToken = default)
        {
            var menuItem = new MenuItem
            {
                Name = request.Name.Trim(),
                Description = request.Description.Trim(),
                Price = request.Price,
                IsAvailable = request.IsAvailable,
                ImageUrl = request.ImageUrl,
                CreatedBy = createdBy
            };

            _context.MenuItems.Add(menuItem);
            await _context.SaveChangesAsync(cancellationToken);

            return MapMenuItem(menuItem);
        }

        public async Task<MenuItemResponse> UpdateMenuItem(Guid id, MenuItemRequest request, string updatedBy, CancellationToken cancellationToken = default)
        {
            var menuItem = await _context.MenuItems.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, cancellationToken);
            if (menuItem is null)
            {
                throw new KeyNotFoundException("Menu item not found.");
            }

            menuItem.Name = request.Name.Trim();
            menuItem.Description = request.Description.Trim();
            menuItem.Price = request.Price;
            menuItem.IsAvailable = request.IsAvailable;
            menuItem.ImageUrl = request.ImageUrl;
            menuItem.UpdatedAt = DateTime.UtcNow;
            menuItem.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync(cancellationToken);
            return MapMenuItem(menuItem);
        }

        public async Task<OrderResponse> PlaceOrder(Guid menuItemId, Guid userId, PlaceOrderRequest request, CancellationToken cancellationToken = default)
        {
            var menuItem = await _context.MenuItems.FirstOrDefaultAsync(x => x.Id == menuItemId && x.IsActive, cancellationToken);
            if (menuItem is null || !menuItem.IsAvailable)
            {
                throw new InvalidOperationException("Selected menu item is not available.");
            }

            var order = new FoodOrder
            {
                UserId = userId,
                MenuItemId = menuItem.Id,
                Quantity = request.Quantity,
                UnitPrice = menuItem.Price,
                TotalPrice = menuItem.Price * request.Quantity,
                Status = "Placed",
                CreatedBy = userId.ToString()
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync(cancellationToken);

            return new OrderResponse
            {
                OrderId = order.Id,
                MenuItemId = menuItem.Id,
                MenuItemName = menuItem.Name,
                Quantity = order.Quantity,
                UnitPrice = order.UnitPrice,
                TotalPrice = order.TotalPrice,
                Status = order.Status,
                CreatedAt = order.CreatedAt
            };
        }

        public async Task<IReadOnlyList<OrderResponse>> GetMyOrders(Guid userId, CancellationToken cancellationToken = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new OrderResponse
                {
                    OrderId = x.Id,
                    MenuItemId = x.MenuItemId,
                    MenuItemName = x.MenuItem.Name,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    TotalPrice = x.TotalPrice,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<AdminOrderResponse>> GetAllOrders(CancellationToken cancellationToken = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new AdminOrderResponse
                {
                    OrderId = x.Id,
                    UserId = x.UserId,
                    UserName = x.User.FullName,
                    UserEmail = x.User.Email,
                    MenuItemId = x.MenuItemId,
                    MenuItemName = x.MenuItem.Name,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    TotalPrice = x.TotalPrice,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<AdminOrderResponse> UpdateOrderStatus(Guid orderId, string status, string updatedBy, CancellationToken cancellationToken = default)
        {
            var normalizedStatus = status?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedStatus) || !AllowedOrderStatuses.Contains(normalizedStatus, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Invalid order status.");
            }

            var order = await _context.Orders
                .Include(x => x.User)
                .Include(x => x.MenuItem)
                .FirstOrDefaultAsync(x => x.Id == orderId && x.IsActive, cancellationToken);

            if (order is null)
            {
                throw new KeyNotFoundException("Order not found.");
            }

            order.Status = normalizedStatus;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = updatedBy;
            await _context.SaveChangesAsync(cancellationToken);

            return new AdminOrderResponse
            {
                OrderId = order.Id,
                UserId = order.UserId,
                UserName = order.User.FullName,
                UserEmail = order.User.Email,
                MenuItemId = order.MenuItemId,
                MenuItemName = order.MenuItem.Name,
                Quantity = order.Quantity,
                UnitPrice = order.UnitPrice,
                TotalPrice = order.TotalPrice,
                Status = order.Status,
                CreatedAt = order.CreatedAt
            };
        }

        private static MenuItemResponse MapMenuItem(MenuItem menuItem)
        {
            return new MenuItemResponse
            {
                Id = menuItem.Id,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                IsAvailable = menuItem.IsAvailable,
                ImageUrl = menuItem.ImageUrl
            };
        }
    }
}
