using DataAccessLayer.Models;

namespace DataAccessLayer.Interface
{
    public interface IUserRepository : IRepository<User>
    {
        Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default);
    }
}
