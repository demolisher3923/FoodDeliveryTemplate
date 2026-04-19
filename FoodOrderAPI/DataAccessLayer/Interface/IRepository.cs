using DataAccessLayer.Common;

namespace DataAccessLayer.Interface
{
    public interface IRepository<T> where T: BaseEntity
    {
        Task<T?> GetById(Guid id);
        Task Add(T entity);
        void Update(T entity);
        void Delete(T entity);
        IQueryable<T> Query();
        Task<int> SaveChanges();
    }
}
