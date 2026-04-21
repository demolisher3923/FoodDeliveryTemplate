using DataAccessLayer.Models;

namespace DataAccessLayer.Interface
{
    public interface IMenuRepository
    {
        Task<List<MenuItem>> GetActiveMenuItems();
        Task<MenuItem?> GetActiveMenuItemById(Guid id);
        Task AddMenuItem(MenuItem menuItem);

        Task<List<FoodOrder>> GetActiveOrdersByUser(Guid userId);
        Task<List<FoodOrder>> GetAllActiveOrders();
        Task<FoodOrder?> GetActiveOrderById(Guid orderId);
        Task AddOrder(FoodOrder order);

        Task<int> SaveChanges();
    }
}
