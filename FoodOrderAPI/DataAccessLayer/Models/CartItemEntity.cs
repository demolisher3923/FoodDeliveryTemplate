using DataAccessLayer.Common;

namespace DataAccessLayer.Models
{
    public class CartItemEntity : BaseEntity
    {
        public Guid UserId { get; set; }
        public User User { get; set; }

        public Guid MenuItemId { get; set; }
        public MenuItem MenuItem { get; set; }

        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}