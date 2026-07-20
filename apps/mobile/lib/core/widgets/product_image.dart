import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/config/app_config.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';

class ProductImage extends StatelessWidget {
  const ProductImage({
    super.key,
    this.imageUrl,
    this.size = 52,
    this.borderRadius = 14,
  });

  final String? imageUrl;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final url = _resolveUrl(imageUrl);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.brand50,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      clipBehavior: Clip.antiAlias,
      child: url != null
          ? Image.network(
              url,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _fallback(),
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return const Center(
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                );
              },
            )
          : _fallback(),
    );
  }

  String? _resolveUrl(String? path) {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http')) return path;
    return mediaUrl(path);
  }

  Widget _fallback() {
    return Icon(
      Icons.medication_liquid,
      color: AppColors.brand600,
      size: size * 0.45,
    );
  }
}
