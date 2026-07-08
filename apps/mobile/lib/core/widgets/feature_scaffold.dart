import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';

class FeatureScaffold extends StatelessWidget {
  const FeatureScaffold({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.badge = 'Aperçu',
    this.actions,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final String badge;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: actions,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (subtitle != null)
            Container(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              color: AppColors.surfaceMuted,
              child: Row(
                children: [
                  Expanded(
                    child: Text(subtitle!, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.amber50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.amber600.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.amber600),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class FeatureBanner extends StatelessWidget {
  const FeatureBanner({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.color = AppColors.brand600,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: color)),
                const SizedBox(height: 4),
                Text(message, style: const TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
