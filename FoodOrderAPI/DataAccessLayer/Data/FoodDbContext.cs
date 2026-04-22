using DataAccessLayer.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace DataAccessLayer.Data
{
    public class FoodDbContext: DbContext
    {
        public FoodDbContext(DbContextOptions<FoodDbContext> options): base(options)
        {
        }
        public DbSet<User> Users { get; set; }
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<FoodOrder> Orders { get; set; }
        public DbSet<CartItemEntity> CartItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<MenuItem>()
                .Property(x => x.Price)
                .HasPrecision(10, 2);

            modelBuilder.Entity<FoodOrder>()
                .Property(x => x.UnitPrice)
                .HasPrecision(10, 2);

            modelBuilder.Entity<FoodOrder>()
                .Property(x => x.TotalPrice)
                .HasPrecision(10, 2);

            modelBuilder.Entity<CartItemEntity>()
                .Property(x => x.UnitPrice)
                .HasPrecision(10, 2);

            modelBuilder.Entity<FoodOrder>()
                .HasOne(x => x.User)
                .WithMany(x => x.Orders)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FoodOrder>()
                .HasOne(x => x.MenuItem)
                .WithMany(x => x.Orders)
                .HasForeignKey(x => x.MenuItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CartItemEntity>()
                .HasOne(x => x.User)
                .WithMany(x => x.CartItems)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CartItemEntity>()
                .HasOne(x => x.MenuItem)
                .WithMany(x => x.CartItems)
                .HasForeignKey(x => x.MenuItemId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
