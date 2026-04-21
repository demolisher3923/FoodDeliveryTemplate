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
        private static readonly string[] AllowedImageContentTypes = new[] { "image/png", "image/jpeg" };
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
        public async Task<ActionResult<PaginationResponse<AdminUserListItemResponse>>> GetUsers([FromQuery] PaginationRequest request)
        {
            var users = await _userService.GetUsers(request);
            return Ok(users);
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserProfileResponse>> GetMe()
        {
            var userId = GetCurrentUserId();
            var profile = await _userService.GetProfile(userId);
            return Ok(profile);
        }

        [HttpPut("me")]
        public async Task<ActionResult<UserProfileResponse>> UpdateMe([FromForm] UserProfileUpdateRequest request)
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
                var isAllowedImage = false;
                foreach (var contentType in AllowedImageContentTypes)
                {
                    if (string.Equals(contentType, request.ProfileImage.ContentType, StringComparison.OrdinalIgnoreCase))
                    {
                        isAllowedImage = true;
                        break;
                    }
                }

                if (!isAllowedImage)
                {
                    return BadRequest("Only .jpg, .jpeg and .png profile images are allowed.");
                }

                if (request.ProfileImage.Length > MaxProfileImageSizeInBytes)
                {
                    return BadRequest("Profile image size must be less than or equal to 5 MB.");
                }

                request.ProfileUrl = await SaveProfileImageAsync(request.ProfileImage);
            }

            var profile = await _userService.UpdateProfile(userId, request);
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

        private async Task<string> SaveProfileImageAsync(IFormFile file)
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
            await file.CopyToAsync(stream);

            return $"/uploads/profiles/{uniqueFileName}";
        }

        private List<string> ReadInterestsFromForm()
        {
            var parsedInterests = new List<string>();
            foreach (var formItem in Request.Form)
            {
                var key = formItem.Key;
                var isInterestsField = key.Equals("interests", StringComparison.OrdinalIgnoreCase)
                    || key.StartsWith("interests[", StringComparison.OrdinalIgnoreCase);

                if (!isInterestsField)
                {
                    continue;
                }

                foreach (var value in formItem.Value)
                {
                    if (string.IsNullOrWhiteSpace(value))
                    {
                        continue;
                    }

                    var cleanValue = value.Trim();
                    if (!parsedInterests.Contains(cleanValue, StringComparer.OrdinalIgnoreCase))
                    {
                        parsedInterests.Add(cleanValue);
                    }
                }
            }

            return parsedInterests;
        }
    }
}
