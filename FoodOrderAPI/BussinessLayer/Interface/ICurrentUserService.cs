namespace BussinessLayer.Interface
{
    public interface ICurrentUserService
    {
        public string? Email { get; }
        public Guid? UserId { get; }
    }
}
