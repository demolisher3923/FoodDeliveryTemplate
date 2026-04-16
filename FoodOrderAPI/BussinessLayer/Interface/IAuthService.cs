using DataAccessLayer.Dto.Auth;

namespace BussinessLayer.Interface
{
    public interface IAuthService
    {
        Task<AuthResponse> Register(RegisterRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponse> Login(LoginRequest request, CancellationToken cancellationToken = default);
    }
}
