using BussinessLayer.Interface;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.Menu;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;

namespace BussinessLayer.Services
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepository;
        private readonly ICartRepository _cartRepository;
        private static readonly string[] AllowedOrderStatuses = new[] { "Placed", "Confirmed", "Preparing", "OutForDelivery", "Delivered", "Cancelled" };

        public MenuService(IMenuRepository menuRepository, ICartRepository cartRepository)
        {
            _menuRepository = menuRepository;
            _cartRepository = cartRepository;
        }

        public async Task<IReadOnlyList<MenuItemResponse>> GetMenu()
        {
            var menuItems = await _menuRepository.GetActiveMenuItems();

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

        public async Task<MenuItemResponse> CreateMenuItem(MenuItemRequest request, string createdBy)
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

            await _menuRepository.AddMenuItem(menuItem);
            await _menuRepository.SaveChanges();

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

        public async Task<MenuItemResponse> UpdateMenuItem(Guid id, MenuItemRequest request, string updatedBy)
        {
            var menuItem = await _menuRepository.GetActiveMenuItemById(id);
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

            await _menuRepository.SaveChanges();
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

        public async Task DeleteMenuItem(Guid id, string updatedBy)
        {
            var menuItem = await _menuRepository.GetActiveMenuItemById(id);
            if (menuItem is null)
            {
                throw new KeyNotFoundException("Menu item not found.");
            }

            menuItem.IsActive = false;
            menuItem.IsAvailable = false;
            menuItem.UpdatedAt = DateTime.UtcNow;
            menuItem.UpdatedBy = updatedBy;
            await _menuRepository.SaveChanges();
        }

        public async Task<OrderResponse> PlaceOrder(Guid menuItemId, Guid userId, PlaceOrderRequest request)
        {
            if (request.Quantity < 1)
            {
                throw new InvalidOperationException("Quantity must be at least 1.");
            }

            var menuItem = await _menuRepository.GetActiveMenuItemById(menuItemId);
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

            await _menuRepository.AddOrder(order);

            var cartItem = await _cartRepository.GetActiveCartItem(userId, menuItemId);
            if (cartItem is not null)
            {
                cartItem.IsActive = false;
                cartItem.UpdatedAt = DateTime.UtcNow;
                cartItem.UpdatedBy = userId.ToString();
            }

            await _menuRepository.SaveChanges();

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

        public async Task<IReadOnlyList<OrderResponse>> GetMyOrders(Guid userId)
        {
            var orders = await _menuRepository.GetActiveOrdersByUser(userId);

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

        public async Task<IReadOnlyList<AdminOrderResponse>> GetAllOrders()
        {
            var orders = await _menuRepository.GetAllActiveOrders();

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

        public Task<PaginationResponse<AdminOrderResponse>> GetPagedOrders(PaginationRequest request)
        {
            return _menuRepository.GetPagedActiveOrders(request);
        }

        public async Task<AdminOrderResponse> UpdateOrderStatus(Guid orderId, string status, string updatedBy)
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

            var order = await _menuRepository.GetActiveOrderById(orderId);

            if (order is null)
            {
                throw new KeyNotFoundException("Order not found.");
            }

            order.Status = finalStatus;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = updatedBy;
            await _menuRepository.SaveChanges();

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
