using DataAccessLayer.Data;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessLayer.Repository
{
    public class CartRepository : ICartRepository
    {
        private readonly FoodDbContext _context;

        public CartRepository(FoodDbContext context)
        {
            _context = context;
        }

        public Task<List<CartItemEntity>> GetActiveCartItemsByUser(Guid userId)
        {
            return _context.CartItems
                .AsNoTracking()
                .Include(x => x.MenuItem)
                .Where(x => x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public Task<CartItemEntity?> GetActiveCartItem(Guid userId, Guid menuItemId)
        {
            return _context.CartItems
                .FirstOrDefaultAsync(x => x.UserId == userId && x.MenuItemId == menuItemId && x.IsActive);
        }

        public async Task AddCartItem(CartItemEntity cartItem)
        {
            await _context.CartItems.AddAsync(cartItem);
        }

        public Task<int> SaveChanges()
        {
            return _context.SaveChangesAsync();
        }
    }
}
