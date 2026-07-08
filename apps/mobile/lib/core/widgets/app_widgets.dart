import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.color, required this.bgColor, this.icon});

  final String label;
  final Color color;
  final Color bgColor;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
          ],
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
    this.onAction,
  });

  final String title;
  final String? subtitle;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                if (subtitle != null)
                  Text(subtitle!, style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
              ],
            ),
          ),
          if (action != null && onAction != null)
            TextButton(onPressed: onAction, child: Text(action!)),
        ],
      ),
    );
  }
}

class ComingSoonCard extends StatelessWidget {
  const ComingSoonCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.onTap,
    this.previewAvailable = true,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback? onTap;
  final bool previewAvailable;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: previewAvailable ? AppColors.brand50 : AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: previewAvailable ? AppColors.brand600 : AppColors.slate400),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: previewAvailable ? AppColors.brand50 : AppColors.amber50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            previewAvailable ? 'Aperçu' : 'Bientôt',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: previewAvailable ? AppColors.brand700 : AppColors.amber600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(description, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ],
                ),
              ),
              Icon(
                previewAvailable ? Icons.chevron_right : Icons.lock_outline,
                size: 20,
                color: AppColors.slate400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PharmaLogo extends StatelessWidget {
  const PharmaLogo({super.key, this.size = 44});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.brand500, AppColors.brand700],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: [
          BoxShadow(
            color: AppColors.brand600.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        'P',
        style: TextStyle(color: Colors.white, fontSize: size * 0.45, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class OrderTimeline extends StatelessWidget {
  const OrderTimeline({super.key, required this.currentStatus});

  final String currentStatus;

  @override
  Widget build(BuildContext context) {
    final current = OrderStatusUtil.get(currentStatus);
    if (current.step < 0) {
      return StatusBadge(label: current.label, color: current.color, bgColor: current.bgColor, icon: current.icon);
    }

    final steps = OrderStatusUtil.timelineSteps;
    return Column(
      children: List.generate(steps.length, (i) {
        final info = OrderStatusUtil.get(steps[i]);
        final isDone = i <= current.step;
        final isActive = i == current.step;
        final isLast = i == steps.length - 1;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isDone ? AppColors.brand600 : AppColors.surfaceMuted,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isActive ? AppColors.brand600 : AppColors.border,
                      width: isActive ? 2 : 1,
                    ),
                  ),
                  child: Icon(
                    isDone ? Icons.check : info.icon,
                    size: 14,
                    color: isDone ? Colors.white : AppColors.slate400,
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 24,
                    color: isDone && i < current.step ? AppColors.brand600 : AppColors.border,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                child: Text(
                  info.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                    color: isDone ? AppColors.slate900 : AppColors.slate400,
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
