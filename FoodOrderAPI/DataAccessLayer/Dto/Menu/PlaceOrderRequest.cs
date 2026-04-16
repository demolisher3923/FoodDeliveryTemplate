using System.ComponentModel.DataAnnotations;

namespace DataAccessLayer.Dto.Menu
{
    public class PlaceOrderRequest
    {
        [Range(1, 100)]
        public int Quantity { get; set; } = 1;
    }
}
