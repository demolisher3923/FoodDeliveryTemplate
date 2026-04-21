using BussinessLayer.Interface;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.User;
using DataAccessLayer.Interface;

namespace BussinessLayer.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }
        
        public async Task<UserProfileResponse> GetProfile(Guid userId)
        {
            var user = await _userRepository.GetUserById(userId);
            if (user is null)
            {
                throw new KeyNotFoundException("User was not found.");
            }

            return MapProfile(user);
        }

        public async Task<UserProfileResponse> UpdateProfile(Guid userId, UserProfileUpdateRequest request)
        {
            var user = await _userRepository.GetUserById(userId);
            if (user is null)
            {
                throw new KeyNotFoundException("User was not found.");
            }

            user.FullName = request.FullName.Trim();
            user.MobileNumber = request.MobileNumber.Trim();
            user.Address = request.Address.Trim();
            user.Gender = request.Gender.Trim();
            user.PreferredContactMethod = request.PreferredContactMethod.Trim();

            var interests = new List<string>();
            foreach (var interest in request.Interests)
            {
                if (string.IsNullOrWhiteSpace(interest))
                {
                    continue;
                }

                interests.Add(interest.Trim());
            }

            user.Interests = string.Join(',', interests);

            if (!string.IsNullOrWhiteSpace(request.ProfileUrl))
            {
                user.ProfileUrl = request.ProfileUrl;
            }

            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = user.Email;

            await _userRepository.SaveUser(user);

            return MapProfile(user);
        }

        public async Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request)
        {
            return await _userRepository.GetUsers(request);
        }

        private static UserProfileResponse MapProfile(DataAccessLayer.Models.User user)
        {
            var interests = new List<string>();
            if (!string.IsNullOrWhiteSpace(user.Interests))
            {
                var parts = user.Interests.Split(',');
                foreach (var part in parts)
                {
                    var value = part.Trim();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        interests.Add(value);
                    }
                }
            }

            return new UserProfileResponse
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                MobileNumber = user.MobileNumber,
                Address = user.Address,
                Gender = user.Gender,
                PreferredContactMethod = user.PreferredContactMethod,
                ProfileUrl = user.ProfileUrl,
                Role = user.Role,
                Interests = interests
            };
        }
    }
}
