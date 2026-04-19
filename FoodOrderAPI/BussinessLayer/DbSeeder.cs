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
            if(!await context.Users.AnyAsync())
            {
                var hasher = new PasswordHashService();

                context.Users.AddRange(
                    new User
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
                    },
                    new User
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

            if (!await context.MenuItems.AnyAsync())
            {
                context.MenuItems.AddRange(
                    new MenuItem
                    {
                        Name = "Paneer Tikka Wrap",
                        Description = "Grilled paneer wrap with mint mayo and fresh veggies.",
                        Category = "Fast Food",
                        Price = 149,
                        StockQuantity = 40,
                        IsAvailable = true,
                        CreatedBy = "Seed"
                    },
                    new MenuItem
                    {
                        Name = "Veg Hakka Noodles",
                        Description = "Wok tossed noodles with crunchy vegetables and soy glaze.",
                        Category = "Chinese",
                        Price = 179,
                        StockQuantity = 35,
                        IsAvailable = true,
                        CreatedBy = "Seed"
                    },
                    new MenuItem
                    {
                        Name = "Margherita Pizza",
                        Description = "Classic thin crust pizza with tomato basil and mozzarella.",
                        Category = "Pizza",
                        Price = 249,
                        StockQuantity = 25,
                        IsAvailable = true,
                        CreatedBy = "Seed"
                    });
            }

            await context.SaveChangesAsync();
        }
    }
}
