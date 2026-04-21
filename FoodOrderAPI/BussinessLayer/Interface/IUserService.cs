using DataAccessLayer.Dto.User;
using DataAccessLayer.Dto.Common;

namespace BussinessLayer.Interface
{
    public interface IUserService
    {
        Task<UserProfileResponse> GetProfile(Guid userId);
        Task<UserProfileResponse> UpdateProfile(Guid userId, UserProfileUpdateRequest request);
        Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request);
    }
}
