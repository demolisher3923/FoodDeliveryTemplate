using System;
using System.Collections.Generic;
using System.Text;

namespace BussinessLayer.Interface
{
    public interface IPasswordHashService
    {
        string Hash(string password);
        bool Verify(string password, string passwordHash);
    }
}
