namespace WorkEz.Domain.Enums;

public enum ServiceStatus { Open = 0, UnderNegotiation = 1, Accepted = 2, InProgress = 3, Completed = 4, Cancelled = 5, OnTheWay = 6, WaitingPayment = 7 }
public enum ProposalStatus { Pending = 0, Accepted = 1, Rejected = 2, Cancelled = 3, CounterOffered = 4, NegotiationOpen = 5 }
public enum AppointmentStatus { Confirmed = 0, InProgress = 1, Completed = 2, Cancelled = 3 }
public enum UserRole { Customer = 0, ServiceProvider = 1, Admin = 2 }

public enum WalletTransactionType { Credit = 0, PlatformFee = 1, EscrowHold = 2, EscrowRelease = 3, Withdrawal = 4 }
public enum WalletTransactionStatus { Pending = 0, Completed = 1, Failed = 2, Cancelled = 3, Held = 4, Released = 5 }
public enum WithdrawalStatus { Pending = 0, Approved = 1, Transferred = 2, Rejected = 3 }
public enum PixKeyType { CPF = 0, CNPJ = 1, Email = 2, Phone = 3, RandomKey = 4 }
