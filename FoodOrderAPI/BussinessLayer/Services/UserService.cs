using BussinessLayer.Interface;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.User;
using DataAccessLayer.Interface;
using Microsoft.EntityFrameworkCore;

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
            var user = await _userRepository.GetById(userId);
            if (user is null)
            {
                throw new KeyNotFoundException("User was not found.");
            }

            return MapProfile(user);
        }

        public async Task<UserProfileResponse> UpdateProfile(Guid userId, UserProfileUpdateRequest request)
        {
            var user = await _userRepository.GetById(userId);
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

            _userRepository.Update(user);
            await _userRepository.SaveChanges();

            return MapProfile(user);
        }

        public async Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request)
        {
            var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
            var pageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
            var search = request.Search?.Trim().ToLowerInvariant();
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isDesc = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

            var query = _userRepository.Query().AsNoTracking();

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

            var totalCount = await query.CountAsync();
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
                .ToListAsync();

            return new PaginationResponse<AdminUserListItemResponse>
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = users
            };
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
