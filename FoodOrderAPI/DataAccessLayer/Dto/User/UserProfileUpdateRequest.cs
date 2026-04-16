using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace DataAccessLayer.Dto.User
{
    public class UserProfileUpdateRequest
    {
        [Required]
        public string FullName { get; set; }

        [Required]
        [RegularExpression("^\\d{10}$")]
        public string MobileNumber { get; set; }

        [Required]
        [MinLength(8)]
        public string Address { get; set; }

        [Required]
        public string Gender { get; set; }

        [Required]
        public string PreferredContactMethod { get; set; }

        [Required]
        public List<string> Interests { get; set; } = [];

        public string? ProfileUrl { get; set; }
        public IFormFile? ProfileImage { get; set; }
    }
}
