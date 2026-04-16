namespace DataAccessLayer.Dto.User
{
    public class UserProfileResponse
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string MobileNumber { get; set; }
        public string Address { get; set; }
        public string Gender { get; set; }
        public string PreferredContactMethod { get; set; }
        public string Role { get; set; }
        public string? ProfileUrl { get; set; }
        public List<string> Interests { get; set; } = [];
    }
}
