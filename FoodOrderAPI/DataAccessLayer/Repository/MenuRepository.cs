using DataAccessLayer.Data;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessLayer.Repository
{
    public class MenuRepository : IMenuRepository
    {
        private readonly FoodDbContext _context;

        public MenuRepository(FoodDbContext context)
        {
            _context = context;
        }

        public Task<List<MenuItem>> GetActiveMenuItems()
        {
            return _context.MenuItems
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Name)
                .ToListAsync();
        }

        public Task<MenuItem?> GetActiveMenuItemById(Guid id)
        {
            return _context.MenuItems.FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
        }

        public async Task AddMenuItem(MenuItem menuItem)
        {
            await _context.MenuItems.AddAsync(menuItem);
        }

        public Task<List<FoodOrder>> GetActiveOrdersByUser(Guid userId)
        {
            return _context.Orders
                .AsNoTracking()
                .Include(x => x.MenuItem)
                .Where(x => x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public Task<List<FoodOrder>> GetAllActiveOrders()
        {
            return _context.Orders
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.MenuItem)
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public Task<FoodOrder?> GetActiveOrderById(Guid orderId)
        {
            return _context.Orders
                .Include(x => x.User)
                .Include(x => x.MenuItem)
                .FirstOrDefaultAsync(x => x.Id == orderId && x.IsActive);
        }

        public async Task AddOrder(FoodOrder order)
        {
            await _context.Orders.AddAsync(order);
        }

        public Task<int> SaveChanges()
        {
            return _context.SaveChangesAsync();
        }
    }
}
