using BussinessLayer.Interface;
using DataAccessLayer.Dto.Menu;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;

namespace BussinessLayer.Services
{
    public class CartService : ICartService
    {
        private readonly ICartRepository _cartRepository;
        private readonly IMenuRepository _menuRepository;

        public CartService(ICartRepository cartRepository, IMenuRepository menuRepository)
        {
            _cartRepository = cartRepository;
            _menuRepository = menuRepository;
        }

        public async Task<IReadOnlyList<CartItemResponse>> GetMyCart(Guid userId)
        {
            var cartItems = await _cartRepository.GetActiveCartItemsByUser(userId);
            return MapCartItems(cartItems);
        }

        public async Task<IReadOnlyList<CartItemResponse>> UpsertCartItem(Guid userId, Guid menuItemId, UpsertCartItemRequest request)
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
                throw new InvalidOperationException("Requested quantity exceeds available stock.");
            }

            var cartItem = await _cartRepository.GetActiveCartItem(userId, menuItemId);
            if (cartItem is null)
            {
                cartItem = new CartItemEntity
                {
                    UserId = userId,
                    MenuItemId = menuItemId,
                    Quantity = request.Quantity,
                    UnitPrice = menuItem.Price,
                    CreatedBy = userId.ToString()
                };

                await _cartRepository.AddCartItem(cartItem);
            }
            else
            {
                cartItem.Quantity = request.Quantity;
                cartItem.UnitPrice = menuItem.Price;
                cartItem.UpdatedAt = DateTime.UtcNow;
                cartItem.UpdatedBy = userId.ToString();
            }

            await _cartRepository.SaveChanges();
            return await GetMyCart(userId);
        }

        public async Task<IReadOnlyList<CartItemResponse>> RemoveCartItem(Guid userId, Guid menuItemId)
        {
            var cartItem = await _cartRepository.GetActiveCartItem(userId, menuItemId);
            if (cartItem is not null)
            {
                cartItem.IsActive = false;
                cartItem.UpdatedAt = DateTime.UtcNow;
                cartItem.UpdatedBy = userId.ToString();
                await _cartRepository.SaveChanges();
            }

            return await GetMyCart(userId);
        }

        private static IReadOnlyList<CartItemResponse> MapCartItems(List<CartItemEntity> cartItems)
        {
            var response = new List<CartItemResponse>();
            foreach (var item in cartItems)
            {
                response.Add(new CartItemResponse
                {
                    MenuItemId = item.MenuItemId,
                    MenuItemName = item.MenuItem.Name,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalPrice = item.UnitPrice * item.Quantity
                });
            }

            return response;
        }
    }
}
