using BussinessLayer.Interface;
using BussinessLayer.Services;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Text;

namespace BussinessLayer
{
    public static class DependencyInjection
    {
        public static void AddBussinessServices(this IServiceCollection services)
        {
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IMenuService, MenuService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IPasswordHashService, PasswordHashService>();
            services.AddScoped<ITokenGenratorService, JwtTokenGenrator>();
            
        }
    }
}
