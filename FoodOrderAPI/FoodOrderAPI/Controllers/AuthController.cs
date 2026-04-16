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
        private static readonly string[] AllowedImageContentTypes = ["image/png", "image/jpeg"];
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
