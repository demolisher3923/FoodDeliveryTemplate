using BussinessLayer.Interface;
using DataAccessLayer.Dto.Menu;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FoodOrderAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public MenuController(IMenuService menuService)
        {
            _menuService = menuService;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<MenuItemResponse>>> GetMenu(CancellationToken cancellationToken)
        {
            var menu = await _menuService.GetMenu(cancellationToken);
            return Ok(menu);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<MenuItemResponse>> CreateMenuItem([FromBody] MenuItemRequest request, CancellationToken cancellationToken)
        {
            var createdBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
            var created = await _menuService.CreateMenuItem(request, createdBy, cancellationToken);
            return Ok(created);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<MenuItemResponse>> UpdateMenuItem(Guid id, [FromBody] MenuItemRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
                var updated = await _menuService.UpdateMenuItem(id, request, updatedBy, cancellationToken);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [Authorize(Roles = "User")]
        [HttpPost("{menuItemId:guid}/order")]
        public async Task<ActionResult<OrderResponse>> PlaceOrder(Guid menuItemId, [FromBody] PlaceOrderRequest request, CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            try
            {
                var response = await _menuService.PlaceOrder(menuItemId, userId, request, cancellationToken);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize(Roles = "User")]
        [HttpGet("my-orders")]
        public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetMyOrders(CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            var orders = await _menuService.GetMyOrders(userId, cancellationToken);
            return Ok(orders);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin-orders")]
        public async Task<ActionResult<IReadOnlyList<AdminOrderResponse>>> GetAdminOrders(CancellationToken cancellationToken)
        {
            var orders = await _menuService.GetAllOrders(cancellationToken);
            return Ok(orders);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("admin-orders/{orderId:guid}/status")]
        public async Task<ActionResult<AdminOrderResponse>> UpdateOrderStatus(Guid orderId, [FromBody] UpdateOrderStatusRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
                var order = await _menuService.UpdateOrderStatus(orderId, request.Status, updatedBy, cancellationToken);
                return Ok(order);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
