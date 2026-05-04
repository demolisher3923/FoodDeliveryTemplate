using DataAccessLayer.Dto.Menu;
using DataAccessLayer.Dto.Common;

namespace BussinessLayer.Interface
{
    public interface IMenuService
    {
        Task<IReadOnlyList<MenuItemResponse>> GetMenu();
        Task<MenuItemResponse> CreateMenuItem(MenuItemRequest request);
        Task<MenuItemResponse> UpdateMenuItem(Guid id, MenuItemRequest request);
        Task DeleteMenuItem(Guid id);
        Task<OrderResponse> PlaceOrder(Guid menuItemId, PlaceOrderRequest request);
        Task<IReadOnlyList<OrderResponse>> GetMyOrders();
        Task<IReadOnlyList<AdminOrderResponse>> GetAllOrders();
        Task<PaginationResponse<AdminOrderResponse>> GetPagedOrders(PaginationRequest request);
        Task<AdminOrderResponse> UpdateOrderStatus(Guid orderId, string status);
    }
}
