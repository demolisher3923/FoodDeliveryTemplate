using DataAccessLayer.Models;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.User;

namespace DataAccessLayer.Interface
{
    public interface IUserRepository : IRepository<User>
    {
        Task<User?> GetByEmail(string email, CancellationToken cancellationToken = default);
        Task<User?> GetUserById(Guid userId, CancellationToken cancellationToken = default);
        Task SaveUser(User user, CancellationToken cancellationToken = default);
        Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request, CancellationToken cancellationToken = default);
    }
}
