using System.ComponentModel.DataAnnotations;

namespace DataAccessLayer.Dto.Menu
{
    public class MenuItemRequest
    {
        [Required]
        public string Name { get; set; }

        [Required]
        public string Description { get; set; }

        [Range(0.01, 100000)]
        public decimal Price { get; set; }

        public bool IsAvailable { get; set; } = true;
        public string? ImageUrl { get; set; }
    }
}
