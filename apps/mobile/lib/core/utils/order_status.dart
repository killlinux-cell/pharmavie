import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';

class OrderStatusInfo {
  const OrderStatusInfo({
    required this.label,
    required this.color,
    required this.bgColor,
    required this.icon,
    required this.step,
  });

  final String label;
  final Color color;
  final Color bgColor;
  final IconData icon;
  final int step;
}

class OrderStatusUtil {
  static const _map = {
    'NEW': OrderStatusInfo(
      label: 'Nouvelle',
      color: AppColors.blue600,
      bgColor: AppColors.blue50,
      icon: Icons.fiber_new_rounded,
      step: 0,
    ),
    'CONFIRMED': OrderStatusInfo(
      label: 'Confirmée',
      color: AppColors.brand700,
      bgColor: AppColors.brand50,
      icon: Icons.check_circle_outline,
      step: 1,
    ),
    'PREPARING': OrderStatusInfo(
      label: 'En préparation',
      color: AppColors.amber600,
      bgColor: AppColors.amber50,
      icon: Icons.inventory_2_outlined,
      step: 2,
    ),
    'READY': OrderStatusInfo(
      label: 'Prête',
      color: AppColors.purple600,
      bgColor: AppColors.purple50,
      icon: Icons.done_all_rounded,
      step: 3,
    ),
    'DELIVERING': OrderStatusInfo(
      label: 'En livraison',
      color: AppColors.blue600,
      bgColor: AppColors.blue50,
      icon: Icons.delivery_dining,
      step: 4,
    ),
    'DELIVERED': OrderStatusInfo(
      label: 'Livrée',
      color: AppColors.brand700,
      bgColor: AppColors.brand50,
      icon: Icons.check_circle,
      step: 5,
    ),
    'CANCELLED': OrderStatusInfo(
      label: 'Annulée',
      color: AppColors.red600,
      bgColor: AppColors.red50,
      icon: Icons.cancel_outlined,
      step: -1,
    ),
    'REJECTED': OrderStatusInfo(
      label: 'Refusée',
      color: AppColors.red600,
      bgColor: AppColors.red50,
      icon: Icons.block,
      step: -1,
    ),
  };

  static OrderStatusInfo get(String status) {
    return _map[status] ??
        OrderStatusInfo(
          label: status,
          color: AppColors.slate600,
          bgColor: AppColors.surfaceMuted,
          icon: Icons.info_outline,
          step: 0,
        );
  }

  static List<String> get timelineSteps => [
        'NEW',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'DELIVERING',
        'DELIVERED',
      ];
}

String formatFcfa(int amount) {
  return '${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} FCFA';
}

String formatDate(String iso) {
  try {
    final d = DateTime.parse(iso);
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} · ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  } catch (_) {
    return iso;
  }
}
