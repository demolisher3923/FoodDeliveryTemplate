using DataAccessLayer.Dto.Menu;

namespace BussinessLayer.Interface
{
    public interface ICartService
    {
        Task<IReadOnlyList<CartItemResponse>> GetMyCart(Guid userId);
        Task<IReadOnlyList<CartItemResponse>> UpsertCartItem(Guid userId, Guid menuItemId, UpsertCartItemRequest request);
        Task<IReadOnlyList<CartItemResponse>> RemoveCartItem(Guid userId, Guid menuItemId);
    }
}
