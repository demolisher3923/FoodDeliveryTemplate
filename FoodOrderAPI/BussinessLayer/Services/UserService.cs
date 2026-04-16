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

        public async Task<UserProfileResponse> GetProfile(Guid userId, CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetById(userId);
            if (user is null)
            {
                throw new KeyNotFoundException("User was not found.");
            }

            return MapProfile(user);
        }

        public async Task<UserProfileResponse> UpdateProfile(Guid userId, UserProfileUpdateRequest request, CancellationToken cancellationToken = default)
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
            user.Interests = string.Join(',', request.Interests.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()));

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

        public async Task<PaginationResponse<AdminUserListItemResponse>> GetUsers(PaginationRequest request, CancellationToken cancellationToken = default)
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

            query = (sortBy, isDesc) switch
            {
                ("fullname", true) => query.OrderByDescending(x => x.FullName),
                ("fullname", false) => query.OrderBy(x => x.FullName),
                ("email", true) => query.OrderByDescending(x => x.Email),
                ("email", false) => query.OrderBy(x => x.Email),
                ("role", true) => query.OrderByDescending(x => x.Role),
                ("role", false) => query.OrderBy(x => x.Role),
                ("createdat", true) => query.OrderByDescending(x => x.CreatedAt),
                ("createdat", false) => query.OrderBy(x => x.CreatedAt),
                _ => query.OrderByDescending(x => x.CreatedAt)
            };

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

        private static UserProfileResponse MapProfile(DataAccessLayer.Models.User user)
        {
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
                Interests = user.Interests.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            };
        }
    }
}
