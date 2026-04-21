using BussinessLayer.Interface;
using DataAccessLayer.Dto.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;

namespace FoodOrderAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private static readonly string[] AllowedImageContentTypes = new[] { "image/png", "image/jpeg" };
        private const long MaxProfileImageSizeInBytes = 5 * 1024 * 1024;
        private readonly Regex PasswordRegex = new(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$", RegexOptions.Compiled);
        private readonly IAuthService _authService;
        private readonly IWebHostEnvironment _environment;

        public AuthController(IAuthService authService, IWebHostEnvironment environment)
        {
            _authService = authService;
            _environment = environment;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register([FromForm] RegisterRequest request, CancellationToken cancellationToken)
        {
            var parsedInterests = ReadInterestsFromForm();
            if (parsedInterests.Count > 0)
            {
                request.Interests = parsedInterests;
            }

            if (request.Interests.Count == 0)
            {
                return BadRequest("At least one interest is required.");
            }

            if (!PasswordRegex.IsMatch(request.Password))
            {
                return BadRequest("Password must contain atleast 8 characters and include uppercase, lowercase, number and a special character");
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

                request.ProfileUrl = await SaveProfileImage(request.ProfileImage, cancellationToken);
            }

            try
            {
                var response = await _authService.Register(request, cancellationToken);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var response = await _authService.Login(request, cancellationToken);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        private async Task<string> SaveProfileImage(IFormFile file, CancellationToken cancellationToken)
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
