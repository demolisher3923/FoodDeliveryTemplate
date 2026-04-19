using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace DataAccessLayer.Dto.Menu
{
    public class MenuItemRequest
    {
        [Required]
        public string Name { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        public string Category { get; set; }

        [Range(0.01, 100000)]
        public decimal Price { get; set; }

        [Range(0, 100000)]
        public int StockQuantity { get; set; }

        public bool IsAvailable { get; set; } = true;
        public string? ImageUrl { get; set; }
        public IFormFile? ImageFile { get; set; }
    }
}
