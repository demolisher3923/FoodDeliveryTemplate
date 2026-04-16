namespace DataAccessLayer.Dto.Menu
{
    public class OrderResponse
    {
        public Guid OrderId { get; set; }
        public Guid MenuItemId { get; set; }
        public string MenuItemName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
