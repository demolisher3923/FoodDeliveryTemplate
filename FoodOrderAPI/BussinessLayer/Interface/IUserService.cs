using DataAccessLayer.Dto.User;
using DataAccessLayer.Dto.Common;

namespace BussinessLayer.Interface
{
    public interface IUserService
    {
        Task<UserProfileResponse> GetProfile(Guid userId, CancellationToken cancellationToken = default);
        Task<UserProfileResponse> UpdateProfile(Guid userId, UserProfileUpdateRequest request, CancellationToken cancellationToken = default);
        Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request, CancellationToken cancellationToken = default);
    }
}
