using BussinessLayer.Interface;
using DataAccessLayer.Dto.Common;
using DataAccessLayer.Dto.User;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace FoodOrderAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private static readonly string[] AllowedImageContentTypes = ["image/png", "image/jpeg"];
        private const long MaxProfileImageSizeInBytes = 5 * 1024 * 1024;
        private readonly IUserService _userService;
        private readonly IWebHostEnvironment _environment;

        public UserController(IUserService userService, IWebHostEnvironment environment)
        {
            _userService = userService;
            _environment = environment;
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<PaginationResponse<AdminUserListItemResponse>>> GetUsers([FromQuery] PaginationRequest request, CancellationToken cancellationToken)
        {
            var users = await _userService.GetUsers(request, cancellationToken);
            return Ok(users);
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserProfileResponse>> GetMe(CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var profile = await _userService.GetProfile(userId, cancellationToken);
            return Ok(profile);
        }

        [HttpPut("me")]
        public async Task<ActionResult<UserProfileResponse>> UpdateMe([FromForm] UserProfileUpdateRequest request, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();

            var parsedInterests = ReadInterestsFromForm();
            if (parsedInterests.Count > 0)
            {
                request.Interests = parsedInterests;
            }

            if (request.Interests.Count == 0)
            {
                return BadRequest("At least one interest is required.");
            }

            if (request.ProfileImage is not null)
            {
                if (!AllowedImageContentTypes.Contains(request.ProfileImage.ContentType))
                {
                    return BadRequest("Only .jpg, .jpeg and .png profile images are allowed.");
                }

                if (request.ProfileImage.Length > MaxProfileImageSizeInBytes)
                {
                    return BadRequest("Profile image size must be less than or equal to 5 MB.");
                }

                request.ProfileUrl = await SaveProfileImageAsync(request.ProfileImage, cancellationToken);
            }

            var profile = await _userService.UpdateProfile(userId, request, cancellationToken);
            return Ok(profile);
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Invalid user context.");
            }

            return userId;
        }

        private async Task<string> SaveProfileImageAsync(IFormFile file, CancellationToken cancellationToken)
        {
            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
            {
                webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            var uploadsDirectory = Path.Combine(webRootPath, "uploads", "profiles");
            Directory.CreateDirectory(uploadsDirectory);

            var extension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsDirectory, uniqueFileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream, cancellationToken);

            return $"/uploads/profiles/{uniqueFileName}";
        }

        private List<string> ReadInterestsFromForm()
        {
            return Request.Form
                .Where(x => x.Key.Equals("interests", StringComparison.OrdinalIgnoreCase) || x.Key.StartsWith("interests[", StringComparison.OrdinalIgnoreCase))
                .SelectMany(x => x.Value)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }
}
