using BussinessLayer.Interface;
using BussinessLayer.Services;
using Microsoft.Extensions.DependencyInjection;

namespace BussinessLayer
{
    public static class DependencyInjection
    {
        public static void AddBussinessServices(this IServiceCollection services)
        {
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ICartService, CartService>();
            services.AddScoped<IMenuService, MenuService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IPasswordHashService, PasswordHashService>();
            services.AddScoped<ITokenGenratorService, JwtTokenGenrator>();
        }
    }
}
