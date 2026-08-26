namespace WorkEz.Domain.Enums;

public enum ServiceStatus { Open = 0, UnderNegotiation = 1, Accepted = 2, InProgress = 3, Completed = 4, Cancelled = 5, OnTheWay = 6, WaitingPayment = 7 }
public enum ProposalStatus { Pending = 0, Accepted = 1, Rejected = 2, Cancelled = 3 }
public enum AppointmentStatus { Confirmed = 0, InProgress = 1, Completed = 2, Cancelled = 3 }
public enum UserRole { Customer = 0, ServiceProvider = 1, Admin = 2 }
