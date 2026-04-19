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
        public async Task<ActionResult<IReadOnlyList<MenuItemResponse>>> GetMenu(CancellationToken cancellationToken)
        {
            var menu = await _menuService.GetMenu(cancellationToken);
            return Ok(menu);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<MenuItemResponse>> CreateMenuItem([FromForm] MenuItemRequest request, CancellationToken cancellationToken)
        {
            if (request.ImageFile is not null)
            {
                var imageValidationError = ValidateImage(request.ImageFile);
                if (imageValidationError is not null)
                {
                    return BadRequest(imageValidationError);
                }

                request.ImageUrl = await SaveProductImageAsync(request.ImageFile, cancellationToken);
            }

            var createdBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
            var created = await _menuService.CreateMenuItem(request, createdBy, cancellationToken);
            return Ok(created);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<MenuItemResponse>> UpdateMenuItem(Guid id, [FromForm] MenuItemRequest request, CancellationToken cancellationToken)
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

                    request.ImageUrl = await SaveProductImageAsync(request.ImageFile, cancellationToken);
                }

                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
                var updated = await _menuService.UpdateMenuItem(id, request, updatedBy, cancellationToken);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> DeleteMenuItem(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var updatedBy = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
                await _menuService.DeleteMenuItem(id, updatedBy, cancellationToken);
                return NoContent();
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

        private async Task<string> SaveProductImageAsync(IFormFile file, CancellationToken cancellationToken)
        {
            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
            {
                webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            var uploadsDirectory = Path.Combine(webRootPath, "uploads", "products");
            Directory.CreateDirectory(uploadsDirectory);

            var extension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsDirectory, uniqueFileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream, cancellationToken);

            return $"/uploads/products/{uniqueFileName}";
        }
    }
}
