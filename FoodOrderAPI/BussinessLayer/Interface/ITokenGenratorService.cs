using DataAccessLayer.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace BussinessLayer.Interface
{
    public interface ITokenGenratorService
    {
        string GenrateToken(User user, out DateTime expiresAt);
    }
}
