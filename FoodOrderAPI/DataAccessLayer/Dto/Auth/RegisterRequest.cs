using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace DataAccessLayer.Dto.Auth
{
    public class RegisterRequest
    {
        [Required]
        public string FullName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(8)]
        public string Password { get; set; }

        [Required]
        [Compare(nameof(Password))]
        public string ConfirmPassword { get; set; }

        [Required]
        public string MobileNumber { get; set; }

        [Required]
        public string Address { get; set; }
        public string? ProfileUrl { get; set; }
        public IFormFile? ProfileImage { get; set; }
        public string Gender { get; set; }
        public List<string> Interests { get; set; } = [];
        public string PreferredContactMethod { get; set; }
    }
}
