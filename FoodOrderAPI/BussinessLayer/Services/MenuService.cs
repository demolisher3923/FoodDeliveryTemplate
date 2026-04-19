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
        private static readonly string[] AllowedOrderStatuses = new[] { "Placed", "Confirmed", "Preparing", "OutForDelivery", "Delivered", "Cancelled" };

        public MenuService(FoodDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<MenuItemResponse>> GetMenu(CancellationToken cancellationToken = default)
        {
            var menuItems = await _context.MenuItems
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Name)
                .ToListAsync(cancellationToken);

            var response = new List<MenuItemResponse>();
            foreach (var item in menuItems)
            {
                response.Add(new MenuItemResponse
                {
                    Id = item.Id,
                    Name = item.Name,
                    Description = item.Description,
                    Category = item.Category,
                    Price = item.Price,
                    StockQuantity = item.StockQuantity,
                    IsAvailable = item.IsAvailable,
                    ImageUrl = item.ImageUrl
                });
            }

            return response;
        }

        public async Task<MenuItemResponse> CreateMenuItem(MenuItemRequest request, string createdBy, CancellationToken cancellationToken = default)
        {
            var menuItem = new MenuItem
            {
                Name = request.Name.Trim(),
                Description = request.Description.Trim(),
                Category = request.Category.Trim(),
                Price = request.Price,
                StockQuantity = request.StockQuantity,
                IsAvailable = request.IsAvailable && request.StockQuantity > 0,
                ImageUrl = request.ImageUrl,
                CreatedBy = createdBy
            };

            _context.MenuItems.Add(menuItem);
            await _context.SaveChangesAsync(cancellationToken);

            return new MenuItemResponse
            {
                Id = menuItem.Id,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Category = menuItem.Category,
                Price = menuItem.Price,
                StockQuantity = menuItem.StockQuantity,
                IsAvailable = menuItem.IsAvailable,
                ImageUrl = menuItem.ImageUrl
            };
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
            menuItem.Category = request.Category.Trim();
            menuItem.Price = request.Price;
            menuItem.StockQuantity = request.StockQuantity;
            menuItem.IsAvailable = request.IsAvailable && request.StockQuantity > 0;
            menuItem.ImageUrl = request.ImageUrl;
            menuItem.UpdatedAt = DateTime.UtcNow;
            menuItem.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync(cancellationToken);
            return new MenuItemResponse
            {
                Id = menuItem.Id,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Category = menuItem.Category,
                Price = menuItem.Price,
                StockQuantity = menuItem.StockQuantity,
                IsAvailable = menuItem.IsAvailable,
                ImageUrl = menuItem.ImageUrl
            };
        }

        public async Task DeleteMenuItem(Guid id, string updatedBy, CancellationToken cancellationToken = default)
        {
            var menuItem = await _context.MenuItems.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, cancellationToken);
            if (menuItem is null)
            {
                throw new KeyNotFoundException("Menu item not found.");
            }

            menuItem.IsActive = false;
            menuItem.IsAvailable = false;
            menuItem.UpdatedAt = DateTime.UtcNow;
            menuItem.UpdatedBy = updatedBy;
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<OrderResponse> PlaceOrder(Guid menuItemId, Guid userId, PlaceOrderRequest request, CancellationToken cancellationToken = default)
        {
            if (request.Quantity < 1)
            {
                throw new InvalidOperationException("Quantity must be at least 1.");
            }

            var menuItem = await _context.MenuItems.FirstOrDefaultAsync(x => x.Id == menuItemId && x.IsActive, cancellationToken);
            if (menuItem is null || !menuItem.IsAvailable)
            {
                throw new InvalidOperationException("Selected menu item is not available.");
            }

            if (menuItem.StockQuantity < request.Quantity)
            {
                throw new InvalidOperationException("Not enough stock available.");
            }

            menuItem.StockQuantity -= request.Quantity;
            if (menuItem.StockQuantity == 0)
            {
                menuItem.IsAvailable = false;
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
            var orders = await _context.Orders
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            var response = new List<OrderResponse>();
            foreach (var order in orders)
            {
                response.Add(new OrderResponse
                {
                    OrderId = order.Id,
                    MenuItemId = order.MenuItemId,
                    MenuItemName = order.MenuItem.Name,
                    Quantity = order.Quantity,
                    UnitPrice = order.UnitPrice,
                    TotalPrice = order.TotalPrice,
                    Status = order.Status,
                    CreatedAt = order.CreatedAt
                });
            }

            return response;
        }

        public async Task<IReadOnlyList<AdminOrderResponse>> GetAllOrders(CancellationToken cancellationToken = default)
        {
            var orders = await _context.Orders
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            var response = new List<AdminOrderResponse>();
            foreach (var order in orders)
            {
                response.Add(new AdminOrderResponse
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
                });
            }

            return response;
        }

        public async Task<AdminOrderResponse> UpdateOrderStatus(Guid orderId, string status, string updatedBy, CancellationToken cancellationToken = default)
        {
            var normalizedStatus = status?.Trim();
            var isValidStatus = false;
            if (!string.IsNullOrWhiteSpace(normalizedStatus))
            {
                foreach (var allowedStatus in AllowedOrderStatuses)
                {
                    if (string.Equals(allowedStatus, normalizedStatus, StringComparison.OrdinalIgnoreCase))
                    {
                        normalizedStatus = allowedStatus;
                        isValidStatus = true;
                        break;
                    }
                }
            }

            if (!isValidStatus)
            {
                throw new InvalidOperationException("Invalid order status.");
            }

            var finalStatus = normalizedStatus!;

            var order = await _context.Orders
                .Include(x => x.User)
                .Include(x => x.MenuItem)
                .FirstOrDefaultAsync(x => x.Id == orderId && x.IsActive, cancellationToken);

            if (order is null)
            {
                throw new KeyNotFoundException("Order not found.");
            }

            order.Status = finalStatus;
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
    }
}
