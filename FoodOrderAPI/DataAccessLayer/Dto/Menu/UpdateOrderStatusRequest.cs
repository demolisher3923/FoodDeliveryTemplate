using System.ComponentModel.DataAnnotations;

namespace DataAccessLayer.Dto.Menu
{
    public class UpdateOrderStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }
}