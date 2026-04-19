using BussinessLayer.Interface;
using DataAccessLayer.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BussinessLayer.Services
{
    public class JwtTokenGenrator : ITokenGenratorService
    {
        private readonly IConfiguration _configuration;
        public JwtTokenGenrator(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        public string GenrateToken(User user, out DateTime expiresAt)
        {
            var key = _configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new InvalidOperationException("JWT key is missing in configuration.");
            }

            var issuer = _configuration["Jwt:Issuer"] ?? string.Empty;
            var audience = _configuration["Jwt:Audience"] ?? string.Empty;

            var expiryMinutes = 120;
            var expiryText = _configuration["Jwt:ExpiryMinutes"];
            if (!string.IsNullOrWhiteSpace(expiryText) && int.TryParse(expiryText, out var parsedMinutes))
            {
                expiryMinutes = parsedMinutes;
            }

            expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

            var claims = new List<Claim>();
            claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()));
            claims.Add(new Claim(ClaimTypes.Name, user.FullName));
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
            claims.Add(new Claim(ClaimTypes.Role, user.Role));

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt,
            signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
