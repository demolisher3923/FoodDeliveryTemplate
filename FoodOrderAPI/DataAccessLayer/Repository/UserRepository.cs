using DataAccessLayer.Data;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessLayer.Repository
{
    public class UserRepository :Repository<User>, IUserRepository
    {
        public UserRepository(FoodDbContext dbContext) : base(dbContext)
        {
        }
        public Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default) => _dbSet.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

    }
}
