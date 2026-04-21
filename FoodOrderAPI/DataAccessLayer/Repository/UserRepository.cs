using DataAccessLayer.Data;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.User;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessLayer.Repository
{
    public class UserRepository : Repository<User>, IUserRepository
    {
        public UserRepository(FoodDbContext dbContext) : base(dbContext)
        {
        }

        public Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default)
        {
            return _dbSet.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        }

        public Task<User?> GetUserById(Guid userId, CancellationToken cancellationToken = default)
        {
            return _dbSet.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        }

        public async Task SaveUser(User user, CancellationToken cancellationToken = default)
        {
            _dbSet.Update(user);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request, CancellationToken cancellationToken = default)
        {
            var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
            var pageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
            var search = request.Search?.Trim().ToLowerInvariant();
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isDesc = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

            var query = _dbSet.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u =>
                    u.FullName.ToLower().Contains(search) ||
                    u.Email.ToLower().Contains(search) ||
                    u.MobileNumber.ToLower().Contains(search));
            }

            if (sortBy == "fullname")
            {
                query = isDesc ? query.OrderByDescending(x => x.FullName) : query.OrderBy(x => x.FullName);
            }
            else if (sortBy == "email")
            {
                query = isDesc ? query.OrderByDescending(x => x.Email) : query.OrderBy(x => x.Email);
            }
            else if (sortBy == "role")
            {
                query = isDesc ? query.OrderByDescending(x => x.Role) : query.OrderBy(x => x.Role);
            }
            else if (sortBy == "createdat")
            {
                query = isDesc ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(x => x.CreatedAt);
            }

            var totalCount = await query.CountAsync(cancellationToken);
            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

            var users = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new AdminUserListItemResponse
                {
                    UserId = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    MobileNumber = u.MobileNumber,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    ProfileUrl = u.ProfileUrl
                })
                .ToListAsync(cancellationToken);

            return new PaginationResponse<AdminUserListItemResponse>
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = users
            };
        }

    }
}
