using DataAccessLayer.Models;

namespace DataAccessLayer.Interface
{
    public interface ICartRepository
    {
        Task<List<CartItemEntity>> GetActiveCartItemsByUser(Guid userId);
        Task<CartItemEntity?> GetActiveCartItem(Guid userId, Guid menuItemId);
        Task AddCartItem(CartItemEntity cartItem);
        Task<int> SaveChanges();
    }
}
