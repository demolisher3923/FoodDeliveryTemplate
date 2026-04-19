using BussinessLayer.Interface;

namespace BussinessLayer.Services
{
    public class PasswordHashService : IPasswordHashService
    {
        public string Hash(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        public bool Verify(string password, string passwordHash)
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
    }
}
