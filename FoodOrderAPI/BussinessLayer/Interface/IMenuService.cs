using DataAccessLayer.Dto.Menu;

namespace BussinessLayer.Interface
{
    public interface IMenuService
    {
        Task<IReadOnlyList<MenuItemResponse>> GetMenu();
        Task<MenuItemResponse> CreateMenuItem(MenuItemRequest request, string createdBy);
        Task<MenuItemResponse> UpdateMenuItem(Guid id, MenuItemRequest request, string updatedBy);
        Task DeleteMenuItem(Guid id, string updatedBy);
        Task<OrderResponse> PlaceOrder(Guid menuItemId, Guid userId, PlaceOrderRequest request);
        Task<IReadOnlyList<OrderResponse>> GetMyOrders(Guid userId);
        Task<IReadOnlyList<AdminOrderResponse>> GetAllOrders();
        Task<AdminOrderResponse> UpdateOrderStatus(Guid orderId, string status, string updatedBy);
    }
}
