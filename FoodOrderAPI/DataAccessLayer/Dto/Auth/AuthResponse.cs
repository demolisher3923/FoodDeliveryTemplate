namespace DataAccessLayer.Dto.Auth
{
    public class AuthResponse
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public string? ProfileUrl { get; set; }
        public string Token { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}

