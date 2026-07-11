String normalizeCiPhone(String phone) {
  final digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('225')) {
    final local = digits.substring(3);
    if (local.length == 10) return '+225$local';
    if (local.length == 9 && !local.startsWith('0')) return '+2250$local';
    if (local.length == 8) return '+225$local';
    return '+225$local';
  }
  if (digits.length == 10) return '+225$digits';
  if (digits.length == 9 && digits.startsWith('0')) return '+225$digits';
  if (digits.length == 9) return '+2250$digits';
  if (digits.length == 8) return '+225$digits';
  return phone.trim();
}
