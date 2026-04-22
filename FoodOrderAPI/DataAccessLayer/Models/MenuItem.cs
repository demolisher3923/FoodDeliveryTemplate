using DataAccessLayer.Common;

namespace DataAccessLayer.Models
{
    public class MenuItem : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public bool IsAvailable { get; set; } = true;
        public string? ImageUrl { get; set; }

        public ICollection<FoodOrder> Orders { get; set; } = [];
        public ICollection<CartItemEntity> CartItems { get; set; } = [];
    }
}
