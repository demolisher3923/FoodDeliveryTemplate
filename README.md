
using BussinessLayer;
using DataAccessLayer;
using DataAccessLayer.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace FoodOrderAPI
{
   public class Program
   {
       public static async Task Main(string[] args)
       {
           var builder = WebApplication.CreateBuilder(args);

           // Add services to the container.

           builder.Services.AddControllers();
           
           builder.Services.AddOpenApi();
           builder.Services.AddBussinessServices();
           builder.Services.AddDataAccessServices();

           builder.Services.AddDbContext<FoodDbContext>(options =>
           {
               options.UseSqlServer(
                   builder.Configuration.GetConnectionString("DbConnection"),
                   sqlOptions => sqlOptions.EnableRetryOnFailure());
           });

           builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
           {
               var key = builder.Configuration["Jwt:Key"] ?? throw new Exception("Jwt key is missing");
               options.TokenValidationParameters = new TokenValidationParameters
               {
                   ValidateIssuer = true,
                   ValidateAudience = true,
                   ValidateLifetime = true,
                   ValidateIssuerSigningKey = true,
                   ValidIssuer = builder.Configuration["Jwt:Issuer"],
                   ValidAudience = builder.Configuration["Jwt:Audience"],
                   IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
               };
           });

           builder.Services.AddAuthorization();
           builder.Services.AddCors(options =>
           {
               options.AddPolicy("Angular", policy =>
               {
                   policy.WithOrigins("http://localhost:4200").AllowAnyMethod().AllowAnyHeader();
               });
           });

           var app = builder.Build();

           // Configure the HTTP request pipeline.
           if (app.Environment.IsDevelopment())
           {
               app.MapOpenApi();
               app.UseSwaggerUI(options =>
               {
                   options.SwaggerEndpoint("/openApi/v1.json", "API v1");
               });
           }

           app.UseHttpsRedirection();
           app.UseCors("Angular");
           app.UseAuthentication();
           app.UseAuthorization();

           app.MapControllers();

           using (var scope = app.Services.CreateScope())
           {
               var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
               var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();
               try
               {
                   await DbSeeder.Seed(dbContext);
                   logger.LogInformation("Database migration and seeding completed.");
               }
               catch (Exception ex)
               {
                   logger.LogError(ex, "Database migration/seeding failed. Check the DbConnection string and SQL Server availability.");
               }
           }
           app.Run();
       }
   }
}

using BussinessLayer.Services;
using DataAccessLayer.Data;
using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;

namespace BussinessLayer
{
   public static class DbSeeder
   {
       public static async Task Seed(FoodDbContext context)
       {
           await context.Database.MigrateAsync();
           var hasher = new PasswordHashService();

           if (!await context.Users.AnyAsync(u => u.Email == "admin@email.com"))
           {
               context.Users.Add(new User
               {
                   FullName = "System Admin",
                   Email = "admin@email.com",
                   Password = hasher.Hash("Admin@1234"),
                   Gender = "Male",
                   MobileNumber = "1234567890",
                   Address = "ahmedabad",
                   Interests = "Reading",
                   Role = "Admin",
                   PreferredContactMethod = "Email",
                   CreatedBy = "Seed"
               });
           }

           if (!await context.Users.AnyAsync(u => u.Email == "user@email.com"))
           {
               context.Users.Add(new User
               {
                   FullName = "Default User",
                   Email = "user@email.com",
                   Password = hasher.Hash("User@1234"),
                   Gender = "Male",
                   MobileNumber = "0123456789",
                   Address = "Baroda",
                   Interests = "Music",
                   Role = "User",
                   PreferredContactMethod = "Email",
                   CreatedBy = "Seed"
               });
           }

           if (context.ChangeTracker.HasChanges())
           {
               await context.SaveChangesAsync();
           }
       }
   }
}

