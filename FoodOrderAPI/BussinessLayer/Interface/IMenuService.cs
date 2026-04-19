using DataAccessLayer.Dto.Menu;

namespace BussinessLayer.Interface
{
    public interface IMenuService
    {
        Task<IReadOnlyList<MenuItemResponse>> GetMenu(CancellationToken cancellationToken = default);
        Task<MenuItemResponse> CreateMenuItem(MenuItemRequest request, string createdBy, CancellationToken cancellationToken = default);
        Task<MenuItemResponse> UpdateMenuItem(Guid id, MenuItemRequest request, string updatedBy, CancellationToken cancellationToken = default);
        Task DeleteMenuItem(Guid id, string updatedBy, CancellationToken cancellationToken = default);
        Task<OrderResponse> PlaceOrder(Guid menuItemId, Guid userId, PlaceOrderRequest request, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<OrderResponse>> GetMyOrders(Guid userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<AdminOrderResponse>> GetAllOrders(CancellationToken cancellationToken = default);
        Task<AdminOrderResponse> UpdateOrderStatus(Guid orderId, string status, string updatedBy, CancellationToken cancellationToken = default);
    }
}
