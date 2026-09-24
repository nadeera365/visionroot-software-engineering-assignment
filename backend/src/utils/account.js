export function publicAccount(account) {
  return {
    id: account._id.toString(),
    name: account.name,
    email: account.email,
    role: account.role,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
