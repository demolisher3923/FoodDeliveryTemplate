namespace DataAccessLayer.Dto.User
{
    public class AdminUserListItemResponse
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string MobileNumber { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ProfileUrl { get; set; }
    }
}
