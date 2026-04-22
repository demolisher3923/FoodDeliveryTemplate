using BussinessLayer.Interface;
using DataAccessLayer.Dto.Menu;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FoodOrderAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "User")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<CartItemResponse>>> GetMyCart()
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            var cartItems = await _cartService.GetMyCart(userId);
            return Ok(cartItems);
        }

        [HttpPut("items/{menuItemId:guid}")]
        public async Task<ActionResult<IReadOnlyList<CartItemResponse>>> UpsertCartItem(Guid menuItemId, [FromBody] UpsertCartItemRequest request)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            try
            {
                var cartItems = await _cartService.UpsertCartItem(userId, menuItemId, request);
                return Ok(cartItems);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("items/{menuItemId:guid}")]
        public async Task<ActionResult<IReadOnlyList<CartItemResponse>>> RemoveCartItem(Guid menuItemId)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            var cartItems = await _cartService.RemoveCartItem(userId, menuItemId);
            return Ok(cartItems);
        }
    }
}
