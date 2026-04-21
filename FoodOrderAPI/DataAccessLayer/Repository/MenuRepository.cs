using DataAccessLayer.Data;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.Menu;
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

        public async Task<PaginationResponse<AdminOrderResponse>> GetPagedActiveOrders(PaginationRequest request)
        {
            var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
            var pageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
            var search = request.Search?.Trim().ToLowerInvariant();
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isDesc = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

            var query = _context.Orders
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.MenuItem)
                .Where(x => x.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(x =>
                    x.User.FullName.ToLower().Contains(search) ||
                    x.User.Email.ToLower().Contains(search) ||
                    x.MenuItem.Name.ToLower().Contains(search) ||
                    x.Status.ToLower().Contains(search));
            }

            if (sortBy == "username")
            {
                query = isDesc ? query.OrderByDescending(x => x.User.FullName) : query.OrderBy(x => x.User.FullName);
            }
            else if (sortBy == "useremail")
            {
                query = isDesc ? query.OrderByDescending(x => x.User.Email) : query.OrderBy(x => x.User.Email);
            }
            else if (sortBy == "menuitemname")
            {
                query = isDesc ? query.OrderByDescending(x => x.MenuItem.Name) : query.OrderBy(x => x.MenuItem.Name);
            }
            else if (sortBy == "totalprice")
            {
                query = isDesc ? query.OrderByDescending(x => x.TotalPrice) : query.OrderBy(x => x.TotalPrice);
            }
            else if (sortBy == "status")
            {
                query = isDesc ? query.OrderByDescending(x => x.Status) : query.OrderBy(x => x.Status);
            }
            else if (sortBy == "createdat")
            {
                query = isDesc ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(x => x.CreatedAt);
            }

            var totalCount = await query.CountAsync();
            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

            var orders = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new AdminOrderResponse
                {
                    OrderId = x.Id,
                    UserId = x.UserId,
                    UserName = x.User.FullName,
                    UserEmail = x.User.Email,
                    MenuItemId = x.MenuItemId,
                    MenuItemName = x.MenuItem.Name,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    TotalPrice = x.TotalPrice,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

            return new PaginationResponse<AdminOrderResponse>
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = orders
            };
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
