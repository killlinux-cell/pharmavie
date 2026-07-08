import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class LoyaltyProgramScreen extends StatelessWidget {
  const LoyaltyProgramScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Programme fidélité',
      subtitle: 'Gagnez des points à chaque commande',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.brand600, AppColors.brand700],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              boxShadow: [BoxShadow(color: AppColors.brand600.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('PharmaVie Rewards', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                      child: const Text('Bientôt actif', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('0', style: TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold)),
                const Text('points disponibles', style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 20),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(value: 0, minHeight: 6, backgroundColor: Colors.white.withValues(alpha: 0.24), color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text('500 pts pour le niveau Bronze', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Niveaux', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          _TierCard(name: 'Bronze', points: '0 – 499', benefit: '−2 % sur la livraison', color: AppColors.amber600, active: true),
          _TierCard(name: 'Argent', points: '500 – 1499', benefit: '−5 % + priorité commande', color: AppColors.slate500),
          _TierCard(name: 'Or', points: '1500+', benefit: '−10 % + offres exclusives', color: AppColors.amber600),
          const SizedBox(height: 16),
          const FeatureBanner(
            icon: Icons.card_giftcard_outlined,
            title: 'Lancement prochain',
            message: 'Chaque commande livrée ou retirée vous rapportera des points utilisables chez les pharmacies partenaires.',
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Inscription au programme — disponible très bientôt')),
                );
              },
              child: const Text('Rejoindre la liste d\'attente'),
            ),
          ),
        ],
      ),
    );
  }
}

class _TierCard extends StatelessWidget {
  const _TierCard({required this.name, required this.points, required this.benefit, required this.color, this.active = false});

  final String name;
  final String points;
  final String benefit;
  final Color color;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: active ? color.withValues(alpha: 0.08) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: active ? color.withValues(alpha: 0.4) : AppColors.border),
      ),
      child: Row(
        children: [
          Icon(Icons.workspace_premium, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: TextStyle(fontWeight: FontWeight.w600, color: active ? color : AppColors.slate900)),
                Text('$points pts · $benefit', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
              ],
            ),
          ),
          if (active) Icon(Icons.check_circle, color: color, size: 20),
        ],
      ),
    );
  }
}
