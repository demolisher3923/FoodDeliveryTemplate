using BussinessLayer.Interface;
using DataAccessLayer.Dto.Common;
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
        private static readonly string[] AllowedImageContentTypes = new[] { "image/png", "image/jpeg" };
        private const long MaxProductImageSizeInBytes = 5 * 1024 * 1024;
        private readonly IMenuService _menuService;
        private readonly IWebHostEnvironment _environment;

        public MenuController(IMenuService menuService, IWebHostEnvironment environment)
        {
            _menuService = menuService;
            _environment = environment;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<MenuItemResponse>>> GetMenu()
        {
            var menu = await _menuService.GetMenu();
            return Ok(menu);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<MenuItemResponse>> CreateMenuItem([FromForm] MenuItemRequest request)
        {
            if (request.ImageFile is not null)
            {
                var imageValidationError = ValidateImage(request.ImageFile);
                if (imageValidationError is not null)
                {
                    return BadRequest(imageValidationError);
                }

                request.ImageUrl = await SaveProductImage(request.ImageFile);
            }

            var createdBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
            var created = await _menuService.CreateMenuItem(request, createdBy);
            return Ok(created);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<MenuItemResponse>> UpdateMenuItem(Guid id, [FromForm] MenuItemRequest request)
        {
            try
            {
                if (request.ImageFile is not null)
                {
                    var imageValidationError = ValidateImage(request.ImageFile);
                    if (imageValidationError is not null)
                    {
                        return BadRequest(imageValidationError);
                    }

                    request.ImageUrl = await SaveProductImage(request.ImageFile);
                }

                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
                var updated = await _menuService.UpdateMenuItem(id, request, updatedBy);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> DeleteMenuItem(Guid id)
        {
            try
            {
                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
            await _menuService.DeleteMenuItem(id, updatedBy);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [Authorize(Roles = "User")]
        [HttpPost("{menuItemId:guid}/order")]
        public async Task<ActionResult<OrderResponse>> PlaceOrder(Guid menuItemId, [FromBody] PlaceOrderRequest request)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            try
            {
                var response = await _menuService.PlaceOrder(menuItemId, userId, request);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize(Roles = "User")]
        [HttpGet("my-orders")]
        public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetMyOrders()
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized("Invalid user context.");
            }

            var orders = await _menuService.GetMyOrders(userId);
            return Ok(orders);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin-orders")]
        public async Task<ActionResult<IReadOnlyList<AdminOrderResponse>>> GetAdminOrders()
        {
            var orders = await _menuService.GetAllOrders();
            return Ok(orders);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin-orders/paged")]
        public async Task<ActionResult<PaginationResponse<AdminOrderResponse>>> GetPagedAdminOrders([FromQuery] PaginationRequest request)
        {
            var orders = await _menuService.GetPagedOrders(request);
            return Ok(orders);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("admin-orders/{orderId:guid}/status")]
        public async Task<ActionResult<AdminOrderResponse>> UpdateOrderStatus(Guid orderId, [FromBody] UpdateOrderStatusRequest request)
        {
            try
            {
                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
            var order = await _menuService.UpdateOrderStatus(orderId, request.Status, updatedBy);
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

        private string? ValidateImage(IFormFile file)
        {
            if (!AllowedImageContentTypes.Contains(file.ContentType))
            {
                return "Only .jpg, .jpeg and .png product images are allowed.";
            }

            if (file.Length > MaxProductImageSizeInBytes)
            {
                return "Product image size must be less than or equal to 5 MB.";
            }

            return null;
        }

        private async Task<string> SaveProductImage(IFormFile file)
        {
            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
            {
                webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            var uploadsDirectory = Path.Combine(webRootPath, "uploads", "menu");
            Directory.CreateDirectory(uploadsDirectory);

            var extension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsDirectory, uniqueFileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return $"/uploads/menu/{uniqueFileName}";
        }
    }
}
