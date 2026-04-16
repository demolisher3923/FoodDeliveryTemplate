using DataAccessLayer.Common;

namespace DataAccessLayer.Models
{
    public class User : BaseEntity
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string Gender { get; set; }
        public string MobileNumber { get; set; }
        public string Address { get; set; }
        public string? ProfileUrl { get; set; }
        public string Interests { get; set; }
        public string Role { get; set; } = "User";
        public string PreferredContactMethod { get; set; }
        public ICollection<FoodOrder> Orders { get; set; } = [];
        
    }
}
