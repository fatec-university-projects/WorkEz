using WorkEz.Domain.Entities;

namespace WorkEz.Domain.Interfaces;

public interface IAppointmentRepository : IBaseRepository<Appointment>
{
    Task<Appointment?> GetByServiceIdAsync(Guid serviceId);
}
