using BussinessLayer.Interface;
using DataAccessLayer.Dto.Auth;
using DataAccessLayer.Interface;
using DataAccessLayer.Models;

namespace BussinessLayer.Services
{
    public class AuthService:IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHashService _passwordHashService;
        private readonly ITokenGenratorService _tokenGenratorService;

        public AuthService(IUserRepository userRepository,IPasswordHashService passwordHashService, ITokenGenratorService tokenGenratorService)
        {
            _userRepository = userRepository;
            _passwordHashService = passwordHashService;
            _tokenGenratorService = tokenGenratorService;
        }

        public async Task<AuthResponse> Register(RegisterRequest request, CancellationToken cancellationToken = default)
        {
            var existingUser = await _userRepository.GetByEmail(request.Email.Trim().ToLowerInvariant(), cancellationToken);
            if(existingUser is not null)
            {
                throw new InvalidOperationException("Email already exists.");
            }

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email.Trim().ToLowerInvariant(),
                Password = _passwordHashService.Hash(request.Password),
                MobileNumber = request.MobileNumber,
                Address = request.Address,
                ProfileUrl = request.ProfileUrl,
                Gender = request.Gender,
                Interests = string.Join(',', request.Interests),
                PreferredContactMethod = request.PreferredContactMethod,
                Role = "User",
                CreatedBy = request.Email
            };

            await _userRepository.Add(user);
            await _userRepository.SaveChanges();

            var token = _tokenGenratorService.GenrateToken(user, out var expiresAt);

            return new AuthResponse
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                ProfileUrl = user.ProfileUrl,
                Token = token,
                ExpiresAt = expiresAt
            };
        }

        public async Task<AuthResponse> Login(LoginRequest request, CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetByEmail(request.Email.Trim().ToLowerInvariant(), cancellationToken);
            if (user is null)
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            var isValidPassword = _passwordHashService.Verify(request.Password, user.Password);

            if(!isValidPassword)
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            var token = _tokenGenratorService.GenrateToken(user, out var expiresAt);

            return new AuthResponse
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                ProfileUrl = user.ProfileUrl,
                Token = token,
                ExpiresAt = expiresAt
            };
        }
    }
}
